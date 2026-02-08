"""
Ollama LLM Provider Implementation.

This module implements the BaseLLMProvider interface for Ollama,
enabling local LLM inference with models like llama3.2.
"""

from typing import List, Optional, Iterator, Dict, Any
import requests
import json
import logging
from llm.base_provider import BaseLLMProvider, Message, ToolDefinition, LLMResponse

logger = logging.getLogger(__name__)


class OllamaProvider(BaseLLMProvider):
    """
    Ollama local model provider.

    Supports models like:
    - llama3.2:3b (lightweight, fast, good for testing)
    - llama3.2:8b (balanced performance)
    - llama3.3:70b (most capable, requires more resources)
    """

    def __init__(
        self,
        model: str = "llama3.2:3b",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        base_url: str = "http://localhost:11434"
    ):
        """
        Initialize Ollama provider.

        Args:
            model: Ollama model name
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            base_url: Ollama server URL
        """
        super().__init__(model, temperature, max_tokens)
        self.base_url = base_url.rstrip('/')
        logger.info(f"Initialized Ollama provider: {model} at {base_url}")

    def generate(
        self,
        messages: List[Message],
        tools: Optional[List[ToolDefinition]] = None,
        response_format: Optional[Dict[str, Any]] = None
    ) -> LLMResponse:
        """
        Call Ollama /api/chat endpoint (blocking).

        Args:
            messages: Conversation history
            tools: Available tools (Ollama tool format)
            response_format: {"type": "json_object"} for JSON mode

        Returns:
            LLMResponse with generated content

        Raises:
            requests.RequestException: If API call fails
        """
        payload = {
            "model": self.model,
            "messages": [msg.dict() for msg in messages],
            "stream": False,
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens
            }
        }

        # Ollama tool format (if supported by model)
        if tools:
            payload["tools"] = [self._format_tool(tool) for tool in tools]

        # JSON mode
        if response_format and response_format.get("type") == "json_object":
            payload["format"] = "json"

        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=180
            )
            response.raise_for_status()
            data = response.json()

            return LLMResponse(
                content=data["message"]["content"],
                tool_calls=data["message"].get("tool_calls"),
                finish_reason="stop",
                usage={
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "completion_tokens": data.get("eval_count", 0)
                }
            )

        except requests.RequestException as e:
            logger.error(f"Ollama API call failed: {e}")
            raise

    def stream(
        self,
        messages: List[Message],
        tools: Optional[List[ToolDefinition]] = None,
        response_format: Optional[Dict[str, Any]] = None
    ) -> Iterator[str]:
        """
        Call Ollama /api/chat with streaming enabled.

        Args:
            messages: Conversation history
            tools: Available tools
            response_format: {"type": "json_object"} for JSON mode

        Yields:
            Token strings as they are generated

        Raises:
            requests.RequestException: If API call fails
        """
        payload = {
            "model": self.model,
            "messages": [msg.dict() for msg in messages],
            "stream": True,
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens
            }
        }

        if tools:
            payload["tools"] = [self._format_tool(tool) for tool in tools]

        if response_format and response_format.get("type") == "json_object":
            payload["format"] = "json"

        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                stream=True,
                timeout=180
            )
            response.raise_for_status()

            for line in response.iter_lines():
                if line:
                    chunk = json.loads(line)
                    if "message" in chunk and "content" in chunk["message"]:
                        content = chunk["message"]["content"]
                        if content:
                            yield content

        except requests.RequestException as e:
            logger.error(f"Ollama streaming failed: {e}")
            raise

    def _format_tool(self, tool: ToolDefinition) -> Dict[str, Any]:
        """
        Convert ToolDefinition to Ollama tool format.

        Args:
            tool: Tool definition

        Returns:
            Ollama-compatible tool specification
        """
        return {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            }
        }
