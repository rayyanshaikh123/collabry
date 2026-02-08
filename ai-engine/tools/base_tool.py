"""
Base Tool Class.

This module defines the abstract base class that all tools must inherit from,
ensuring a consistent interface and enabling dynamic tool discovery.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any
import logging
from llm.base_provider import ToolDefinition

logger = logging.getLogger(__name__)


class BaseTool(ABC):
    """
    Abstract base class for all tools.

    Each tool must define:
    - name: Unique identifier (used by LLM and registry)
    - description: Clear explanation of what the tool does (shown to LLM)
    - parameters_schema: JSON schema defining expected inputs
    - execute(): Implementation of tool functionality

    The tool system enables the agent to dynamically call tools based on
    LLM decisions, with automatic discovery and validation.

    Example:
        class MyTool(BaseTool):
            def __init__(self):
                self.name = "my_tool"
                self.description = "Does something useful"
                self.parameters_schema = {
                    "type": "object",
                    "properties": {
                        "input": {"type": "string", "description": "Input text"}
                    },
                    "required": ["input"]
                }

            def execute(self, input: str) -> Dict[str, Any]:
                result = do_something(input)
                return {
                    "success": True,
                    "data": result,
                    "error": None
                }
    """

    # Subclasses must define these
    name: str
    description: str
    parameters_schema: Dict[str, Any]

    @abstractmethod
    def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute tool with provided arguments.

        Args:
            **kwargs: Tool-specific arguments matching parameters_schema

        Returns:
            Dictionary with format:
            {
                "success": bool,
                "data": Any,
                "error": Optional[str],
                "metadata": Optional[Dict]
            }

        Raises:
            Should not raise - catch exceptions and return error in result
        """
        pass

    def to_tool_definition(self) -> ToolDefinition:
        """
        Convert to LLM provider tool definition format.

        This enables the tool to be passed to the LLM for function calling.

        Returns:
            ToolDefinition compatible with LLM providers
        """
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=self.parameters_schema
        )

    def validate_input(self, input_data: Dict[str, Any]) -> tuple[bool, str]:
        """
        Validate input against schema before execution.

        Args:
            input_data: Input arguments to validate

        Returns:
            Tuple of (is_valid, error_message)
            - (True, "") if valid
            - (False, "error message") if invalid
        """
        # Check required fields
        required = self.parameters_schema.get("required", [])
        properties = self.parameters_schema.get("properties", {})

        for field in required:
            if field not in input_data:
                return False, f"Missing required field: {field}"

        # Check field types (basic validation)
        for field, value in input_data.items():
            if field in properties:
                expected_type = properties[field].get("type")
                actual_type = type(value).__name__

                # Map Python types to JSON schema types
                type_mapping = {
                    "str": "string",
                    "int": "integer",
                    "float": "number",
                    "bool": "boolean",
                    "dict": "object",
                    "list": "array"
                }

                json_type = type_mapping.get(actual_type, actual_type)

                if expected_type and json_type != expected_type:
                    return False, (
                        f"Invalid type for {field}: "
                        f"expected {expected_type}, got {json_type}"
                    )

        return True, ""

    def __repr__(self) -> str:
        """String representation for debugging."""
        return f"<{self.__class__.__name__}(name='{self.name}')>"
