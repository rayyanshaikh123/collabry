"""
Test script for LLM provider abstraction.

This script tests the provider abstraction layer to ensure both Ollama and OpenAI
providers work correctly and return consistent response formats.

Usage:
    python test_provider.py
"""

import sys
sys.path.insert(0, '.')  # Add current directory to path

from llm import create_llm_provider, Message

def test_ollama_provider():
    """Test Ollama provider with local model."""
    print("\n" + "="*60)
    print("TESTING OLLAMA PROVIDER")
    print("="*60 + "\n")

    try:
        llm = create_llm_provider(
            provider_type="ollama",
            model="llama3.2:3b",
            temperature=0.7,
            max_tokens=100
        )

        print(f"✓ Provider created: {llm.__class__.__name__}")
        print(f"✓ Model: {llm.model}")
        print(f"✓ Temperature: {llm.temperature}")
        print(f"✓ Max tokens: {llm.max_tokens}\n")

        # Test generation
        print("Testing generation...")
        messages = [Message(role="user", content="Say hello in one sentence")]

        response = llm.generate(messages)

        print(f"✓ Generated response:")
        print(f"  Content: {response.content}")
        print(f"  Finish reason: {response.finish_reason}")
        print(f"  Tokens used: {response.usage}")

        # Test streaming
        print("\n Testing streaming...")
        print("  Stream output: ", end="", flush=True)

        for token in llm.stream(messages):
            print(token, end="", flush=True)

        print("\n\n✅ Ollama provider test PASSED")
        return True

    except Exception as e:
        print(f"\n❌ Ollama provider test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_openai_provider():
    """Test OpenAI provider (requires API key)."""
    print("\n" + "="*60)
    print("TESTING OPENAI PROVIDER")
    print("="*60 + "\n")

    import os
    api_key = os.environ.get("OPENAI_API_KEY")

    if not api_key:
        print("⚠️  SKIPPED: No OPENAI_API_KEY environment variable set")
        return None

    try:
        llm = create_llm_provider(
            provider_type="openai",
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=100,
            api_key=api_key
        )

        print(f"✓ Provider created: {llm.__class__.__name__}")
        print(f"✓ Model: {llm.model}")
        print(f"✓ Temperature: {llm.temperature}")
        print(f"✓ Max tokens: {llm.max_tokens}\n")

        # Test generation
        print("Testing generation...")
        messages = [Message(role="user", content="Say hello in one sentence")]

        response = llm.generate(messages)

        print(f"✓ Generated response:")
        print(f"  Content: {response.content}")
        print(f"  Finish reason: {response.finish_reason}")
        print(f"  Tokens used: {response.usage}")

        # Test streaming
        print("\nTesting streaming...")
        print("  Stream output: ", end="", flush=True)

        for token in llm.stream(messages):
            print(token, end="", flush=True)

        print("\n\n✅ OpenAI provider test PASSED")
        return True

    except Exception as e:
        print(f"\n❌ OpenAI provider test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("LLM PROVIDER ABSTRACTION TESTS")
    print("="*60)

    results = {
        "ollama": test_ollama_provider(),
        "openai": test_openai_provider()
    }

    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60 + "\n")

    for provider, result in results.items():
        if result is True:
            print(f"✅ {provider.upper()}: PASSED")
        elif result is False:
            print(f"❌ {provider.upper()}: FAILED")
        else:
            print(f"⚠️  {provider.upper()}: SKIPPED")

    # Overall result
    failed = [p for p, r in results.items() if r is False]
    if failed:
        print(f"\n❌ FAILURE: {len(failed)} test(s) failed")
        sys.exit(1)
    else:
        print("\n✅ SUCCESS: All tests passed")
        sys.exit(0)


if __name__ == "__main__":
    main()
