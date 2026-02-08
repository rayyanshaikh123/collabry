"""
Teaching State Machine and Student Profile Models
State-driven pedagogical agent logic
"""
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
import json


class TeachingPhase(Enum):
    """Global teaching phases - high-level session structure"""
    SETUP = "setup"              # Wait for student, initialize lesson
    INTRODUCTION = "introduction" # Greet, explain session goals
    TEACHING = "teaching"         # Main teaching loop
    INTERACTION = "interaction"   # Student-driven Q&A mode
    ASSESSMENT = "assessment"     # Quiz/formal evaluation
    REVISION = "revision"         # Review weak topics
    SUMMARY = "summary"           # Session recap
    END = "end"                   # Goodbye, session complete


class TeachingLoopState(Enum):
    """States within the main teaching loop (TEACHING phase)"""
    EXPLAIN = "explain"       # Present new concept
    ASK = "ask"               # Ask comprehension question
    WAIT = "wait"             # Wait for student response
    EVALUATE = "evaluate"     # Check correctness of answer
    ADAPT = "adapt"           # Adjust difficulty based on performance
    CONTINUE = "continue"     # Decide next action (advance or repeat)


class TeachingAction(Enum):
    """Discrete actions the tutor can take"""
    EXPLAIN_CONCEPT = "explain"
    ASK_QUESTION = "ask_question"
    CALL_STUDENT = "call_student"      # Prompt inactive student
    SIMPLIFY = "simplify"              # Re-explain with easier language
    GIVE_HINT = "give_hint"            # Provide hint for current question
    RECAP = "recap"                    # Recap last N topics
    QUIZ = "quiz"                      # Start formal assessment
    ADVANCE_TOPIC = "advance"          # Move to next topic
    END_SESSION = "end"                # Conclude session
    ANSWER_QUESTION = "answer_question" # Respond to student's question
    ENCOURAGE = "encourage"            # Motivational support


@dataclass
class StudentProfile:
    """
    Student model - tracks learning state and behavioral patterns
    Updated after every interaction
    """
    user_id: str
    notebook_id: str
    
    # Real-time metrics (0.0 - 1.0)
    attention_score: float = 0.7  # Engagement level
    understanding_score: float = 0.5  # Comprehension estimate
    confidence_level: float = 0.5  # Based on response patterns
    participation_rate: float = 0.0  # % of opportunities student spoke
    
    # Historical data
    total_sessions: int = 0
    total_study_minutes: int = 0
    weak_topics: List[str] = field(default_factory=list)
    strong_topics: List[str] = field(default_factory=list)
    preferred_difficulty: str = "medium"  # "easy", "medium", "hard"
    
    # Behavioral patterns
    avg_response_latency_ms: float = 2000.0  # Average time to respond
    interruption_frequency: float = 0.0  # Interruptions per minute
    question_asking_rate: float = 0.0  # Questions asked per 10 minutes
    
    # Session counters (reset each session)
    questions_answered_total: int = 0
    questions_answered_correctly: int = 0
    
    updated_at: datetime = field(default_factory=datetime.now)
    
    def update_understanding(self, is_correct: bool, weight: float = 0.1):
        """Update understanding score based on answer correctness"""
        if is_correct:
            self.understanding_score = min(1.0, self.understanding_score + weight)
        else:
            self.understanding_score = max(0.0, self.understanding_score - weight * 1.5)
        self.updated_at = datetime.now()
    
    def update_engagement(self, recency_score: float, participation: float, quality: float):
        """
        Compute engagement score from multiple behavioral signals
        
        Args:
            recency_score: 0-1, how recently student spoke
            participation: 0-1, % of questions answered
            quality: 0-1, correctness rate
        """
        self.attention_score = (
            0.4 * recency_score +
            0.3 * participation +
            0.3 * quality
        )
        self.updated_at = datetime.now()
    
    def add_weak_topic(self, topic: str):
        """Mark topic as weak (student struggled)"""
        if topic not in self.weak_topics:
            self.weak_topics.append(topic)
        # Remove from strong if present
        if topic in self.strong_topics:
            self.strong_topics.remove(topic)
        self.updated_at = datetime.now()
    
    def add_strong_topic(self, topic: str):
        """Mark topic as strong (student mastered)"""
        if topic not in self.strong_topics:
            self.strong_topics.append(topic)
        # Remove from weak if present
        if topic in self.weak_topics:
            self.weak_topics.remove(topic)
        self.updated_at = datetime.now()
    
    def determine_difficulty(self) -> str:
        """Adaptive difficulty based on understanding score"""
        if self.understanding_score < 0.3:
            return "easy"
        elif self.understanding_score < 0.7:
            return "medium"
        else:
            return "hard"
    
    def to_dict(self) -> dict:
        """Serialize to dictionary for MongoDB storage"""
        return {
            "user_id": self.user_id,
            "notebook_id": self.notebook_id,
            "attention_score": self.attention_score,
            "understanding_score": self.understanding_score,
            "confidence_level": self.confidence_level,
            "participation_rate": self.participation_rate,
            "total_sessions": self.total_sessions,
            "total_study_minutes": self.total_study_minutes,
            "weak_topics": self.weak_topics,
            "strong_topics": self.strong_topics,
            "preferred_difficulty": self.preferred_difficulty,
            "avg_response_latency_ms": self.avg_response_latency_ms,
            "interruption_frequency": self.interruption_frequency,
            "question_asking_rate": self.question_asking_rate,
            "questions_answered_total": self.questions_answered_total,
            "questions_answered_correctly": self.questions_answered_correctly,
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "StudentProfile":
        """Load from dictionary"""
        # Parse datetime
        if "updated_at" in data and isinstance(data["updated_at"], str):
            data["updated_at"] = datetime.fromisoformat(data["updated_at"])
        elif "updated_at" not in data:
            data["updated_at"] = datetime.now()
        
        return cls(**data)


@dataclass
class ConversationTurn:
    """Single turn in the conversation transcript"""
    speaker: str  # "student" or "tutor"
    text: str
    timestamp: datetime
    audio_duration_ms: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "speaker": self.speaker,
            "text": self.text,
            "timestamp": self.timestamp.isoformat(),
            "audio_duration_ms": self.audio_duration_ms,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "ConversationTurn":
        if isinstance(data["timestamp"], str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)


@dataclass
class VoiceTutorSession:
    """Complete voice tutor session state"""
    session_id: str
    user_id: str
    notebook_id: str
    room_name: str
    
    # Status
    status: str = "active"  # "active", "completed", "interrupted"
    started_at: datetime = field(default_factory=datetime.now)
    ended_at: Optional[datetime] = None
    
    # Teaching state
    current_phase: TeachingPhase = TeachingPhase.SETUP
    current_loop_state: Optional[TeachingLoopState] = None
    current_topic: Optional[str] = None
    current_topic_index: int = 0
    current_subtopic_index: int = 0
    topics_covered: List[str] = field(default_factory=list)
    
    # Lesson plan reference
    lesson_plan_id: Optional[str] = None
    
    # Metrics
    total_duration_seconds: int = 0
    student_speech_time_seconds: int = 0
    tutor_speech_time_seconds: int = 0
    interruptions: int = 0
    questions_asked: int = 0
    questions_answered_correctly: int = 0
    
    # Transcript
    turns: List[ConversationTurn] = field(default_factory=list)
    
    def add_turn(self, speaker: str, text: str, audio_duration_ms: Optional[int] = None):
        """Add a conversation turn"""
        turn = ConversationTurn(
            speaker=speaker,
            text=text,
            timestamp=datetime.now(),
            audio_duration_ms=audio_duration_ms
        )
        self.turns.append(turn)
        
        # Update speech time
        if audio_duration_ms:
            duration_sec = audio_duration_ms / 1000
            if speaker == "student":
                self.student_speech_time_seconds += int(duration_sec)
            elif speaker == "tutor":
                self.tutor_speech_time_seconds += int(duration_sec)
    
    def complete_session(self):
        """Mark session as completed"""
        self.status = "completed"
        self.ended_at = datetime.now()
        if self.started_at:
            self.total_duration_seconds = int((self.ended_at - self.started_at).total_seconds())
    
    def to_dict(self) -> dict:
        """Serialize for MongoDB"""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "notebook_id": self.notebook_id,
            "room_name": self.room_name,
            "status": self.status,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "current_phase": self.current_phase.value,
            "current_loop_state": self.current_loop_state.value if self.current_loop_state else None,
            "current_topic": self.current_topic,
            "current_topic_index": self.current_topic_index,
            "current_subtopic_index": self.current_subtopic_index,
            "topics_covered": self.topics_covered,
            "lesson_plan_id": self.lesson_plan_id,
            "total_duration_seconds": self.total_duration_seconds,
            "student_speech_time_seconds": self.student_speech_time_seconds,
            "tutor_speech_time_seconds": self.tutor_speech_time_seconds,
            "interruptions": self.interruptions,
            "questions_asked": self.questions_asked,
            "questions_answered_correctly": self.questions_answered_correctly,
            "turns": [turn.to_dict() for turn in self.turns]
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "VoiceTutorSession":
        """Load from MongoDB document"""
        # Parse enums
        if "current_phase" in data and isinstance(data["current_phase"], str):
            data["current_phase"] = TeachingPhase(data["current_phase"])
        
        if "current_loop_state" in data and data["current_loop_state"]:
            data["current_loop_state"] = TeachingLoopState(data["current_loop_state"])
        
        # Parse dates
        if "started_at" in data and isinstance(data["started_at"], str):
            data["started_at"] = datetime.fromisoformat(data["started_at"])
        
        if "ended_at" in data and data["ended_at"] and isinstance(data["ended_at"], str):
            data["ended_at"] = datetime.fromisoformat(data["ended_at"])
        
        # Parse turns
        if "turns" in data:
            data["turns"] = [ConversationTurn.from_dict(t) for t in data["turns"]]
        
        return cls(**data)
