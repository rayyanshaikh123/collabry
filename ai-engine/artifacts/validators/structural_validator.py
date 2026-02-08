"""
Structural Validator - Deterministic Schema Validation.

Validates artifact structure against predefined schemas.
"""

from typing import Dict, List, Any
import logging

from artifacts.schemas.quiz_schema import QuizSchema
from artifacts.schemas.flashcard_schema import FlashcardSchema
from artifacts.schemas.mindmap_schema import MindmapSchema

logger = logging.getLogger(__name__)


class StructuralValidator:
    """
    Validates artifact structure using deterministic rules.

    No LLM calls - pure schema enforcement.
    """

    SCHEMAS = {
        "quiz": QuizSchema,
        "flashcards": FlashcardSchema,
        "mindmap": MindmapSchema
    }

    @staticmethod
    def validate(artifact_type: str, artifact: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate artifact structure.

        Args:
            artifact_type: Type of artifact
            artifact: Artifact dictionary

        Returns:
            {
                "valid": bool,
                "violations": List[str],
                "error": Optional[str]
            }
        """
        try:
            # Get schema
            schema = StructuralValidator.SCHEMAS.get(artifact_type)

            if not schema:
                return {
                    "valid": False,
                    "violations": [],
                    "error": f"Unknown artifact type: {artifact_type}"
                }

            # Validate
            violations = schema.validate(artifact)

            if violations:
                logger.warning(
                    f"Structural validation failed for {artifact_type}: "
                    f"{len(violations)} violations"
                )
                for violation in violations:
                    logger.debug(f"  - {violation}")

            return {
                "valid": len(violations) == 0,
                "violations": violations,
                "error": None
            }

        except Exception as e:
            logger.exception(f"Structural validation error: {e}")
            return {
                "valid": False,
                "violations": [],
                "error": f"Validation exception: {str(e)}"
            }

    @staticmethod
    def get_repair_instructions(artifact_type: str) -> str:
        """
        Get repair instructions for artifact type.

        Args:
            artifact_type: Type of artifact

        Returns:
            Repair instructions string
        """
        schema = StructuralValidator.SCHEMAS.get(artifact_type)

        if not schema:
            return "Fix the artifact to match the expected format."

        if hasattr(schema, "get_repair_instructions"):
            return schema.get_repair_instructions()

        return "Fix the artifact structure to match the schema."
