"""
Integration tests for LLM providers.

Tests both Ollama and OpenAI providers to ensure they work correctly
and return consistent output formats.
"""

import pytest
import os
from llm import create_llm_provider, Message, LLMResponse


class TestOllamaProvider:
    """Test Ollama provider functionality."""

    @pytest.fixture
    def ollama_provider(self):
        """Create Ollama provider instance."""
        return create_llm_provider(
            provider_type="ollama",
            model="llama3.2:3b",
            temperature=0.7,
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        )

    def test_ollama_generation(self, ollama_provider):
        """Test basic generation with Ollama."""
        messages = [Message(role="user", content="Say 'Hello, World!' and nothing else.")]

        response = ollama_provider.generate(messages)

        assert isinstance(response, LLMResponse)
        assert response.content is not None
        assert len(response.content) > 0
        assert response.finish_reason in ["stop", "length"]
        print(f"✓ Ollama generation: {response.content[:50]}")

    def test_ollama_streaming(self, ollama_provider):
        """Test streaming generation with Ollama."""
        messages = [Message(role="user", content="Count from 1 to 5.")]

        tokens = []
        for token in ollama_provider.stream(messages):
            tokens.append(token)

        full_response = "".join(tokens)

        assert len(tokens) > 0
        assert len(full_response) > 0
        print(f"✓ Ollama streaming: {len(tokens)} tokens, {len(full_response)} chars")

    def test_ollama_json_mode(self, ollama_provider):
        """Test JSON mode generation with Ollama."""
        messages = [
            Message(role="system", content="You must respond with valid JSON only."),
            Message(role="user", content='Generate JSON: {"greeting": "hello"}')
        ]

        response = ollama_provider.generate(
            messages,
            response_format={"type": "json_object"}
        )

        assert isinstance(response, LLMResponse)
        assert "{" in response.content
        print(f"✓ Ollama JSON mode: {response.content[:100]}")


class TestOpenAIProvider:
    """Test OpenAI provider functionality."""

    @pytest.fixture
    def openai_provider(self):
        """Create OpenAI provider instance."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            pytest.skip("OPENAI_API_KEY not set")

        return create_llm_provider(
            provider_type="openai",
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=api_key
        )

    def test_openai_generation(self, openai_provider):
        """Test basic generation with OpenAI."""
        messages = [Message(role="user", content="Say 'Hello, World!' and nothing else.")]

        response = openai_provider.generate(messages)

        assert isinstance(response, LLMResponse)
        assert response.content is not None
        assert len(response.content) > 0
        assert response.finish_reason in ["stop", "length"]
        assert response.usage["prompt_tokens"] > 0
        assert response.usage["completion_tokens"] > 0
        print(f"✓ OpenAI generation: {response.content[:50]}")

    def test_openai_streaming(self, openai_provider):
        """Test streaming generation with OpenAI."""
        messages = [Message(role="user", content="Count from 1 to 5.")]

        tokens = []
        for token in openai_provider.stream(messages):
            tokens.append(token)

        full_response = "".join(tokens)

        assert len(tokens) > 0
        assert len(full_response) > 0
        print(f"✓ OpenAI streaming: {len(tokens)} tokens, {len(full_response)} chars")

    def test_openai_json_mode(self, openai_provider):
        """Test JSON mode generation with OpenAI."""
        messages = [
            Message(role="system", content="You must respond with valid JSON only."),
            Message(role="user", content='Generate JSON: {"greeting": "hello"}')
        ]

        response = openai_provider.generate(
            messages,
            response_format={"type": "json_object"}
        )

        assert isinstance(response, LLMResponse)
        assert "{" in response.content
        print(f"✓ OpenAI JSON mode: {response.content[:100]}")


class TestProviderConsistency:
    """Test that both providers return consistent formats."""

    def test_response_format_consistency(self):
        """Test that both providers return same LLMResponse structure."""
        ollama = create_llm_provider("ollama", model="llama3.2:3b")

        messages = [Message(role="user", content="Say hi")]

        ollama_response = ollama.generate(messages)

        # Verify structure
        assert hasattr(ollama_response, "content")
        assert hasattr(ollama_response, "finish_reason")
        assert hasattr(ollama_response, "usage")
        assert hasattr(ollama_response, "tool_calls")

        # If OpenAI key available, test it too
        if os.getenv("OPENAI_API_KEY"):
            openai = create_llm_provider("openai", model="gpt-4o-mini")
            openai_response = openai.generate(messages)

            assert type(ollama_response) == type(openai_response)
            print("✓ Both providers return consistent LLMResponse structure")
        else:
            print("✓ Ollama provider returns correct LLMResponse structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
