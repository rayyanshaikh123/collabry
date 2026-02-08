"""
Unified LLM Client - Single Source of Truth for all LLM access.

This is the ONLY file that directly imports LLM SDKs.
All other modules must import from this file.

Supports any OpenAI-compatible API endpoint:
- OpenAI (production)
- LM Studio (local development)
- Ollama with OpenAI compatibility (local)
- Together AI, OpenRouter, etc.

Provider switching requires only environment variable changes.
"""

import os
from typing import Optional
from openai import OpenAI, AsyncOpenAI
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    # Fallback for older langchain installations
    from langchain_community.chat_models import ChatOpenAI


class LLMConfig:
    """Configuration for OpenAI-compatible LLM client."""
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "dummy")
        self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
        self.max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", "4096"))
        self.streaming = os.getenv("OPENAI_STREAMING", "true").lower() == "true"
    
    def __repr__(self):
        return f"LLMConfig(base_url={self.base_url}, model={self.model})"


# Singleton instance
_config: Optional[LLMConfig] = None
_client: Optional[OpenAI] = None
_async_client: Optional[AsyncOpenAI] = None
_langchain_client: Optional[ChatOpenAI] = None


def get_llm_config() -> LLMConfig:
    """Get or create LLM configuration singleton."""
    global _config
    if _config is None:
        _config = LLMConfig()
    return _config


def get_openai_client() -> OpenAI:
    """
    Get OpenAI client for synchronous operations.
    
    Returns:
        OpenAI client configured with environment variables
        
    Example:
        >>> client = get_openai_client()
        >>> response = client.chat.completions.create(...)
    """
    global _client
    if _client is None:
        config = get_llm_config()
        _client = OpenAI(
            api_key=config.api_key,
            base_url=config.base_url
        )
    return _client


def get_async_openai_client() -> AsyncOpenAI:
    """
    Get async OpenAI client for async operations.
    
    Returns:
        AsyncOpenAI client configured with environment variables
        
    Example:
        >>> client = get_async_openai_client()
        >>> response = await client.chat.completions.create(...)
    """
    global _async_client
    if _async_client is None:
        config = get_llm_config()
        _async_client = AsyncOpenAI(
            api_key=config.api_key,
            base_url=config.base_url
        )
    return _async_client


def get_langchain_llm() -> ChatOpenAI:
    """
    Get LangChain-compatible LLM for agent orchestration.
    
    This is used by the agent executor for tool calling.
    
    Returns:
        ChatOpenAI instance configured with environment variables
        
    Example:
        >>> llm = get_langchain_llm()
        >>> agent = create_openai_tools_agent(llm, tools, prompt)
    """
    global _langchain_client
    if _langchain_client is None:
        config = get_llm_config()
        try:
            # Try newer parameter names first
            _langchain_client = ChatOpenAI(
                model=config.model,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                openai_api_key=config.api_key,
                openai_api_base=config.base_url,
                streaming=config.streaming,
            )
        except TypeError:
            # Fallback to older parameter names
            _langchain_client = ChatOpenAI(
                model_name=config.model,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                openai_api_key=config.api_key,
                openai_api_base=config.base_url,
                streaming=config.streaming,
            )
    return _langchain_client


def reset_clients():
    """Reset all client singletons. Useful for testing or config changes."""
    global _config, _client, _async_client, _langchain_client
    _config = None
    _client = None
    _async_client = None
    _langchain_client = None


# Convenience function for direct chat completions
async def chat_completion(
    messages: list[dict],
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    stream: bool = False,
    **kwargs
):
    """
    Convenience function for chat completions.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        temperature: Override default temperature
        max_tokens: Override default max tokens
        stream: Enable streaming
        **kwargs: Additional OpenAI API parameters
    
    Returns:
        Chat completion response
    """
    config = get_llm_config()
    client = get_async_openai_client()
    
    return await client.chat.completions.create(
        model=config.model,
        messages=messages,
        temperature=temperature or config.temperature,
        max_tokens=max_tokens or config.max_tokens,
        stream=stream,
        **kwargs
    )
