"""
OpenAI LLM Provider Implementation.

This module implements the BaseLLMProvider interface for OpenAI's API,
enabling cloud-based LLM inference with GPT models.
"""

from typing import List, Optional, Iterator, Dict, Any
import logging
from openai import OpenAI
from llm.base_provider import BaseLLMProvider, Message, ToolDefinition, LLMResponse

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI API provider.

    Supports models like:
    - gpt-4o (most capable, multimodal)
    - gpt-4o-mini (fast, cost-effective, recommended)
    - gpt-3.5-turbo (legacy, cheaper)
    """

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        api_key: Optional[str] = None
    ):
        """
        Initialize OpenAI provider.

        Args:
            model: OpenAI model name
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            api_key: OpenAI API key (from environment if not provided)
        """
        super().__init__(model, temperature, max_tokens)
        self.client = OpenAI(api_key=api_key)
        logger.info(f"Initialized OpenAI provider: {model}")

    def generate(
        self,
        messages: List[Message],
        tools: Optional[List[ToolDefinition]] = None,
        response_format: Optional[Dict[str, Any]] = None
    ) -> LLMResponse:
        """
        Call OpenAI chat completions API (blocking).

        Args:
            messages: Conversation history
            tools: Available tools (OpenAI function calling format)
            response_format: {"type": "json_object"} for JSON mode

        Returns:
            LLMResponse with generated content

        Raises:
            openai.OpenAIError: If API call fails
        """
        kwargs = {
            "model": self.model,
            "messages": [msg.dict() for msg in messages],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens
        }

        if tools:
            kwargs["tools"] = [self._format_tool(tool) for tool in tools]
            kwargs["tool_choice"] = "auto"

        if response_format:
            kwargs["response_format"] = response_format

        try:
            response = self.client.chat.completions.create(**kwargs)
            message = response.choices[0].message

            # Extract tool calls if present
            tool_calls = None
            if message.tool_calls:
                tool_calls = [
                    {
                        "id": tc.id,
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                    for tc in message.tool_calls
                ]

            return LLMResponse(
                content=message.content or "",
                tool_calls=tool_calls,
                finish_reason=response.choices[0].finish_reason,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens
                }
            )

        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise

    def stream(
        self,
        messages: List[Message],
        tools: Optional[List[ToolDefinition]] = None,
        response_format: Optional[Dict[str, Any]] = None
    ) -> Iterator[str]:
        """
        Call OpenAI with streaming enabled.

        Args:
            messages: Conversation history
            tools: Available tools
            response_format: {"type": "json_object"} for JSON mode

        Yields:
            Token strings as they are generated

        Raises:
            openai.OpenAIError: If streaming fails
        """
        kwargs = {
            "model": self.model,
            "messages": [msg.dict() for msg in messages],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": True
        }

        if tools:
            kwargs["tools"] = [self._format_tool(tool) for tool in tools]

        if response_format:
            kwargs["response_format"] = response_format

        try:
            stream = self.client.chat.completions.create(**kwargs)

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"OpenAI streaming failed: {e}")
            raise

    def _format_tool(self, tool: ToolDefinition) -> Dict[str, Any]:
        """
        Convert ToolDefinition to OpenAI tool format.

        Args:
            tool: Tool definition

        Returns:
            OpenAI-compatible function calling specification
        """
        return {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            }
        }
