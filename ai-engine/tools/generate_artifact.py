"""
Generate Artifact Tool.

This tool enables the agent to generate learning artifacts like quizzes,
flashcards, and mind maps from content. It delegates to the ArtifactAgent
for specialized generation logic.
"""

from tools.base_tool import BaseTool
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class GenerateArtifactTool(BaseTool):
    """
    Generate learning artifacts (quiz, flashcards, mindmap) from content.

    This tool is used when the user explicitly requests creating study materials
    from their content. It supports multiple artifact types with type-specific
    options for customization.

    Artifact types:
    - quiz: Multiple-choice questions with explanations
    - flashcards: Front/back cards for memorization
    - mindmap: Hierarchical concept visualization

    Usage by LLM:
        When user says: "Create a quiz from this content"
        Agent should call: generate_artifact(
            artifact_type="quiz",
            content="...",
            options={"num_questions": 5, "difficulty": "medium"}
        )
    """

    def __init__(self, llm_provider=None):
        """
        Initialize artifact generation tool.

        Args:
            llm_provider: BaseLLMProvider instance for generation
                         If None, tool will not function
        """
        self.name = "generate_artifact"
        self.description = (
            "Generate learning artifacts like quizzes, flashcards, or mind maps "
            "from content. Use when user explicitly requests creating study materials. "
            "Supports customization via options parameter."
        )
        self.parameters_schema = {
            "type": "object",
            "properties": {
                "artifact_type": {
                    "type": "string",
                    "enum": ["quiz", "flashcards", "mindmap"],
                    "description": "Type of artifact to generate"
                },
                "content": {
                    "type": "string",
                    "description": "Content to generate artifact from (can be from RAG or direct input)"
                },
                "options": {
                    "type": "object",
                    "description": (
                        "Type-specific options: "
                        "quiz: {num_questions: int, difficulty: 'easy'|'medium'|'hard'}, "
                        "flashcards: {num_cards: int}, "
                        "mindmap: {depth: int}"
                    ),
                    "default": {}
                }
            },
            "required": ["artifact_type", "content"]
        }

        self.llm_provider = llm_provider

    def execute(
        self,
        artifact_type: str,
        content: str,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Execute artifact generation.

        Args:
            artifact_type: Type of artifact ("quiz", "flashcards", "mindmap")
            content: Source content to generate from
            options: Type-specific generation options

        Returns:
            {
                "success": bool,
                "data": {
                    "artifact_type": str,
                    "artifact_data": dict  # Format depends on type
                },
                "error": None or str
            }
        """
        if not self.llm_provider:
            logger.error("Generate artifact tool called but llm_provider not initialized")
            return {
                "success": False,
                "data": None,
                "error": "LLM provider not available - tool not properly initialized"
            }

        if not options:
            options = {}

        # Validate artifact type
        valid_types = ["quiz", "flashcards", "mindmap"]
        if artifact_type not in valid_types:
            return {
                "success": False,
                "data": None,
                "error": f"Invalid artifact_type: {artifact_type}. Must be one of {valid_types}"
            }

        try:
            logger.info(f"Generating {artifact_type} artifact from {len(content)} chars of content")

            # Import artifact agent (created in Phase 3)
            # For now, we'll return a placeholder indicating this will work once Phase 3 is complete
            try:
                from agents.artifact_agent import ArtifactAgent

                agent = ArtifactAgent(self.llm_provider)
                result = agent.generate(artifact_type, content, options)

                logger.info(f"Successfully generated {artifact_type} artifact")

                return {
                    "success": True,
                    "data": {
                        "artifact_type": artifact_type,
                        "artifact_data": result
                    },
                    "error": None,
                    "metadata": {
                        "content_length": len(content),
                        "options": options
                    }
                }

            except ImportError:
                # ArtifactAgent not yet implemented (Phase 3)
                logger.warning("ArtifactAgent not yet available - Phase 3 not complete")
                return {
                    "success": False,
                    "data": None,
                    "error": (
                        "Artifact generation not yet available. "
                        "This feature will be enabled in Phase 3 (Agent System)."
                    ),
                    "metadata": {
                        "phase": "Phase 3 pending",
                        "artifact_type_requested": artifact_type
                    }
                }

        except Exception as e:
            logger.exception(f"Artifact generation failed for type: {artifact_type}")
            return {
                "success": False,
                "data": None,
                "error": f"Artifact generation failed: {str(e)}",
                "metadata": {"exception_type": type(e).__name__}
            }


def get_tool(llm_provider=None):
    """
    Factory function for tool discovery.

    Args:
        llm_provider: BaseLLMProvider instance for generation

    Returns:
        GenerateArtifactTool instance
    """
    return GenerateArtifactTool(llm_provider)
