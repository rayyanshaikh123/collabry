"""
Artifact Agent - Learning Material Generator.

This agent generates structured learning artifacts:
- Quizzes: Multiple-choice questions with explanations
- Flashcards: Front/back cards for memorization
- Mind maps: Hierarchical concept visualization

All artifacts are generated using structured JSON output to ensure
consistent formatting and easy parsing.
"""

from typing import Dict, Any
from agents.base_agent import BaseAgent
from llm.base_provider import BaseLLMProvider, Message
import json
import logging

logger = logging.getLogger(__name__)


class ArtifactAgent(BaseAgent):
    """
    Learning artifact generation agent.

    Responsibilities:
    - Generate quizzes from content
    - Generate flashcards from content
    - Generate mind maps from topics
    - Ensure high-quality educational content
    - Output structured JSON for easy parsing

    Uses JSON mode to ensure reliable, parseable output.
    """

    def __init__(self, llm_provider: BaseLLMProvider):
        """
        Initialize artifact agent.

        Args:
            llm_provider: LLM provider for generation

        Note: No memory needed for artifact generation
        """
        super().__init__(llm_provider, memory=None)

    def _get_default_system_prompt(self) -> str:
        """Return system prompt for artifact agent."""
        return """You are an expert educational content creator.

Generate high-quality learning artifacts that help students master material.

Guidelines:
- **Quizzes**: Clear questions, plausible distractors, helpful explanations
- **Flashcards**: Concise front, detailed back with examples
- **Mind maps**: Hierarchical structure with clear relationships

Always output valid JSON matching the requested format exactly."""

    def execute(self, user_input: str, **kwargs) -> str:
        """
        Not used for artifact generation.

        Use plan() and generate_from_plan() for multi-phase pipeline,
        or generate() for single-phase (legacy).
        """
        raise NotImplementedError(
            "ArtifactAgent uses plan() + generate_from_plan() or generate() methods"
        )

    def plan(self, artifact_type: str, chunks: list) -> dict:
        """
        Phase 1: Plan artifact structure without generating content.

        Args:
            artifact_type: Type of artifact ("quiz", "flashcards", "mindmap")
            chunks: List of content chunks from retrieval snapshot

        Returns:
            Plan dictionary defining structure (format depends on type)

        Examples:
            quiz → {"concepts": ["photosynthesis", "chloroplast", ...]}
            flashcards → {"terms": ["ATP", "mitochondria", ...]}
            mindmap → {"hierarchy": {"main": "Cell Biology", "subtopics": [...]}}
        """
        logger.info(f"Planning {artifact_type} structure from {len(chunks)} chunks")

        # Combine chunks for planning
        content = "\n\n".join(chunks)

        if artifact_type == "quiz":
            return self._plan_quiz(content)
        elif artifact_type == "flashcards":
            return self._plan_flashcards(content)
        elif artifact_type == "mindmap":
            return self._plan_mindmap(content)
        else:
            raise ValueError(f"Unknown artifact type: {artifact_type}")

    def generate_from_plan(
        self,
        plan: dict,
        chunks: list,
        options: dict
    ) -> dict:
        """
        Phase 2: Generate artifact content from plan.

        Args:
            plan: Plan structure from phase 1
            chunks: Same chunks used in planning
            options: Generation options

        Returns:
            Complete artifact dictionary
        """
        logger.info(f"Generating artifact from plan: {plan}")

        # Combine chunks for generation
        content = "\n\n".join(chunks)

        # Infer artifact type from plan structure
        if "concepts" in plan:
            return self._generate_quiz_from_plan(plan, content, options)
        elif "terms" in plan:
            return self._generate_flashcards_from_plan(plan, content, options)
        elif "hierarchy" in plan:
            return self._generate_mindmap_from_plan(plan, content, options)
        else:
            raise ValueError(f"Cannot infer artifact type from plan: {plan}")

    def generate(
        self,
        artifact_type: str,
        content: str,
        options: dict
    ) -> dict:
        """
        Legacy single-phase generation (kept for backward compatibility).

        Args:
            artifact_type: Type of artifact ("quiz", "flashcards", "mindmap")
            content: Source content to generate from
            options: Type-specific options

        Returns:
            Dictionary with artifact data

        Note: This method is deprecated. Use plan() + generate_from_plan() instead.
        """
        logger.info(f"Generating {artifact_type} from {len(content)} chars (legacy mode)")

        if artifact_type == "quiz":
            return self._generate_quiz(content, options)
        elif artifact_type == "flashcards":
            return self._generate_flashcards(content, options)
        elif artifact_type == "mindmap":
            return self._generate_mindmap(content, options)
        else:
            raise ValueError(f"Unknown artifact type: {artifact_type}")

    # ==================== PLANNING METHODS (Phase 1) ====================

    def _plan_quiz(self, content: str) -> dict:
        """
        Plan quiz structure by identifying key concepts.

        Returns: {"concepts": ["concept1", "concept2", ...]}
        """
        prompt = f"""Analyze this content and identify the key concepts that should be tested.

Content:
{content}

Return ONLY valid JSON in this exact format:
{{
  "concepts": ["concept1", "concept2", "concept3"]
}}

List 5-10 testable concepts."""

        messages = [
            Message(role="system", content="You are an educational content analyzer."),
            Message(role="user", content=prompt)
        ]

        response = self.llm_provider.generate(
            messages=messages,
            response_format={"type": "json_object"}
        )

        return json.loads(response.content)

    def _plan_flashcards(self, content: str) -> dict:
        """
        Plan flashcards by identifying key terms to learn.

        Returns: {"terms": ["term1", "term2", ...]}
        """
        prompt = f"""Analyze this content and identify the key terms that students should memorize.

Content:
{content}

Return ONLY valid JSON in this exact format:
{{
  "terms": ["term1", "term2", "term3"]
}}

List 10-15 important terms."""

        messages = [
            Message(role="system", content="You are an educational content analyzer."),
            Message(role="user", content=prompt)
        ]

        response = self.llm_provider.generate(
            messages=messages,
            response_format={"type": "json_object"}
        )

        return json.loads(response.content)

    def _plan_mindmap(self, content: str) -> dict:
        """
        Plan mindmap hierarchy without filling in all nodes.

        Returns: {"hierarchy": {"main": "topic", "subtopics": ["sub1", "sub2"]}}
        """
        prompt = f"""Analyze this content and create a hierarchical structure for a mind map.

Content:
{content}

Return ONLY valid JSON in this exact format:
{{
  "hierarchy": {{
    "main": "main topic",
    "subtopics": ["subtopic1", "subtopic2", "subtopic3"]
  }}
}}

Identify the main topic and 3-5 major subtopics."""

        messages = [
            Message(role="system", content="You are an educational content analyzer."),
            Message(role="user", content=prompt)
        ]

        response = self.llm_provider.generate(
            messages=messages,
            response_format={"type": "json_object"}
        )

        return json.loads(response.content)

    # ==================== GENERATION FROM PLAN (Phase 2) ====================

    def _generate_quiz_from_plan(self, plan: dict, content: str, options: dict) -> dict:
        """
        Generate quiz questions from planned concepts.

        Args:
            plan: {"concepts": [...]}
            content: Source content
            options: {num_questions: int, difficulty: str}

        Returns: Complete quiz with questions
        """
        concepts = plan.get("concepts", [])
        num_questions = options.get("num_questions", min(5, len(concepts)))
        difficulty = options.get("difficulty", "medium")

        prompt = f"""Generate {num_questions} multiple-choice quiz questions from these concepts:

Concepts: {', '.join(concepts[:num_questions])}

Content:
{content}

Difficulty: {difficulty}

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": "option A",
      "explanation": "why this is correct"
    }}
  ]
}}

Create one question per concept. Make all options plausible."""

        messages = [
            Message(role="system", content=self.system_prompt),
            Message(role="user", content=prompt)
        ]

        response = self.llm_provider.generate(
            messages=messages,
            response_format={"type": "json_object"}
        )

        return json.loads(response.content)

    def _generate_flashcards_from_plan(self, plan: dict, content: str, options: dict) -> dict:
        """
        Generate flashcards from planned terms.

        Args:
            plan: {"terms": [...]}
            content: Source content
            options: {num_cards: int}

        Returns: Complete flashcards
        """
        terms = plan.get("terms", [])
        num_cards = options.get("num_cards", min(10, len(terms)))

        prompt = f"""Generate flashcards for these terms:

Terms: {', '.join(terms[:num_cards])}

Content:
{content}

Return ONLY valid JSON in this exact format:
{{
  "flashcards": [
    {{
      "front": "term or question",
      "back": "definition or answer with examples"
    }}
  ]
}}

Create one flashcard per term. Back should include examples."""

        messages = [
            Message(role="system", content=self.system_prompt),
            Message(role="user", content=prompt)
        ]

        response = self.llm_provider.generate(
            messages=messages,
            response_format={"type": "json_object"}
        )

        return json.loads(response.content)

    def _generate_mindmap_from_plan(self, plan: dict, content: str, options: dict) -> dict:
        """
        Generate complete mindmap from planned hierarchy.

        Args:
            plan: {"hierarchy": {"main": "...", "subtopics": [...]}}
            content: Source content
            options: {depth: int}

        Returns: Complete mindmap structure
        """
        hierarchy = plan.get("hierarchy", {})
        main_topic = hierarchy.get("main", "Unknown")
        subtopics = hierarchy.get("subtopics", [])
        depth = options.get("depth", 3)

        prompt = f"""Generate a detailed mind map from this structure:

Main Topic: {main_topic}
Subtopics: {', '.join(subtopics)}

Content:
{content}

Max depth: {depth} levels

Return ONLY valid JSON in this exact format:
{{
  "root": {{
    "label": "{main_topic}",
    "children": [
      {{
        "label": "subtopic",
        "children": []
      }}
    ]
  }}
}}

Expand each subtopic with detailed child nodes."""

        messages = [
            Message(role="system", content=self.system_prompt),
            Message(role="user", content=prompt)
        ]

        response = self.llm_provider.generate(
            messages=messages,
            response_format={"type": "json_object"}
        )

        return json.loads(response.content)

    # ==================== LEGACY SINGLE-PHASE METHODS ====================

    def _generate_quiz(self, content: str, options: Dict) -> Dict[str, Any]:
        """
        Generate quiz questions with multiple choice options.

        Returns:
        {
            "questions": [
                {
                    "question": "...",
                    "options": ["A", "B", "C", "D"],
                    "correct_answer": "A",
                    "explanation": "..."
                }
            ]
        }
        """
        num_questions = options.get("num_questions", 5)
        difficulty = options.get("difficulty", "medium")

        prompt = f"""Generate {num_questions} multiple-choice quiz questions from this content.

Difficulty: {difficulty}

Content:
{content}

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": "option A",
      "explanation": "why this is correct"
    }}
  ]
}}

Rules:
- Make all options plausible
- Ensure only one correct answer
- Explanation should teach, not just state correctness"""

        messages = [
            Message(role="system", content=self.system_prompt),
            Message(role="user", content=prompt)
        ]

        try:
            response = self.llm_provider.generate(
                messages=messages,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.content)
            logger.info(f"Generated {len(result.get('questions', []))} quiz questions")
            return result

        except Exception as e:
            logger.exception("Quiz generation failed")
            raise

    def _generate_flashcards(self, content: str, options: Dict) -> Dict[str, Any]:
        """
        Generate flashcards from content.

        Returns:
        {
            "flashcards": [
                {
                    "front": "term or question",
                    "back": "definition or answer"
                }
            ]
        }
        """
        num_cards = options.get("num_cards", 10)

        prompt = f"""Generate {num_cards} flashcards from this content.

Content:
{content}

Return ONLY valid JSON in this exact format:
{{
  "flashcards": [
    {{
      "front": "term or question",
      "back": "definition or answer with examples"
    }}
  ]
}}

Rules:
- Front should be concise (1-2 sentences)
- Back should be detailed with examples
- Cover key concepts systematically"""

        messages = [
            Message(role="system", content=self.system_prompt),
            Message(role="user", content=prompt)
        ]

        try:
            response = self.llm_provider.generate(
                messages=messages,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.content)
            logger.info(f"Generated {len(result.get('flashcards', []))} flashcards")
            return result

        except Exception as e:
            logger.exception("Flashcard generation failed")
            raise

    def _generate_mindmap(self, content: str, options: Dict) -> Dict[str, Any]:
        """
        Generate hierarchical mind map structure.

        Returns:
        {
            "root": {
                "label": "main topic",
                "children": [
                    {
                        "label": "subtopic",
                        "children": [...]
                    }
                ]
            }
        }
        """
        depth = options.get("depth", 3)

        prompt = f"""Generate a hierarchical mind map from this content.

Max depth: {depth} levels

Content:
{content}

Return ONLY valid JSON in this exact format:
{{
  "root": {{
    "label": "main topic",
    "children": [
      {{
        "label": "subtopic",
        "children": []
      }}
    ]
  }}
}}

Rules:
- Organize concepts hierarchically
- Each node should have a clear, concise label
- Depth should not exceed {depth} levels
- Include all major concepts from content"""

        messages = [
            Message(role="system", content=self.system_prompt),
            Message(role="user", content=prompt)
        ]

        try:
            response = self.llm_provider.generate(
                messages=messages,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.content)
            logger.info("Generated mind map structure")
            return result

        except Exception as e:
            logger.exception("Mind map generation failed")
            raise
