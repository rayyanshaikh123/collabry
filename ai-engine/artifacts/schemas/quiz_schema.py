"""
Quiz Schema - Structural Rules for Quiz Artifacts.

Defines validation rules for quiz questions.
"""

from typing import Dict, List, Any


class QuizSchema:
    """
    Schema for quiz artifacts.

    Structure:
    {
        "questions": [
            {
                "question": str,
                "options": [str, str, str, str],
                "correct_answer": str,
                "explanation": str
            }
        ]
    }
    """

    @staticmethod
    def validate(artifact: Dict[str, Any]) -> List[str]:
        """
        Validate quiz artifact structure.

        Args:
            artifact: Quiz artifact dictionary

        Returns:
            List of violation messages (empty if valid)
        """
        violations = []

        # Check top-level structure
        if "questions" not in artifact:
            violations.append("Missing 'questions' field")
            return violations

        if not isinstance(artifact["questions"], list):
            violations.append("'questions' must be a list")
            return violations

        if len(artifact["questions"]) == 0:
            violations.append("Quiz must have at least 1 question")
            return violations

        # Validate each question
        for i, question in enumerate(artifact["questions"]):
            q_violations = QuizSchema._validate_question(question, i)
            violations.extend(q_violations)

        return violations

    @staticmethod
    def _validate_question(question: Dict[str, Any], index: int) -> List[str]:
        """
        Validate single question.

        Args:
            question: Question dictionary
            index: Question index for error reporting

        Returns:
            List of violations
        """
        violations = []
        prefix = f"Question {index + 1}"

        # Check required fields
        if not isinstance(question, dict):
            violations.append(f"{prefix}: Must be a dictionary")
            return violations

        required_fields = ["question", "options", "correct_answer", "explanation"]
        for field in required_fields:
            if field not in question:
                violations.append(f"{prefix}: Missing '{field}' field")

        # If missing required fields, skip further validation
        if violations:
            return violations

        # Validate question text
        if not isinstance(question["question"], str):
            violations.append(f"{prefix}: 'question' must be a string")
        elif len(question["question"].strip()) == 0:
            violations.append(f"{prefix}: Question text cannot be empty")

        # Validate options
        if not isinstance(question["options"], list):
            violations.append(f"{prefix}: 'options' must be a list")
        else:
            # Must have at least 4 options
            if len(question["options"]) < 4:
                violations.append(f"{prefix}: Must have at least 4 options (has {len(question['options'])})")

            # All options must be strings
            for j, option in enumerate(question["options"]):
                if not isinstance(option, str):
                    violations.append(f"{prefix}: Option {j + 1} must be a string")
                elif len(option.strip()) == 0:
                    violations.append(f"{prefix}: Option {j + 1} cannot be empty")

            # Check for duplicates
            option_texts = [opt.strip().lower() for opt in question["options"] if isinstance(opt, str)]
            if len(option_texts) != len(set(option_texts)):
                violations.append(f"{prefix}: Options must be unique (found duplicates)")

        # Validate correct_answer
        if not isinstance(question["correct_answer"], str):
            violations.append(f"{prefix}: 'correct_answer' must be a string")
        elif isinstance(question["options"], list):
            # Correct answer must be in options
            if question["correct_answer"] not in question["options"]:
                violations.append(
                    f"{prefix}: correct_answer '{question['correct_answer']}' "
                    f"must be one of the options"
                )

        # Validate explanation
        if not isinstance(question["explanation"], str):
            violations.append(f"{prefix}: 'explanation' must be a string")
        elif len(question["explanation"].strip()) == 0:
            violations.append(f"{prefix}: Explanation cannot be empty")

        return violations

    @staticmethod
    def get_repair_instructions() -> str:
        """
        Get instructions for LLM to repair quiz artifacts.

        Returns:
            Repair instructions string
        """
        return """Repair this quiz artifact to fix the following violations:

Rules:
1. Each question MUST have at least 4 options
2. correct_answer MUST be exactly one of the options
3. No duplicate options allowed
4. All fields (question, options, correct_answer, explanation) must be non-empty strings
5. Questions must be answerable from the provided content

Return the corrected quiz in the same JSON format."""
