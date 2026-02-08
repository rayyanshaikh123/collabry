# AI Engine Integration Tests

Comprehensive integration tests for the refactored COLLABRY AI engine.

## Test Coverage

- **test_providers.py** - LLM provider abstraction (Ollama, OpenAI)
- **test_tools.py** - Tool registry and execution
- **test_agents.py** - Agent system (Planner, Conversation, Artifact)
- **test_rag.py** - RAG pipeline without LangChain
- **test_e2e.py** - End-to-end chat flows

## Prerequisites

### Required
- **Python 3.8+**
- **Ollama** - Install from https://ollama.ai
- **llama3.2:3b model** - Pull with: `ollama pull llama3.2:3b`

### Optional
- **OpenAI API Key** - For testing OpenAI provider (set `OPENAI_API_KEY` env var)

## Installation

Install test dependencies:

```bash
cd ai-engine
pip install -r requirements.txt
pip install pytest pytest-asyncio
```

## Running Tests

### Run all tests
```bash
pytest tests/ -v
```

### Run specific test file
```bash
pytest tests/test_providers.py -v
```

### Run specific test class or function
```bash
pytest tests/test_providers.py::TestOllamaProvider -v
pytest tests/test_agents.py::TestPlannerAgent::test_planner_agent_streaming -v
```

### Skip slow tests
```bash
pytest tests/ -v -m "not slow"
```

### Skip OpenAI tests (if no API key)
```bash
pytest tests/ -v -m "not openai"
```

### Run with output (print statements visible)
```bash
pytest tests/ -v -s
```

### Run with coverage
```bash
pytest tests/ --cov=. --cov-report=html
```

## Test Markers

Tests are automatically marked based on their requirements:

- `@pytest.mark.ollama` - Requires Ollama instance
- `@pytest.mark.openai` - Requires OpenAI API key
- `@pytest.mark.slow` - Takes longer to run (e2e, performance tests)

## Environment Variables

Configure tests via environment variables:

```bash
export OLLAMA_BASE_URL=http://localhost:11434
export OPENAI_API_KEY=sk-...  # Optional
export LLM_PROVIDER=ollama
export LLM_MODEL=llama3.2:3b
```

## Test Structure

### Provider Tests
- Basic generation (blocking)
- Streaming generation
- JSON mode
- Response format consistency

### Tool Tests
- Tool discovery and registration
- Tool execution
- Error handling
- Individual tool functionality

### Agent Tests
- Agent initialization
- Simple responses
- Streaming responses
- Tool loop execution
- Memory persistence
- Artifact generation (quiz, flashcards, mindmap)

### RAG Tests
- Embedding generation
- Text splitting
- Document loading
- Vector store operations
- Similarity search
- Metadata filtering
- User isolation
- Persistence (save/load)

### E2E Tests
- Complete chat flows
- Multi-turn conversations
- RAG integration
- Artifact generation flows
- Provider switching
- Error handling
- Performance characteristics

## Expected Results

All tests should pass with Ollama running locally:

```
tests/test_providers.py ................ [25%]
tests/test_tools.py .................... [50%]
tests/test_agents.py ................... [70%]
tests/test_rag.py ...................... [85%]
tests/test_e2e.py ...................... [100%]

======================== XX passed in X.XXs ========================
```

## Troubleshooting

### Ollama not available
```
Error: Ollama not available at http://localhost:11434
```
**Solution**: Start Ollama with `ollama serve`

### Model not found
```
Error: model 'llama3.2:3b' not found
```
**Solution**: Pull model with `ollama pull llama3.2:3b`

### Import errors
```
ModuleNotFoundError: No module named 'llm'
```
**Solution**: Run tests from ai-engine directory: `cd ai-engine && pytest tests/`

### OpenAI tests failing
```
pytest tests/ -v -m "not openai"
```
**Solution**: Skip OpenAI tests if you don't have an API key

### Slow tests timing out
```
pytest tests/ -v -m "not slow"
```
**Solution**: Skip slow e2e tests for faster iteration

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: AI Engine Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Install Ollama
      run: curl https://ollama.ai/install.sh | sh

    - name: Pull model
      run: ollama pull llama3.2:3b

    - name: Install dependencies
      run: |
        cd ai-engine
        pip install -r requirements.txt
        pip install pytest pytest-asyncio

    - name: Run tests
      run: |
        cd ai-engine
        pytest tests/ -v -m "not openai"
```

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure all existing tests pass
3. Add tests for new components
4. Update this README if needed

## Test Philosophy

- **Integration tests, not unit tests** - Test components working together
- **Real LLM calls** - Use actual Ollama/OpenAI (not mocks)
- **Fast feedback** - Most tests complete in seconds
- **Comprehensive coverage** - Test happy paths AND error cases
- **Provider agnostic** - Tests work with Ollama or OpenAI
