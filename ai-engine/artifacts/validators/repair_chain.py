"""
Repair Chain - Automatic Artifact Repair System.

Attempts to repair invalid artifacts using LLM.
"""

from typing import Dict, List, Any, Optional
import json
import logging

from llm.base_provider import BaseLLMProvider, Message
from artifacts.validators.structural_validator import StructuralValidator
from artifacts.validators.semantic_validator import SemanticValidator

logger = logging.getLogger(__name__)


class RepairChain:
    """
    Repairs invalid artifacts using LLM.

    Process:
    1. Receive artifact + violations/issues
    2. Send to LLM with repair instructions
    3. Revalidate repaired artifact
    4. Max 2 repair attempts
    """

    MAX_REPAIR_ATTEMPTS = 2

    def __init__(self, llm_provider: BaseLLMProvider):
        """
        Initialize repair chain.

        Args:
            llm_provider: LLM provider for repair
        """
        self.llm_provider = llm_provider
        self.structural_validator = StructuralValidator()
        self.semantic_validator = SemanticValidator(llm_provider)

    def repair_and_validate(
        self,
        artifact_type: str,
        artifact: Dict[str, Any],
        plan: Dict[str, Any],
        chunks: List[str],
        initial_violations: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Attempt to repair artifact with validation loop.

        Args:
            artifact_type: Type of artifact
            artifact: Invalid artifact
            plan: Plan from planning phase
            chunks: Source content chunks
            initial_violations: Initial validation results

        Returns:
            {
                "success": bool,
                "artifact": Dict (repaired if successful),
                "attempts": int,
                "final_violations": Dict,
                "error": Optional[str]
            }
        """
        current_artifact = artifact
        current_violations = initial_violations

        for attempt in range(1, self.MAX_REPAIR_ATTEMPTS + 1):
            logger.info(f"🔧 Repair attempt {attempt}/{self.MAX_REPAIR_ATTEMPTS}")

            try:
                # Attempt repair
                repaired = self._repair_artifact(
                    artifact_type=artifact_type,
                    artifact=current_artifact,
                    plan=plan,
                    chunks=chunks,
                    violations=current_violations
                )

                if not repaired:
                    logger.error(f"Repair attempt {attempt} failed: LLM returned empty")
                    continue

                # Revalidate structural
                structural_result = self.structural_validator.validate(
                    artifact_type=artifact_type,
                    artifact=repaired
                )

                if not structural_result["valid"]:
                    logger.warning(
                        f"Repair attempt {attempt} failed structural validation: "
                        f"{len(structural_result['violations'])} violations"
                    )
                    current_artifact = repaired
                    current_violations = {
                        "structural": structural_result,
                        "semantic": {"valid": True, "issues": []}
                    }
                    continue

                # Revalidate semantic
                semantic_result = self.semantic_validator.validate(
                    artifact_type=artifact_type,
                    artifact=repaired,
                    chunks=chunks
                )

                if not semantic_result["valid"]:
                    logger.warning(
                        f"Repair attempt {attempt} failed semantic validation: "
                        f"{len(semantic_result['issues'])} issues"
                    )
                    current_artifact = repaired
                    current_violations = {
                        "structural": {"valid": True, "violations": []},
                        "semantic": semantic_result
                    }
                    continue

                # Both validations passed
                logger.info(f"✓ Repair successful on attempt {attempt}")
                return {
                    "success": True,
                    "artifact": repaired,
                    "attempts": attempt,
                    "final_violations": {
                        "structural": structural_result,
                        "semantic": semantic_result
                    },
                    "error": None
                }

            except Exception as e:
                logger.exception(f"Repair attempt {attempt} error: {e}")
                continue

        # Max attempts reached
        logger.error(f"Repair failed after {self.MAX_REPAIR_ATTEMPTS} attempts")
        return {
            "success": False,
            "artifact": current_artifact,
            "attempts": self.MAX_REPAIR_ATTEMPTS,
            "final_violations": current_violations,
            "error": f"Repair failed after {self.MAX_REPAIR_ATTEMPTS} attempts"
        }

    def _repair_artifact(
        self,
        artifact_type: str,
        artifact: Dict[str, Any],
        plan: Dict[str, Any],
        chunks: List[str],
        violations: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Call LLM to repair artifact.

        Args:
            artifact_type: Type of artifact
            artifact: Invalid artifact
            plan: Plan structure
            chunks: Source chunks
            violations: Validation results

        Returns:
            Repaired artifact dictionary or None if repair fails
        """
        # Build repair prompt
        prompt = self._build_repair_prompt(
            artifact_type=artifact_type,
            artifact=artifact,
            plan=plan,
            chunks=chunks,
            violations=violations
        )

        # Call LLM
        messages = [
            Message(
                role="system",
                content="You are an artifact repair specialist. Fix artifacts to meet validation rules."
            ),
            Message(role="user", content=prompt)
        ]

        try:
            response = self.llm_provider.generate(
                messages=messages,
                response_format={"type": "json_object"}
            )

            repaired = json.loads(response.content)
            return repaired

        except Exception as e:
            logger.error(f"LLM repair call failed: {e}")
            return None

    def _build_repair_prompt(
        self,
        artifact_type: str,
        artifact: Dict[str, Any],
        plan: Dict[str, Any],
        chunks: List[str],
        violations: Dict[str, Any]
    ) -> str:
        """
        Build repair prompt for LLM.

        Args:
            artifact_type: Type of artifact
            artifact: Invalid artifact
            plan: Plan structure
            chunks: Source chunks
            violations: Validation results

        Returns:
            Repair prompt string
        """
        content = "\n\n".join(chunks)
        artifact_json = json.dumps(artifact, indent=2)
        plan_json = json.dumps(plan, indent=2)

        # Extract violation messages
        structural_violations = violations.get("structural", {}).get("violations", [])
        semantic_issues = violations.get("semantic", {}).get("issues", [])

        violations_text = ""
        if structural_violations:
            violations_text += "Structural Violations:\n"
            for v in structural_violations:
                violations_text += f"  - {v}\n"

        if semantic_issues:
            violations_text += "\nSemantic Issues:\n"
            for issue in semantic_issues:
                violations_text += f"  - {issue}\n"

        # Get repair instructions for artifact type
        repair_instructions = StructuralValidator.get_repair_instructions(artifact_type)

        return f"""Repair this {artifact_type} artifact to fix all violations.

Original Plan:
{plan_json}

Source Content:
{content}

Current Artifact (INVALID):
{artifact_json}

Violations Found:
{violations_text}

{repair_instructions}

CRITICAL: Return the COMPLETE corrected artifact in valid JSON format.
Do not return explanations or partial fixes - return the full corrected artifact."""
