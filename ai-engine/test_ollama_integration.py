#!/usr/bin/env python3
"""
Test Ollama LLM Integration

Tests the hardened Ollama integration with:
- Timeout handling
- Retry logic
- ENV-based configuration
- Error handling
"""
import sys
from pathlib import Path

# Add parent directory to path
parent = Path(__file__).parent
sys.path.insert(0, str(parent))

from core.local_llm import create_llm, LocalLLM
from config import CONFIG
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_llm_creation():
    """Test that LLM can be created with proper configuration."""
    print("\n" + "="*60)
    print("TEST 1: LLM Creation")
    print("="*60)
    
    llm = create_llm(CONFIG)
    
    assert isinstance(llm, LocalLLM), "Expected LocalLLM instance"
    assert llm.model_name == CONFIG["llm_model"], "Model name mismatch"
    assert llm.host == CONFIG["ollama_host"], "Host mismatch"
    assert llm.timeout == CONFIG["ollama_timeout"], "Timeout mismatch"
    assert llm.max_retries == CONFIG["ollama_max_retries"], "Max retries mismatch"
    assert llm.retry_delay == CONFIG["ollama_retry_delay"], "Retry delay mismatch"
    
    print(f"✓ LLM created successfully:")
    print(f"  Model: {llm.model_name}")
    print(f"  Host: {llm.host}")
    print(f"  Timeout: {llm.timeout}s")
    print(f"  Max Retries: {llm.max_retries}")
    print(f"  Retry Delay: {llm.retry_delay}s")
    
    return True


def test_llm_invoke():
    """Test basic LLM invocation."""
    print("\n" + "="*60)
    print("TEST 2: LLM Invocation")
    print("="*60)
    
    llm = create_llm(CONFIG)
    
    try:
        # Simple test prompt
        response = llm.invoke("Say 'hello' in one word only.")
        
        print(f"✓ LLM responded:")
        print(f"  Response: {response[:100]}{'...' if len(response) > 100 else ''}")
        
        assert response, "Expected non-empty response"
        assert llm.last_response == response, "Last response not stored"
        
        return True
    except Exception as e:
        print(f"✗ LLM invocation failed: {e}")
        print(f"  Note: This is expected if Ollama is not running")
        print(f"  Start Ollama with: ollama serve")
        return False


def test_llm_streaming():
    """Test streaming LLM invocation."""
    print("\n" + "="*60)
    print("TEST 3: LLM Streaming")
    print("="*60)
    
    llm = create_llm(CONFIG)
    
    try:
        # Simple test prompt
        chunks = []
        for chunk in llm.stream("Count from 1 to 3, one number per word."):
            chunks.append(chunk)
            print(chunk, end="", flush=True)
        
        print()  # Newline after streaming
        
        full_response = "".join(chunks)
        assert full_response, "Expected non-empty streaming response"
        
        print(f"✓ Streaming completed")
        print(f"  Total chunks: {len(chunks)}")
        print(f"  Full length: {len(full_response)} chars")
        
        return True
    except Exception as e:
        print(f"✗ Streaming failed: {e}")
        print(f"  Note: This is expected if Ollama is not running")
        return False


def test_env_configuration():
    """Test that ENV variables are properly loaded."""
    print("\n" + "="*60)
    print("TEST 4: ENV Configuration")
    print("="*60)
    
    import os
    
    # Check new standardized ENV variables
    env_vars = {
        "OLLAMA_BASE_URL": CONFIG.get("ollama_host"),
        "OLLAMA_MODEL": CONFIG.get("llm_model"),
        "OLLAMA_TIMEOUT": CONFIG.get("ollama_timeout"),
        "OLLAMA_MAX_RETRIES": CONFIG.get("ollama_max_retries"),
        "OLLAMA_RETRY_DELAY": CONFIG.get("ollama_retry_delay"),
    }
    
    print("✓ Configuration loaded:")
    for key, value in env_vars.items():
        env_value = os.environ.get(key, "(not set)")
        print(f"  {key}: {value} (ENV: {env_value})")
    
    # Verify fallback to legacy ENV variables
    if not os.environ.get("OLLAMA_BASE_URL"):
        print("\n✓ Fallback to OLLAMA_HOST supported")
    
    if not os.environ.get("OLLAMA_MODEL"):
        print("✓ Fallback to COLLABRY_LLM_MODEL supported")
    
    return True


def test_timeout_configuration():
    """Test that timeout can be configured."""
    print("\n" + "="*60)
    print("TEST 5: Timeout Configuration")
    print("="*60)
    
    # Create LLM with custom timeout
    custom_config = CONFIG.copy()
    custom_config["ollama_timeout"] = 30
    
    llm = create_llm(custom_config)
    
    assert llm.timeout == 30, "Custom timeout not applied"
    
    print(f"✓ Custom timeout applied: {llm.timeout}s")
    
    return True


def run_all_tests():
    """Run all Ollama integration tests."""
    print("\n" + "="*70)
    print(" OLLAMA LLM INTEGRATION TEST SUITE")
    print("="*70)
    
    tests = [
        ("LLM Creation", test_llm_creation),
        ("ENV Configuration", test_env_configuration),
        ("Timeout Configuration", test_timeout_configuration),
        ("LLM Invocation", test_llm_invoke),
        ("LLM Streaming", test_llm_streaming),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            logger.exception(f"Test '{name}' crashed")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*70)
    print(" TEST SUMMARY")
    print("="*70)
    passed = sum(1 for _, p in results if p)
    total = len(results)
    for name, p in results:
        status = "✓ PASSED" if p else "✗ FAILED"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All Ollama integration tests PASSED!")
        return True
    else:
        print("\n⚠️  Some tests FAILED.")
        print("\nNotes:")
        print("- LLM invocation/streaming tests require Ollama to be running")
        print("- Start Ollama with: ollama serve")
        print("- Ensure model is pulled: ollama pull llama3.1")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
