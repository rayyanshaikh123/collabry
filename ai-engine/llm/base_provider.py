"""
Base LLM Provider - Abstract interface for all LLM providers.

This module defines the provider-agnostic interface that all LLM providers
must implement. It ensures consistent behavior across Ollama, OpenAI, and
any future providers.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Iterator
from pydantic import BaseModel


class Message(BaseModel):
    """
    Chat message in a conversation.

    Attributes:
        role: Message role ("system", "user", "assistant", "tool")
        content: Message content text
        name: Optional name for tool messages
    """
    role: str
    content: str
    name: Optional[str] = None


class ToolDefinition(BaseModel):
    """
    Tool (function) definition for LLM tool calling.

    Attributes:
        name: Unique tool identifier
        description: Human-readable description of what the tool does
        parameters: JSON schema defining the tool's input parameters
    """
    name: str
    description: str
    parameters: Dict[str, Any]


class LLMResponse(BaseModel):
    """
    Standardized response from any LLM provider.

    Attributes:
        content: Generated text content
        tool_calls: Optional list of tool calls the LLM wants to make
        finish_reason: Why generation stopped ("stop", "tool_calls", "length")
        usage: Token usage statistics
    """
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    finish_reason: str
    usage: Dict[str, int]


class BaseLLMProvider(ABC):
    """
    Abstract base class for all LLM providers.

    This interface ensures that all providers (Ollama, OpenAI, etc.) can be
    used interchangeably without changing business logic.

    Rules for subclasses:
    - Must implement generate() and stream() methods
    - Must return structured LLMResponse objects
    - Must handle tool definitions in provider-specific format
    - Must not leak provider-specific types to caller
    - Must handle errors gracefully
    """

    def __init__(
        self,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ):
        """
        Initialize LLM provider with common parameters.

        Args:
            model: Model identifier (provider-specific)
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens in completion
        """
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    @abstractmethod
    def generate(
        self,
        messages: List[Message],
        tools: Optional[List[ToolDefinition]] = None,
        response_format: Optional[Dict[str, Any]] = None
    ) -> LLMResponse:
        """
        Generate completion (blocking).

        Args:
            messages: Conversation history
            tools: Available tools (provider will format appropriately)
            response_format: {"type": "json_object"} for JSON mode

        Returns:
            LLMResponse with content and optional tool_calls

        Raises:
            Exception: On provider errors (network, API limits, etc.)
        """
        pass

    @abstractmethod
    def stream(
        self,
        messages: List[Message],
        tools: Optional[List[ToolDefinition]] = None,
        response_format: Optional[Dict[str, Any]] = None
    ) -> Iterator[str]:
        """
        Generate completion with token-by-token streaming.

        Args:
            messages: Conversation history
            tools: Available tools
            response_format: {"type": "json_object"} for JSON mode

        Yields:
            Token strings as they are generated

        Raises:
            Exception: On provider errors
        """
        pass

    def count_tokens(self, text: str) -> int:
        """
        Estimate token count (override for accurate counting).

        Default implementation: ~4 characters per token (rough estimate).
        Subclasses should override with provider-specific tokenization.

        Args:
            text: Text to count tokens for

        Returns:
            Estimated token count
        """
        return len(text) // 4
