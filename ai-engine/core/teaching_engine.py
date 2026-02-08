"""
Classroom Intelligence Engine - The Brain
Makes ALL teaching decisions deterministically
LLM only generates speech text, never decides what to do
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, TYPE_CHECKING
from openai import AsyncOpenAI

from .teaching_models import (
    TeachingPhase, TeachingLoopState, TeachingAction,
    StudentProfile, VoiceTutorSession
)
from .voice_events import (
    ClassroomEvent, StudentSpokeEvent, SilenceEvent,
    InterruptionEvent, ParticipantJoinEvent, ParticipantLeaveEvent
)
from .curriculum import CurriculumManager, LessonPlan
from .llm import get_async_openai_client

if TYPE_CHECKING:
    from .rag_retriever import RAGRetriever

logger = logging.getLogger(__name__)


class ClassroomIntelligenceEngine:
    """
    The deterministic brain of the voice tutor
    State machine controls all decisions
    LLM only verbalizes chosen actions
    """
    
    def __init__(
        self,
        session_id: str,
        user_id: str,
        notebook_id: str,
        session_data: Optional[VoiceTutorSession] = None,
        rag_retriever: Optional["RAGRetriever"] = None,
        rag_source_id: Optional[str] = None,
    ):
        self.session_id = session_id
        self.user_id = user_id
        self.notebook_id = notebook_id
        
        # Session state
        self.session = session_data or VoiceTutorSession(
            session_id=session_id,
            user_id=user_id,
            notebook_id=notebook_id,
            room_name=""
        )
        
        # State machine
        self.global_phase = TeachingPhase.SETUP
        self.loop_state: Optional[TeachingLoopState] = None
        
        # Student model
        self.student_profile: Optional[StudentProfile] = None
        
        # Curriculum
        self.curriculum = CurriculumManager(notebook_id)
        self.lesson_plan: Optional[LessonPlan] = None
        
        # Conversation tracking
        self.current_topic_index = 0
        self.current_subtopic_index = 0
        self.questions_asked_this_topic = 0
        self.correct_answers_streak = 0
        self.silence_count = 0
        self.waiting_for_ready_confirmation = True
        self.waiting_for_topic_confirmation = False
        self.explanations_given = 0
        
        # Current question state
        self.current_question: Optional[str] = None
        self.current_expected_answer: Optional[str] = None
        self.current_question_hints: list = []
        self.question_asked_at: Optional[datetime] = None
        self.last_student_speech_text: str = ""
        self.last_student_speech_time: Optional[datetime] = None
        
        # LLM client
        self.llm_client: Optional[AsyncOpenAI] = None

        # Optional RAG
        self.rag_retriever = rag_retriever
        self.rag_source_id = rag_source_id
        
        logger.info(f"ClassroomIntelligenceEngine initialized for session {session_id}")
    
    async def initialize(self):
        """Initialize engine - load curriculum, student profile, LLM"""
        # Load curriculum
        self.lesson_plan = self.curriculum.load_curriculum()
        logger.info(f"Loaded lesson plan: {self.lesson_plan.title}")
        
        # Initialize LLM client
        self.llm_client = get_async_openai_client()
        
        # Load or create student profile
        await self._load_student_profile()
        
        # Transition to INTRODUCTION phase
        self.global_phase = TeachingPhase.INTRODUCTION
        self.session.current_phase = self.global_phase
        
        logger.info("ClassroomIntelligenceEngine initialized and ready")
    
    async def _load_student_profile(self):
        """Load student profile from database or create new"""
        # TODO: Load from MongoDB
        # For MVP: Create new profile each session
        self.student_profile = StudentProfile(
            user_id=self.user_id,
            notebook_id=self.notebook_id
        )
        logger.info(f"Loaded student profile for {self.user_id}")
    
    async def handle_event(self, event: ClassroomEvent) -> Optional[TeachingAction]:
        """
        Main decision logic - routes events to phase handlers
        Returns action for Voice Agent to execute
        """
        logger.info(f"Handling event: {event.type} in phase {self.global_phase.value}")
        
        if self.global_phase == TeachingPhase.SETUP:
            return await self._handle_setup_phase(event)
        elif self.global_phase == TeachingPhase.INTRODUCTION:
            return await self._handle_introduction_phase(event)
        elif self.global_phase == TeachingPhase.TEACHING:
            return await self._handle_teaching_phase(event)
        elif self.global_phase == TeachingPhase.INTERACTION:
            return await self._handle_interaction_phase(event)
        elif self.global_phase == TeachingPhase.ASSESSMENT:
            return await self._handle_assessment_phase(event)
        elif self.global_phase == TeachingPhase.SUMMARY:
            return await self._handle_summary_phase(event)
        
        return None
    
    async def _handle_setup_phase(self, event: ClassroomEvent) -> Optional[TeachingAction]:
        """Wait for student to join"""
        if isinstance(event, ParticipantJoinEvent):
            logger.info(f"Student joined: {event.participant_name}")
            # Transition to INTRODUCTION
            self.global_phase = TeachingPhase.INTRODUCTION
            self.session.current_phase = self.global_phase
            # Start with ready check instead of explanation
            # The CALL_STUDENT prompt will generate both greeting + ready check
            return TeachingAction.CALL_STUDENT  # Will generate greeting + "are you ready?"
        
        return None
    
    async def _handle_introduction_phase(self, event: ClassroomEvent) -> Optional[TeachingAction]:
        """Greet student and explain session goals"""
        if isinstance(event, StudentSpokeEvent):
            response = event.transcript.lower()
            
            if self.waiting_for_ready_confirmation:
                # Check if student confirmed they're ready
                ready_keywords = ['yes', 'yeah', 'ready', 'sure', 'okay', 'ok', 'let\'s', 'start', 'go']
                if any(keyword in response for keyword in ready_keywords):
                    logger.info("Student confirmed ready, starting teaching phase")
                    self.waiting_for_ready_confirmation = False
                    # Transition to TEACHING
                    self.global_phase = TeachingPhase.TEACHING
                    self.loop_state = TeachingLoopState.EXPLAIN
                    self.session.current_phase = self.global_phase
                    self.session.current_loop_state = self.loop_state
                    
                    # Start with first topic
                    return TeachingAction.EXPLAIN_CONCEPT
                else:
                    # Student not ready or unclear response, ask again
                    logger.info("Student response unclear, asking if ready again")
                    return TeachingAction.CALL_STUDENT
            else:
                # Initial response to greeting, ask if ready
                logger.info("Student responded to greeting, asking if ready")
                return TeachingAction.CALL_STUDENT
        
        return None
    
    async def _handle_teaching_phase(self, event: ClassroomEvent) -> Optional[TeachingAction]:
        """
        Main teaching loop: EXPLAIN → ASK → WAIT → EVALUATE → ADAPT → CONTINUE
        """
        if isinstance(event, StudentSpokeEvent):
            return await self._process_student_response(event)
        
        elif isinstance(event, SilenceEvent):
            return await self._handle_silence(event)
        
        elif isinstance(event, InterruptionEvent):
            return await self._handle_interruption(event)
        
        # Periodic check-ins during explanation
        elif self.loop_state == TeachingLoopState.EXPLAIN:
            self.explanations_given += 1
            if self.explanations_given % 3 == 0:
                # Every 3 explanations, check if student is following
                logger.info("Periodic understanding check")
                return TeachingAction.CALL_STUDENT
        
        return None
    
    async def _process_student_response(self, event: StudentSpokeEvent) -> Optional[TeachingAction]:
        """Process student speech and decide next action"""
        # Update tracking
        self.last_student_speech_time = event.timestamp
        self.last_student_speech_text = event.transcript
        
        # Update student profile
        if self.question_asked_at:
            response_latency = (event.timestamp - self.question_asked_at).total_seconds() * 1000
            self.student_profile.avg_response_latency_ms = (
                0.9 * self.student_profile.avg_response_latency_ms +
                0.1 * response_latency
            )
        
        # Reset silence counter
        self.silence_count = 0
        
        # Check if waiting for topic confirmation
        if self.waiting_for_topic_confirmation:
            response = event.transcript.lower()
            ready_keywords = ['yes', 'yeah', 'ready', 'sure', 'okay', 'ok', 'continue', 'go ahead', 'next']
            if any(keyword in response for keyword in ready_keywords):
                logger.info("Student confirmed ready for next topic")
                self.waiting_for_topic_confirmation = False
                self.loop_state = TeachingLoopState.EXPLAIN
                return TeachingAction.EXPLAIN_CONCEPT
            else:
                # Student wants clarification or not ready
                logger.info("Student needs more time or clarification")
                return TeachingAction.ANSWER_QUESTION
        
        if self.loop_state == TeachingLoopState.WAIT:
            # We asked a question, evaluate answer
            logger.info(f"Evaluating answer: {event.transcript}")
            
            is_correct = await self._evaluate_answer(
                question=self.current_question,
                student_answer=event.transcript,
                expected_answer=self.current_expected_answer
            )
            
            # Update session metrics
            self.session.questions_asked += 1
            self.student_profile.questions_answered_total += 1
            
            if is_correct:
                logger.info("Answer correct!")
                self.correct_answers_streak += 1
                self.session.questions_answered_correctly += 1
                self.student_profile.questions_answered_correctly += 1
                self.student_profile.update_understanding(is_correct=True, weight=0.1)
                
                # Transition: EVALUATE → CONTINUE
                self.loop_state = TeachingLoopState.CONTINUE
                self.session.current_loop_state = self.loop_state
                
                if self.correct_answers_streak >= 2:
                    # Student understands, ask if ready for next topic
                    logger.info("Student mastered topic, checking if ready to advance")
                    self.waiting_for_topic_confirmation = True
                    return TeachingAction.CALL_STUDENT
                else:
                    # Give positive feedback and ask another question
                    self.explanations_given += 1
                    if self.explanations_given % 2 == 0:
                        # Every 2 questions, check understanding
                        return TeachingAction.CALL_STUDENT
                    return TeachingAction.ASK_QUESTION
            
            else:  # Wrong answer
                logger.info("Answer incorrect")
                self.correct_answers_streak = 0
                self.student_profile.update_understanding(is_correct=False, weight=0.15)
                
                # Mark topic as weak
                current_topic = self.lesson_plan.topics[self.current_topic_index]
                self.student_profile.add_weak_topic(current_topic.name)
                
                # Transition: EVALUATE → ADAPT
                self.loop_state = TeachingLoopState.ADAPT
                self.session.current_loop_state = self.loop_state
                
                if self.questions_asked_this_topic == 1:
                    # First wrong answer → give hint
                    return TeachingAction.GIVE_HINT
                else:
                    # Multiple wrong answers → simplify
                    return TeachingAction.SIMPLIFY
        
        elif self.loop_state == TeachingLoopState.EXPLAIN:
            # Student interrupted explanation
            if event.is_question():
                logger.info("Student asked question during explanation")
                # Pause teaching, enter Q&A mode
                self.global_phase = TeachingPhase.INTERACTION
                self.session.current_phase = self.global_phase
                return TeachingAction.ANSWER_QUESTION
            else:
                # Confused utterance or acknowledgment
                # Continue explaining
                return None
        
        return None
    
    async def _handle_silence(self, event: SilenceEvent) -> Optional[TeachingAction]:
        """Handle prolonged silence"""
        logger.info(f"Silence detected: {event.duration_ms}ms in context {event.context}")
        
        if self.loop_state == TeachingLoopState.WAIT:
            # Waiting for answer, student is silent
            silence_sec = event.duration_ms / 1000
            
            if silence_sec > 10:
                # Very stuck → simplify and re-explain
                logger.info("Very long silence, simplifying")
                return TeachingAction.SIMPLIFY
            elif silence_sec > 5:
                # Struggling → give hint
                logger.info("Long silence, giving hint")
                return TeachingAction.GIVE_HINT
        
        else:
            # Silence during teaching
            self.silence_count += 1
            
            # Update engagement
            self.student_profile.attention_score = max(
                0.0,
                self.student_profile.attention_score - 0.05
            )
            
            if self.silence_count >= 3:
                # Multiple silences → cold call
                logger.info("Multiple silences detected, cold calling student")
                self.silence_count = 0  # Reset
                return TeachingAction.CALL_STUDENT
        
        return None
    
    async def _handle_interruption(self, event: InterruptionEvent) -> Optional[TeachingAction]:
        """Handle student interruption (usually indicates confusion or question)"""
        logger.info("Student interrupted tutor")
        self.session.interruptions += 1
        self.student_profile.interruption_frequency += 1
        
        # Interruptions can indicate confusion or engagement
        # For now, allow it and continue after student speaks
        return None
    
    async def _handle_interaction_phase(self, event: ClassroomEvent) -> Optional[TeachingAction]:
        """Handle student-driven Q&A"""
        if isinstance(event, StudentSpokeEvent):
            # Answered student's question, return to teaching
            logger.info("Returning to teaching phase")
            self.global_phase = TeachingPhase.TEACHING
            self.session.current_phase = self.global_phase
            return TeachingAction.EXPLAIN_CONCEPT
        
        return None
    
    async def _handle_assessment_phase(self, event: ClassroomEvent) -> Optional[TeachingAction]:
        """Handle quiz/assessment"""
        # TODO: Implement formal assessment
        # For MVP: Skip to summary
        logger.info("Assessment phase - transitioning to summary")
        self.global_phase = TeachingPhase.SUMMARY
        self.session.current_phase = self.global_phase
        return TeachingAction.RECAP
    
    async def _handle_summary_phase(self, event: ClassroomEvent) -> Optional[TeachingAction]:
        """Summarize session and end"""
        if isinstance(event, StudentSpokeEvent):
            # Student acknowledged summary
            logger.info("Student acknowledged summary, ending session")
            self.global_phase = TeachingPhase.END
            self.session.current_phase = self.global_phase
            return TeachingAction.END_SESSION
        
        return None
    
    async def _advance_topic(self) -> TeachingAction:
        """Move to next topic/subtopic in lesson plan"""
        self.current_subtopic_index += 1
        
        current_topic = self.lesson_plan.topics[self.current_topic_index]
        
        if self.current_subtopic_index >= len(current_topic.subtopics):
            # Finished all subtopics → next main topic
            self.current_topic_index += 1
            self.current_subtopic_index = 0
            
            # Mark topic as covered
            self.session.topics_covered.append(current_topic.name)
            self.student_profile.add_strong_topic(current_topic.name)
            
            if self.current_topic_index >= len(self.lesson_plan.topics):
                # Finished all topics → transition to ASSESSMENT
                logger.info("Finished all topics, moving to assessment")
                self.global_phase = TeachingPhase.ASSESSMENT
                self.session.current_phase = self.global_phase
                return TeachingAction.QUIZ
        
        # Reset counters for new topic
        self.questions_asked_this_topic = 0
        self.correct_answers_streak = 0
        
        # Update session state
        current_topic = self.lesson_plan.topics[self.current_topic_index]
        current_subtopic = current_topic.subtopics[self.current_subtopic_index]
        self.session.current_topic = current_subtopic.name
        self.session.current_topic_index = self.current_topic_index
        self.session.current_subtopic_index = self.current_subtopic_index
        
        # Transition: CONTINUE → EXPLAIN
        self.loop_state = TeachingLoopState.EXPLAIN
        self.session.current_loop_state = self.loop_state
        
        logger.info(f"Advanced to topic {self.current_topic_index}, subtopic {self.current_subtopic_index}")
        return TeachingAction.EXPLAIN_CONCEPT
    
    async def _evaluate_answer(
        self,
        question: str,
        student_answer: str,
        expected_answer: str
    ) -> bool:
        """
        Use LLM to evaluate answer semantically
        Returns True/False only (not decision making)
        """
        prompt = f"""You are an answer evaluator. Compare the student's answer to the expected answer.

Question: {question}
Expected Answer: {expected_answer}
Student Answer: {student_answer}

Is the student's answer correct? Consider:
- Semantic equivalence (not exact wording)
- Core concept understanding
- Acceptable simplifications

Reply with ONLY "correct" or "incorrect"."""
        
        try:
            import os
            model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
            response = await self.llm_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=10
            )
            
            result = response.choices[0].message.content.strip().lower()
            return "correct" in result
            
        except Exception as e:
            logger.error(f"Error evaluating answer: {e}")
            # Fallback: Simple keyword matching
            return any(
                keyword.lower() in student_answer.lower()
                for keyword in expected_answer.split()[:3]
            )
    
    async def generate_speech(self, action: TeachingAction) -> str:
        """
        Generate natural language for the chosen action
        This is the ONLY place LLM influences output
        """
        logger.info(f"Generating speech for action: {action.value}")

        rag_context = ""
        try:
            if self.rag_retriever is not None:
                if action == TeachingAction.ANSWER_QUESTION and self.last_student_speech_text:
                    query = self.last_student_speech_text
                elif action == TeachingAction.EXPLAIN_CONCEPT:
                    if self.global_phase == TeachingPhase.INTRODUCTION:
                        # For introduction, get overview of all content
                        query = "overview introduction main topics"
                    elif self.lesson_plan:
                        current_topic = self.lesson_plan.topics[self.current_topic_index]
                        current_subtopic = current_topic.subtopics[self.current_subtopic_index]
                        query = current_subtopic.name
                    else:
                        query = ""
                elif action == TeachingAction.CALL_STUDENT:
                    # Get context for greeting if in introduction
                    if self.global_phase == TeachingPhase.INTRODUCTION and self.waiting_for_ready_confirmation:
                        query = "overview introduction main topics summary"
                    else:
                        query = ""
                else:
                    query = ""

                if query:
                    source_ids = [self.rag_source_id] if self.rag_source_id else None
                    docs = self.rag_retriever.get_relevant_documents(
                        query,
                        user_id=self.user_id,
                        session_id=self.session_id,
                        source_ids=source_ids,
                    )
                    if docs:
                        excerpts = []
                        for d in docs:
                            text = (d.page_content or "").strip()
                            if len(text) > 900:
                                text = text[:900] + "…"
                            src = d.metadata.get("source") if getattr(d, "metadata", None) else None
                            if src:
                                excerpts.append(f"[Source: {src}]\n{text}")
                            else:
                                excerpts.append(text)

                        rag_context = (
                            "\n\nContext excerpts (use only if relevant):\n"
                            + "\n\n".join(excerpts)
                            + "\n\nIf the answer isn't in the excerpts, say so based on the provided material."
                        )
        except Exception as e:
            logger.warning(f"RAG context retrieval failed (continuing without RAG): {e}")
        
        if action == TeachingAction.EXPLAIN_CONCEPT:
            if self.global_phase == TeachingPhase.INTRODUCTION:
                # Greeting with RAG context if available
                if rag_context:
                    prompt = f"""You are a friendly AI tutor. Greet the student and introduce today's lesson based on the provided material.

{rag_context}

Generate a warm, encouraging greeting (2-3 sentences) that:
1. Welcomes the student
2. Briefly mentions what topic we'll cover based on the material above
3. Expresses enthusiasm

Keep it conversational and natural."""
                else:
                    prompt = f"""You are a friendly AI tutor. Greet the student and introduce today's lesson.

Lesson: {self.lesson_plan.title}
Description: {self.lesson_plan.description}

Generate a warm, encouraging greeting (2-3 sentences). Keep it conversational and enthusiastic."""
                
            else:
                # Explain current subtopic
                current_topic = self.lesson_plan.topics[self.current_topic_index]
                current_subtopic = current_topic.subtopics[self.current_subtopic_index]
                
                prompt = f"""You are a skilled tutor. Explain this concept clearly and concisely.

Topic: {current_subtopic.name}
Content: {current_subtopic.content}
Student's current understanding: {self.student_profile.understanding_score:.1%}

{rag_context}

Generate explanation (2-3 sentences). Keep it conversational and at the appropriate level."""
        
        elif action == TeachingAction.ASK_QUESTION:
            # Get question from curriculum
            current_topic = self.lesson_plan.topics[self.current_topic_index]
            current_subtopic = current_topic.subtopics[self.current_subtopic_index]
            
            difficulty = self.student_profile.determine_difficulty()
            question_data = self.curriculum.get_question(current_subtopic.id, difficulty)
            
            if question_data:
                self.current_question = question_data["question"]
                self.current_expected_answer = question_data["answer"]
                self.current_question_hints = question_data.get("hints", [])
                self.question_asked_at = datetime.now()
                self.questions_asked_this_topic += 1
                
                # Transition: ASK → WAIT
                self.loop_state = TeachingLoopState.WAIT
                self.session.current_loop_state = self.loop_state
                
                prompt = f"""Ask this question naturally as a tutor would:

{self.current_question}

Generate the spoken question naturally and encouragingly."""
            else:
                prompt = "Ask: Can you summarize what you just learned?"
        
        elif action == TeachingAction.GIVE_HINT:
            if self.current_question_hints:
                hint = self.current_question_hints[0]
                prompt = f"""The student answered incorrectly. Give this hint helpfully:

Question: {self.current_question}
Hint: {hint}

Generate encouraging hint delivery."""
            else:
                prompt = f"""The student answered incorrectly. Give a helpful hint (not the full answer).

Question: {self.current_question}
Answer: {self.current_expected_answer}

Generate hint:"""
        
        elif action == TeachingAction.SIMPLIFY:
            current_topic = self.lesson_plan.topics[self.current_topic_index]
            current_subtopic = current_topic.subtopics[self.current_subtopic_index]
            
            prompt = f"""The student is struggling. Re-explain this concept more simply.

Topic: {current_subtopic.name}
Original content: {current_subtopic.content}

Generate simpler explanation (2 sentences, use everyday analogies):"""
        
        elif action == TeachingAction.CALL_STUDENT:
            # Context-aware prompting based on current state
            if self.global_phase == TeachingPhase.INTRODUCTION and self.waiting_for_ready_confirmation:
                # Initial greeting + ready check combined
                if rag_context:
                    prompt = f"""You are a friendly AI tutor greeting a student for the first time.

{rag_context}

Generate a warm welcome (2-3 sentences) that:
1. Greets the student warmly
2. Briefly mentions what we'll learn based on the material above
3. Asks if they're ready to begin

Keep it conversational. End with: "Are you ready to get started?" or similar."""
                else:
                    lesson_info = f"{self.lesson_plan.title}: {self.lesson_plan.description}" if self.lesson_plan else "the material"
                    prompt = f"""You are a friendly AI tutor greeting a student for the first time.

Lesson: {lesson_info}

Generate a warm welcome (2-3 sentences) that:
1. Greets the student  
2. Mentions what we'll learn
3. Asks if they're ready to begin

Keep it conversational. End with: "Are you ready to get started?" or similar."""
            
            elif self.waiting_for_topic_confirmation:
                current_topic = self.lesson_plan.topics[self.current_topic_index]
                next_topic_name = current_topic.name if self.current_topic_index < len(self.lesson_plan.topics) else "next topic"
                
                prompt = f"""The student did well! Ask if they're ready to move to the next topic.

Next topic: {next_topic_name}

Examples: "Great job! Should we move on to {next_topic_name}?", "You've got this down! Ready for the next part?"

Generate encouraging transition question (1-2 sentences):"""
            
            elif self.loop_state == TeachingLoopState.EXPLAIN:
                # Periodic understanding check
                prompt = f"""Check if the student is following along during explanation.

Current topic: {self.session.current_topic}

Examples: "Does that make sense so far?", "Are you following?", "Any questions about this?"

Generate natural check-in (1 sentence):"""
            
            elif self.loop_state == TeachingLoopState.WAIT:
                # Waiting for answer
                prompt = f"""The student is taking time to answer. Gently encourage them.

Question asked: {self.current_question}

Examples: "Take your time", "What do you think?", "You've got this!"

Generate encouraging prompt (1 sentence):"""
            
            else:
                # General engagement prompt
                prompt = f"""The student has been quiet. Gently prompt them to engage.

Current topic: {self.session.current_topic}

Generate encouraging prompt (1 sentence):"""
        
        elif action == TeachingAction.ANSWER_QUESTION:
            # Student asked a question
            prompt = f"""Answer the student's question briefly and clearly.

Student asked: {self.last_student_speech_text}

{rag_context}

Generate answer (2-3 sentences):"""
        
        elif action == TeachingAction.RECAP:
            topics_covered_str = ", ".join(self.session.topics_covered) if self.session.topics_covered else "our lesson"
            
            prompt = f"""Summarize today's session.

Topics covered: {topics_covered_str}
Questions answered correctly: {self.session.questions_answered_correctly} / {self.session.questions_asked}

Generate encouraging summary (3-4 sentences):"""
        
        elif action == TeachingAction.END_SESSION:
            prompt = f"""Say goodbye to the student warmly and encourage continued learning.

Generate farewell (2 sentences):"""
        
        else:
            prompt = "Continue the conversation naturally."
        
        # Generate speech with LLM
        try:
            # Use the model from environment configuration
            import os
            model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
            
            response = await self.llm_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a skilled, patient tutor speaking naturally. Keep responses concise and conversational."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150
            )
            
            speech = response.choices[0].message.content.strip()
            logger.info(f"Generated speech: {speech[:100]}...")
            return speech
            
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            return "Let's continue our lesson."
    
    def update_engagement_score(self):
        """Compute engagement score from behavioral signals"""
        if not self.last_student_speech_time:
            return
        
        # Recency score (decays over 60 seconds)
        time_since_last_speech = (datetime.now() - self.last_student_speech_time).total_seconds()
        recency_score = max(0, 1.0 - (time_since_last_speech / 60))
        
        # Participation rate
        participation_score = min(1.0, self.student_profile.participation_rate / 0.8)
        
        # Quality score (correctness)
        if self.student_profile.questions_answered_total > 0:
            quality_score = (
                self.student_profile.questions_answered_correctly /
                self.student_profile.questions_answered_total
            )
        else:
            quality_score = 0.5
        
        # Weighted combination
        engagement = (
            0.4 * recency_score +
            0.3 * participation_score +
            0.3 * quality_score
        )
        
        self.student_profile.update_engagement(recency_score, participation_score, quality_score)
        
        logger.debug(f"Engagement score updated: {engagement:.2f}")
