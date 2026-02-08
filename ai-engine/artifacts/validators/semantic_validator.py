"""
Semantic Validator - LLM-based Content Validation.

Validates artifact content for relevance and accuracy.
"""

from typing import Dict, List, Any
import json
import logging

from llm.base_provider import BaseLLMProvider, Message

logger = logging.getLogger(__name__)


class SemanticValidator:
    """
    Validates artifact content using LLM.

    Checks:
    - Relevance to source chunks
    - Answerability from context
    - Hallucination detection
    """

    def __init__(self, llm_provider: BaseLLMProvider):
        """
        Initialize semantic validator.

        Args:
            llm_provider: LLM provider for validation
        """
        self.llm_provider = llm_provider

    def validate(
        self,
        artifact_type: str,
        artifact: Dict[str, Any],
        chunks: List[str]
    ) -> Dict[str, Any]:
        """
        Validate artifact semantics.

        Args:
            artifact_type: Type of artifact
            artifact: Artifact dictionary
            chunks: Source content chunks

        Returns:
            {
                "valid": bool,
                "issues": List[str],
                "error": Optional[str]
            }
        """
        try:
            # Combine chunks
            content = "\n\n".join(chunks)

            # Get validation prompt
            prompt = self._build_validation_prompt(artifact_type, artifact, content)

            # Call LLM
            messages = [
                Message(
                    role="system",
                    content="You are a content validator. Analyze artifacts for accuracy and relevance."
                ),
                Message(role="user", content=prompt)
            ]

            response = self.llm_provider.generate(
                messages=messages,
                response_format={"type": "json_object"}
            )

            # Parse response
            result = json.loads(response.content)

            valid = result.get("valid", False)
            issues = result.get("issues", [])

            if not valid:
                logger.warning(
                    f"Semantic validation failed for {artifact_type}: "
                    f"{len(issues)} issues"
                )
                for issue in issues:
                    logger.debug(f"  - {issue}")

            return {
                "valid": valid,
                "issues": issues,
                "error": None
            }

        except Exception as e:
            logger.exception(f"Semantic validation error: {e}")
            return {
                "valid": False,
                "issues": [],
                "error": f"Validation exception: {str(e)}"
            }

    def _build_validation_prompt(
        self,
        artifact_type: str,
        artifact: Dict[str, Any],
        content: str
    ) -> str:
        """
        Build validation prompt for LLM.

        Args:
            artifact_type: Type of artifact
            artifact: Artifact dictionary
            content: Source content

        Returns:
            Validation prompt string
        """
        artifact_json = json.dumps(artifact, indent=2)

        if artifact_type == "quiz":
            return f"""Validate this quiz artifact for semantic correctness.

Source Content:
{content}

Generated Quiz:
{artifact_json}

Check for:
1. Are questions answerable from the source content?
2. Are correct answers actually correct based on the content?
3. Are any terms or facts hallucinated (not in source)?
4. Are explanations accurate and helpful?

Return ONLY valid JSON:
{{
  "valid": true/false,
  "issues": ["issue 1", "issue 2", ...]
}}

If all checks pass, return {{"valid": true, "issues": []}}."""

        elif artifact_type == "flashcards":
            return f"""Validate this flashcard set for semantic correctness.

Source Content:
{content}

Generated Flashcards:
{artifact_json}

Check for:
1. Are all terms present in the source content?
2. Are definitions accurate based on the source?
3. Are any facts hallucinated or incorrect?

Return ONLY valid JSON:
{{
  "valid": true/false,
  "issues": ["issue 1", "issue 2", ...]
}}

If all checks pass, return {{"valid": true, "issues": []}}."""

        elif artifact_type == "mindmap":
            return f"""Validate this mindmap for semantic correctness.

Source Content:
{content}

Generated Mindmap:
{artifact_json}

Check for:
1. Are all labels/concepts from the source content?
2. Is the hierarchy logical and accurate?
3. Are any concepts hallucinated?
4. Are relationships between nodes accurate?

Return ONLY valid JSON:
{{
  "valid": true/false,
  "issues": ["issue 1", "issue 2", ...]
}}

If all checks pass, return {{"valid": true, "issues": []}}."""

        else:
            return f"""Validate this artifact for semantic correctness.

Source Content:
{content}

Generated Artifact:
{artifact_json}

Check if the artifact accurately represents the source content.

Return ONLY valid JSON:
{{
  "valid": true/false,
  "issues": ["issue 1", "issue 2", ...]
}}"""
