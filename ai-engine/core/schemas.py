"""
Structured Output Schemas for Agent System.

This module defines the JSON schemas that the LLM must adhere to when
making decisions and returning results. This enforces structured output
and eliminates natural language parsing errors.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class AgentAction(BaseModel):
    """
    Structured output format for all agent decisions.

    The LLM must respond with ONLY this JSON format - no natural language
    outside this structure. This ensures reliable parsing and execution.

    Actions:
        respond: Generate a direct response to the user
        use_tool: Execute a tool and continue agent loop

    Example (tool use):
        {
            "action": "use_tool",
            "tool_name": "rag_search",
            "tool_input": {"query": "photosynthesis", "top_k": 3},
            "response": null,
            "reasoning": "User asked about content in their notes"
        }

    Example (respond):
        {
            "action": "respond",
            "tool_name": null,
            "tool_input": null,
            "response": "Here's the answer...",
            "reasoning": "I have all needed information"
        }
    """

    action: str = Field(
        ...,
        description="Action type to take: 'respond' or 'use_tool'"
    )

    tool_name: Optional[str] = Field(
        None,
        description="Name of tool to execute (required if action == 'use_tool')"
    )

    tool_input: Optional[Dict[str, Any]] = Field(
        None,
        description="Arguments for tool execution (required if action == 'use_tool')"
    )

    response: Optional[str] = Field(
        None,
        description="Direct response to user (required if action == 'respond')"
    )

    reasoning: Optional[str] = Field(
        None,
        description="Internal reasoning for this decision (not shown to user)"
    )

    @validator('action')
    def validate_action_value(cls, v):
        """Ensure action is either 'respond' or 'use_tool'."""
        if v not in ('respond', 'use_tool'):
            raise ValueError(f"action must be 'respond' or 'use_tool', got '{v}'")
        return v

    def validate_consistency(self):
        """
        Validate that action matches provided fields.

        Raises:
            ValueError: If required fields are missing for the action type
        """
        if self.action == "use_tool":
            if not self.tool_name:
                raise ValueError(
                    "tool_name is required when action == 'use_tool'"
                )
            if self.tool_input is None:
                raise ValueError(
                    "tool_input is required when action == 'use_tool' "
                    "(use empty dict {} if no arguments)"
                )

        elif self.action == "respond":
            if not self.response:
                raise ValueError(
                    "response is required when action == 'respond'"
                )


class ToolResult(BaseModel):
    """
    Result from tool execution.

    All tools must return results in this format to ensure consistency
    and proper error handling in the agent loop.

    Attributes:
        success: Whether tool execution succeeded
        data: Tool output data (format varies by tool)
        error: Error message if execution failed
        metadata: Optional additional information about execution
    """

    success: bool = Field(
        ...,
        description="Whether tool execution succeeded"
    )

    data: Any = Field(
        None,
        description="Tool output data (None if error occurred)"
    )

    error: Optional[str] = Field(
        None,
        description="Error message if execution failed"
    )

    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional execution metadata (timing, source info, etc.)"
    )

    @validator('error')
    def validate_error_on_failure(cls, v, values):
        """Ensure error message exists if success is False."""
        if not values.get('success') and not v:
            raise ValueError("error message required when success == False")
        return v


class SourceDocument(BaseModel):
    """
    Document retrieved from RAG or other sources.

    Used for passing context from tools to the agent.
    """

    content: str = Field(
        ...,
        description="Document text content"
    )

    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Document metadata (source, page, type, etc.)"
    )

    source_id: Optional[str] = Field(
        None,
        description="Unique identifier for the source"
    )


class ArtifactRequest(BaseModel):
    """
    Request to generate a learning artifact.

    Used by the generate_artifact tool and artifact agent.
    """

    artifact_type: str = Field(
        ...,
        description="Type of artifact: 'quiz', 'flashcards', or 'mindmap'"
    )

    content: str = Field(
        ...,
        description="Source content to generate artifact from"
    )

    options: Dict[str, Any] = Field(
        default_factory=dict,
        description="Type-specific options (num_questions, difficulty, depth, etc.)"
    )

    @validator('artifact_type')
    def validate_artifact_type(cls, v):
        """Ensure artifact type is supported."""
        valid_types = ('quiz', 'flashcards', 'mindmap')
        if v not in valid_types:
            raise ValueError(
                f"artifact_type must be one of {valid_types}, got '{v}'"
            )
        return v
