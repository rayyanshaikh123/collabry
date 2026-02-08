"""
LLM Provider Factory.

This module provides a factory function to create LLM providers based on
environment configuration, enabling easy switching between Ollama and OpenAI
without code changes.
"""

from typing import Optional
import logging
from llm.base_provider import BaseLLMProvider
from llm.ollama_provider import OllamaProvider
from llm.openai_provider import OpenAIProvider

logger = logging.getLogger(__name__)


def create_llm_provider(
    provider_type: str,
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 2000,
    **kwargs
) -> BaseLLMProvider:
    """
    Factory function to create LLM provider based on configuration.

    This function enables provider-agnostic code by abstracting provider
    selection to a configuration parameter. Switching providers requires
    only changing environment variables, not code.

    Args:
        provider_type: Provider to use ("ollama" or "openai")
        model: Model name (provider-specific defaults if not provided)
        temperature: Sampling temperature (0.0-1.0)
        max_tokens: Maximum tokens to generate
        **kwargs: Provider-specific arguments:
            - For Ollama: base_url
            - For OpenAI: api_key

    Returns:
        Configured BaseLLMProvider instance

    Raises:
        ValueError: If provider_type is not supported

    Example:
        >>> # Use Ollama with local model
        >>> llm = create_llm_provider(
        ...     provider_type="ollama",
        ...     model="llama3.2:3b",
        ...     base_url="http://localhost:11434"
        ... )
        >>>
        >>> # Use OpenAI with GPT-4
        >>> llm = create_llm_provider(
        ...     provider_type="openai",
        ...     model="gpt-4o-mini",
        ...     api_key="sk-..."
        ... )
    """

    provider_type = provider_type.lower()

    logger.info(f"Creating LLM provider: {provider_type} with model: {model}")

    if provider_type == "ollama":
        return OllamaProvider(
            model=model or "llama3.2:3b",
            temperature=temperature,
            max_tokens=max_tokens,
            base_url=kwargs.get("base_url", "http://localhost:11434")
        )

    elif provider_type == "openai":
        return OpenAIProvider(
            model=model or "gpt-4o-mini",
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=kwargs.get("api_key")
        )

    else:
        supported_providers = ["ollama", "openai"]
        raise ValueError(
            f"Unknown provider type: '{provider_type}'. "
            f"Supported providers: {', '.join(supported_providers)}"
        )
