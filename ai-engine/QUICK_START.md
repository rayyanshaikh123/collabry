# Quick Start Guide - Refactored AI Engine

## For Developers

This guide helps you get started with the refactored AI engine.

## Prerequisites

- Python 3.8+
- Ollama installed (or OpenAI API key)
- MongoDB running

## Installation

1. **Install Ollama** (for local inference)
```bash
curl https://ollama.ai/install.sh | sh
ollama pull llama3.2:3b
ollama serve
```

2. **Install Python dependencies**
```bash
cd ai-engine
pip install -r requirements.txt
```

3. **Set environment variables**
```bash
# Required
export LLM_PROVIDER=ollama
export LLM_MODEL=llama3.2:3b
export MONGO_URI=mongodb://localhost:27017

# Optional
export OPENAI_API_KEY=sk-...  # If using OpenAI
export OLLAMA_BASE_URL=http://localhost:11434
```

4. **Start the server**
```bash
uvicorn server.main:app --reload --port 8000
```

## Usage Examples

### 1. Creating an LLM Provider

```python
from llm import create_llm_provider, Message

# Create provider (automatically uses env config)
llm = create_llm_provider(
    provider_type="ollama",  # or "openai"
    model="llama3.2:3b",
    temperature=0.7
)

# Generate response
messages = [Message(role="user", content="Hello!")]
response = llm.generate(messages)
print(response.content)

# Stream response
for token in llm.stream(messages):
    print(token, end="", flush=True)
```

### 2. Using the Planner Agent

```python
from llm import create_llm_provider
from agents.planner_agent import PlannerAgent
from core.memory import MemoryManager
from core.rag_retriever import RAGRetriever
from config import CONFIG

# Create components
llm = create_llm_provider("ollama", model="llama3.2:3b")
memory = MemoryManager(user_id="user123", session_id="session456")
rag = RAGRetriever(CONFIG, user_id="user123")

# Create agent
agent = PlannerAgent(
    llm_provider=llm,
    memory=memory,
    rag_retriever=rag
)

# Non-streaming
response = agent.execute("What is photosynthesis?", session_id="session456")
print(response)

# Streaming
for token in agent.execute_stream("Explain quantum mechanics", session_id="session456"):
    print(token, end="", flush=True)
```

### 3. Generating Artifacts

```python
from llm import create_llm_provider
from agents.artifact_agent import ArtifactAgent

llm = create_llm_provider("ollama", model="llama3.2:3b")
agent = ArtifactAgent(llm_provider=llm)

# Generate quiz
quiz = agent.generate(
    artifact_type="quiz",
    content="Photosynthesis is the process...",
    options={"num_questions": 5, "difficulty": "medium"}
)
print(quiz["questions"])

# Generate flashcards
flashcards = agent.generate(
    artifact_type="flashcards",
    content="Newton's laws of motion...",
    options={"num_cards": 10}
)
print(flashcards["flashcards"])

# Generate mindmap
mindmap = agent.generate(
    artifact_type="mindmap",
    content="The solar system",
    options={"depth": 3}
)
print(mindmap["root"])
```

### 4. Using RAG (Document Retrieval)

```python
from core.rag_retriever import RAGRetriever
from core.rag.vector_store import Document
from config import CONFIG

# Create retriever
rag = RAGRetriever(CONFIG, user_id="user123")

# Add documents
docs = [
    Document(
        page_content="Photosynthesis occurs in chloroplasts...",
        metadata={"source": "biology_textbook.pdf", "page": 42}
    )
]
rag.add_user_documents(docs, user_id="user123")

# Search documents
results = rag.get_relevant_documents(
    query="How does photosynthesis work?",
    user_id="user123",
    k=3
)

for doc in results:
    print(f"Source: {doc.metadata['source']}")
    print(f"Content: {doc.page_content[:200]}")
```

### 5. Creating a Custom Tool

Create `tools/my_custom_tool.py`:

```python
from tools.base_tool import BaseTool

class MyCustomTool(BaseTool):
    def __init__(self):
        self.name = "my_custom_tool"
        self.description = "My custom tool that does something useful"
        self.parameters_schema = {
            "type": "object",
            "properties": {
                "input_text": {
                    "type": "string",
                    "description": "The input text to process"
                }
            },
            "required": ["input_text"]
        }

    def execute(self, input_text: str):
        """Execute the tool."""
        try:
            # Your custom logic here
            result = input_text.upper()

            return {
                "success": True,
                "data": {"processed": result},
                "error": None
            }
        except Exception as e:
            return {
                "success": False,
                "data": None,
                "error": str(e)
            }

# Factory function for auto-discovery
def get_tool():
    return MyCustomTool()
```

The tool will be auto-discovered and registered!

### 6. Using the Tool Registry

```python
from tools.registry import tool_registry

# List all tools
tools = tool_registry.get_all_tools()
print([tool.name for tool in tools])

# Get tool definitions (for LLM)
definitions = tool_registry.get_tool_definitions()

# Execute a tool
result = tool_registry.execute(
    "web_search",
    query="Python programming"
)
print(result["data"])
```

## Switching Providers

### Use Ollama (Local, Free)
```bash
export LLM_PROVIDER=ollama
export LLM_MODEL=llama3.2:3b
export OLLAMA_BASE_URL=http://localhost:11434
```

### Use OpenAI (Cloud, Paid)
```bash
export LLM_PROVIDER=openai
export LLM_MODEL=gpt-4o-mini
export OPENAI_API_KEY=sk-...
```

No code changes needed - just restart the server!

## Testing

### Run all tests
```bash
pytest tests/ -v
```

### Run specific test suite
```bash
pytest tests/test_agents.py -v
```

### Skip slow tests
```bash
pytest tests/ -v -m "not slow"
```

## Common Patterns

### 1. Chat with Memory
```python
# Create memory for session
memory = MemoryManager(user_id="user123", session_id="chat_session")

# Agent uses memory automatically
agent = PlannerAgent(llm_provider=llm, memory=memory)

# First message
agent.execute("My name is Alice", session_id="chat_session")

# Second message (remembers name)
agent.execute("What is my name?", session_id="chat_session")
```

### 2. Chat with RAG
```python
# Agent with RAG retriever
agent = PlannerAgent(
    llm_provider=llm,
    memory=memory,
    rag_retriever=rag
)

# When user asks about documents, agent uses RAG tool automatically
response = agent.execute(
    "What does my biology textbook say about photosynthesis?",
    session_id="session"
)
```

### 3. Streaming Response to Frontend
```python
async def chat_stream_endpoint(request: ChatRequest):
    async def event_generator():
        agent = create_planner_agent()

        for token in agent.execute_stream(request.message):
            yield f"data: {token}\n\n"

        yield f"event: done\ndata: \n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

## Debugging

### Enable debug logging
```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("agents")
logger.setLevel(logging.DEBUG)
```

### Check tool execution
```python
# See what tools are available
from tools.registry import tool_registry
print([t.name for t in tool_registry.get_all_tools()])

# Test tool directly
result = tool_registry.execute("rag_search", query="test")
print(result)
```

### Inspect agent decisions
```python
# Agent logs reasoning in DEBUG mode
agent.execute("Test message")
# Check logs for AgentAction JSON output
```

## Configuration

Edit `config.py` or use environment variables:

```python
# LLM Provider
LLM_PROVIDER=ollama  # or openai
LLM_MODEL=llama3.2:3b
TEMPERATURE=0.7
MAX_TOKENS=2000

# Ollama
OLLAMA_BASE_URL=http://localhost:11434

# OpenAI
OPENAI_API_KEY=sk-...

# RAG
EMBEDDING_MODEL=all-MiniLM-L6-v2
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
RETRIEVAL_TOP_K=3

# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB=collabry
```

## Best Practices

1. **Always use the factory**: `create_llm_provider()` instead of direct imports
2. **Use agents, not direct LLM calls**: Agents handle memory, tools, etc.
3. **Let tools be discovered**: Use `get_tool()` pattern for auto-registration
4. **Stream responses**: Better UX with `execute_stream()`
5. **Test with Ollama first**: Free, local, fast iteration
6. **Use structured output**: AgentAction schema prevents parsing errors

## Troubleshooting

### Ollama not found
```bash
Error: Connection refused to localhost:11434
```
**Fix**: Start Ollama with `ollama serve`

### Model not available
```bash
Error: model 'llama3.2:3b' not found
```
**Fix**: Pull model with `ollama pull llama3.2:3b`

### Import errors
```bash
ModuleNotFoundError: No module named 'llm'
```
**Fix**: Ensure you're in ai-engine directory and installed requirements

### Agent not using tools
**Fix**: Check tool registry initialization:
```python
from tools.registry import tool_registry
print([t.name for t in tool_registry.get_all_tools()])
```

## Help & Support

- **Architecture docs**: See `REFACTORING_COMPLETE.md`
- **Test docs**: See `tests/README.md`
- **API docs**: Start server and visit `/docs`

## Next Steps

1. Read `REFACTORING_COMPLETE.md` for architecture overview
2. Explore `tests/` for usage examples
3. Try creating a custom tool
4. Experiment with different LLM providers
5. Build your own specialized agent

---

**Happy coding!** 🚀
