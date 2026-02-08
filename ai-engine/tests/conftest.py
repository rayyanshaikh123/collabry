"""
Pytest configuration and shared fixtures.

Provides common setup for all tests.
"""

import pytest
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture(scope="session")
def test_config():
    """Provide test configuration."""
    return {
        "llm_provider": "ollama",
        "llm_model": "llama3.2:3b",
        "ollama_base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        "openai_api_key": os.getenv("OPENAI_API_KEY"),
        "temperature": 0.7,
        "max_tokens": 2000,
        "embedding_model": "all-MiniLM-L6-v2",
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "retrieval_top_k": 3,
    }


@pytest.fixture(scope="session", autouse=True)
def check_ollama_available():
    """Check if Ollama is available before running tests."""
    import requests

    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    try:
        response = requests.get(f"{ollama_url}/api/tags", timeout=5)
        if response.status_code == 200:
            print(f"\n✓ Ollama available at {ollama_url}")
        else:
            print(f"\n⚠ Ollama returned status {response.status_code}")
    except requests.exceptions.RequestException:
        pytest.skip(f"Ollama not available at {ollama_url}. Start Ollama to run tests.")


def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "ollama: marks tests requiring Ollama (deselect with '-m \"not ollama\"')"
    )
    config.addinivalue_line(
        "markers", "openai: marks tests requiring OpenAI API key (deselect with '-m \"not openai\"')"
    )
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )


def pytest_collection_modifyitems(config, items):
    """Auto-mark tests based on names."""
    for item in items:
        # Mark tests requiring OpenAI
        if "openai" in item.nodeid.lower():
            item.add_marker(pytest.mark.openai)

        # Mark tests requiring Ollama
        if "ollama" in item.nodeid.lower():
            item.add_marker(pytest.mark.ollama)

        # Mark slow tests
        if "e2e" in item.nodeid.lower() or "performance" in item.nodeid.lower():
            item.add_marker(pytest.mark.slow)
