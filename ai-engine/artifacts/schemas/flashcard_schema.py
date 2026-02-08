"""
Flashcard Schema - Structural Rules for Flashcard Artifacts.

Defines validation rules for flashcards.
"""

from typing import Dict, List, Any


class FlashcardSchema:
    """
    Schema for flashcard artifacts.

    Structure:
    {
        "flashcards": [
            {
                "front": str,
                "back": str
            }
        ]
    }
    """

    MAX_DEFINITION_LENGTH = 300

    @staticmethod
    def validate(artifact: Dict[str, Any]) -> List[str]:
        """
        Validate flashcard artifact structure.

        Args:
            artifact: Flashcard artifact dictionary

        Returns:
            List of violation messages (empty if valid)
        """
        violations = []

        # Check top-level structure
        if "flashcards" not in artifact:
            violations.append("Missing 'flashcards' field")
            return violations

        if not isinstance(artifact["flashcards"], list):
            violations.append("'flashcards' must be a list")
            return violations

        if len(artifact["flashcards"]) == 0:
            violations.append("Must have at least 1 flashcard")
            return violations

        # Validate each flashcard
        for i, card in enumerate(artifact["flashcards"]):
            card_violations = FlashcardSchema._validate_card(card, i)
            violations.extend(card_violations)

        # Check for duplicate terms
        FlashcardSchema._check_duplicates(artifact["flashcards"], violations)

        return violations

    @staticmethod
    def _validate_card(card: Dict[str, Any], index: int) -> List[str]:
        """
        Validate single flashcard.

        Args:
            card: Flashcard dictionary
            index: Card index for error reporting

        Returns:
            List of violations
        """
        violations = []
        prefix = f"Flashcard {index + 1}"

        # Check required fields
        if not isinstance(card, dict):
            violations.append(f"{prefix}: Must be a dictionary")
            return violations

        required_fields = ["front", "back"]
        for field in required_fields:
            if field not in card:
                violations.append(f"{prefix}: Missing '{field}' field")

        if violations:
            return violations

        # Validate front (term/question)
        if not isinstance(card["front"], str):
            violations.append(f"{prefix}: 'front' must be a string")
        else:
            front = card["front"].strip()
            if len(front) == 0:
                violations.append(f"{prefix}: Front cannot be empty")
            elif len(front) < 2:
                violations.append(f"{prefix}: Front too short (minimum 2 characters)")

        # Validate back (definition/answer)
        if not isinstance(card["back"], str):
            violations.append(f"{prefix}: 'back' must be a string")
        else:
            back = card["back"].strip()
            if len(back) == 0:
                violations.append(f"{prefix}: Back cannot be empty")
            elif len(back) > FlashcardSchema.MAX_DEFINITION_LENGTH:
                violations.append(
                    f"{prefix}: Back too long "
                    f"({len(back)} chars, max {FlashcardSchema.MAX_DEFINITION_LENGTH})"
                )

        return violations

    @staticmethod
    def _check_duplicates(cards: List[Dict[str, Any]], violations: List[str]):
        """
        Check for duplicate fronts (terms).

        Args:
            cards: List of flashcards
            violations: Violation list to append to
        """
        fronts = []
        for card in cards:
            if isinstance(card, dict) and "front" in card and isinstance(card["front"], str):
                front = card["front"].strip().lower()
                if front in fronts:
                    violations.append(f"Duplicate term found: '{card['front']}'")
                else:
                    fronts.append(front)

    @staticmethod
    def get_repair_instructions() -> str:
        """
        Get instructions for LLM to repair flashcard artifacts.

        Returns:
            Repair instructions string
        """
        return f"""Repair this flashcard artifact to fix the following violations:

Rules:
1. Each flashcard MUST have 'front' (term/question) and 'back' (definition/answer)
2. Front must be at least 2 characters
3. Back must be non-empty and under {FlashcardSchema.MAX_DEFINITION_LENGTH} characters
4. No duplicate terms allowed
5. Terms must be from the provided content (no hallucinations)

Return the corrected flashcards in the same JSON format."""
