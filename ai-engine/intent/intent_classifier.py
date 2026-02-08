"""
Intent Classifier - Determines execution mode from user message.

Separates chat from artifact generation BEFORE entering agent loops.

Rules:
- No RAG retrieval
- No conversation memory
- No tool execution
- Fast classification only

Output:
{
    "mode": "chat" | "artifact",
    "artifact_type": "quiz" | "flashcards" | "mindmap" | null
}
"""

from typing import Optional, Literal
from pydantic import BaseModel
from llm import create_llm_provider, Message
import logging
import json

logger = logging.getLogger(__name__)


class IntentResult(BaseModel):
    """Intent classification result."""
    mode: Literal["chat", "artifact"]
    artifact_type: Optional[Literal["quiz", "flashcards", "mindmap"]] = None
    confidence: float = 1.0


class IntentClassifier:
    """
    Fast intent classifier using pattern matching and optional LLM fallback.

    Classification hierarchy:
    1. Pattern matching (instant) - explicit keywords
    2. LLM classification (fast model) - ambiguous cases

    Design:
    - No memory, RAG, or tools
    - Single-shot classification
    - Fast model (Ollama local preferred)
    """

    # Explicit artifact keywords (high confidence)
    QUIZ_KEYWORDS = [
        "quiz", "test", "exam", "assessment", "questions",
        "multiple choice", "mcq", "practice questions"
    ]

    FLASHCARD_KEYWORDS = [
        "flashcard", "flash card", "study card", "revision card",
        "memorization card", "study notes", "key terms"
    ]

    MINDMAP_KEYWORDS = [
        "mindmap", "mind map", "concept map", "diagram",
        "visual map", "topic map", "knowledge graph"
    ]

    # Explicit generation verbs
    GENERATION_VERBS = [
        "generate", "create", "make", "build", "produce",
        "design", "develop", "prepare"
    ]

    def __init__(self, llm_provider=None):
        """
        Initialize intent classifier.

        Args:
            llm_provider: Optional LLM for ambiguous cases (uses fast model if None)
        """
        self.llm_provider = llm_provider

    def classify(self, user_message: str) -> IntentResult:
        """
        Classify user message intent.

        Args:
            user_message: Raw user input

        Returns:
            IntentResult with mode and optional artifact_type
        """
        # Normalize message
        message_lower = user_message.lower().strip()

        # Try pattern matching first (instant)
        pattern_result = self._pattern_match(message_lower)
        if pattern_result:
            logger.info(f"Intent classified via pattern: {pattern_result.mode} ({pattern_result.artifact_type})")
            return pattern_result

        # Fallback to LLM classification for ambiguous cases
        llm_result = self._llm_classify(user_message)
        logger.info(f"Intent classified via LLM: {llm_result.mode} ({llm_result.artifact_type})")
        return llm_result

    def _pattern_match(self, message_lower: str) -> Optional[IntentResult]:
        """
        Fast pattern matching for explicit artifact requests.

        Returns IntentResult if confident, None otherwise.
        """
        # Check for generation verb + artifact type
        has_generation_verb = any(verb in message_lower for verb in self.GENERATION_VERBS)

        # Check quiz
        if any(keyword in message_lower for keyword in self.QUIZ_KEYWORDS):
            if has_generation_verb or "quiz" in message_lower:
                return IntentResult(
                    mode="artifact",
                    artifact_type="quiz",
                    confidence=0.95
                )

        # Check flashcards
        if any(keyword in message_lower for keyword in self.FLASHCARD_KEYWORDS):
            if has_generation_verb or "flashcard" in message_lower:
                return IntentResult(
                    mode="artifact",
                    artifact_type="flashcards",
                    confidence=0.95
                )

        # Check mindmap
        if any(keyword in message_lower for keyword in self.MINDMAP_KEYWORDS):
            if has_generation_verb or "mindmap" in message_lower or "mind map" in message_lower:
                return IntentResult(
                    mode="artifact",
                    artifact_type="mindmap",
                    confidence=0.95
                )

        # No confident pattern match
        return None

    def _llm_classify(self, user_message: str) -> IntentResult:
        """
        LLM-based classification for ambiguous cases.

        Uses lightweight prompt with JSON mode for fast classification.
        """
        system_prompt = """You are an intent classifier for a study assistant.

Your ONLY job is to classify if the user wants:
1. CHAT - conversational help, questions, explanations, discussions
2. ARTIFACT - generate study materials (quiz, flashcards, mindmap)

Output ONLY valid JSON in this format:
{
  "mode": "chat" or "artifact",
  "artifact_type": "quiz" or "flashcards" or "mindmap" or null
}

Examples:

User: "Explain photosynthesis"
Output: {"mode": "chat", "artifact_type": null}

User: "Make a quiz on photosynthesis"
Output: {"mode": "artifact", "artifact_type": "quiz"}

User: "Help me understand quantum mechanics"
Output: {"mode": "chat", "artifact_type": null}

User: "Create flashcards for chapter 5"
Output: {"mode": "artifact", "artifact_type": "flashcards"}

User: "What's the difference between mitosis and meiosis?"
Output: {"mode": "chat", "artifact_type": null}

User: "Can you make a mindmap of the solar system?"
Output: {"mode": "artifact", "artifact_type": "mindmap"}

Rules:
- "generate", "create", "make" + artifact type → artifact mode
- Questions, explanations, discussions → chat mode
- Ambiguous → chat mode (safer default)"""

        messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=user_message)
        ]

        try:
            # Use existing provider or create fast one
            provider = self.llm_provider
            if not provider:
                # Use fast local model for classification
                from config import CONFIG
                provider = create_llm_provider(
                    provider_type=CONFIG.get("llm_provider", "ollama"),
                    model=CONFIG.get("llm_model", "llama3.2:latest"),
                    temperature=0.1,  # Low temperature for consistency
                    max_tokens=100,  # Short response
                    base_url=CONFIG.get("ollama_base_url"),
                    api_key=CONFIG.get("openai_api_key")
                )

            # Get classification with JSON mode
            response = provider.generate(
                messages=messages,
                response_format={"type": "json_object"}
            )

            # Parse result
            result_data = json.loads(response.content)

            return IntentResult(
                mode=result_data.get("mode", "chat"),
                artifact_type=result_data.get("artifact_type"),
                confidence=0.85  # LLM classification confidence
            )

        except Exception as e:
            logger.exception(f"Intent classification failed, defaulting to chat: {e}")
            # Safe fallback: treat as chat
            return IntentResult(
                mode="chat",
                artifact_type=None,
                confidence=0.5
            )
