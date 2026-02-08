"""
LLM Provider Abstraction Layer.

This package provides a provider-agnostic interface for LLM providers,
enabling easy switching between Ollama (local) and OpenAI (cloud) without
changing application code.

Usage:
    from llm import create_llm_provider, Message

    # Create provider based on configuration
    llm = create_llm_provider(
        provider_type="ollama",  # or "openai"
        model="llama3.2:3b"
    )

    # Generate completion
    response = llm.generate([
        Message(role="user", content="Hello, how are you?")
    ])

    print(response.content)

    # Stream completion
    for token in llm.stream([
        Message(role="user", content="Tell me a story")
    ]):
        print(token, end="", flush=True)
"""

from llm.base_provider import (
    BaseLLMProvider,
    Message,
    ToolDefinition,
    LLMResponse
)
from llm.llm_factory import create_llm_provider

__all__ = [
    "BaseLLMProvider",
    "Message",
    "ToolDefinition",
    "LLMResponse",
    "create_llm_provider"
]

__version__ = "1.0.0"
