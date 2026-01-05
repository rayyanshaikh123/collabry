# Study Copilot API Quick Reference

## What is Study Copilot?

Collabry Study Copilot is a pedagogical AI learning assistant that helps students master concepts through:
- **Step-by-step explanations** with examples and analogies
- **Clarifying questions** when context is unclear
- **Follow-up questions** to encourage active learning
- **Source citation** (no hallucination)
- **Concept extraction** and structured summaries

📖 **See [STUDY_COPILOT.md](STUDY_COPILOT.md) for complete pedagogical documentation**

---

## FastAPI Server (Recommended)

**Start server:**
```bash
python run_server.py              # Production
python run_server.py --reload     # Development (auto-reload)
python run_server.py --host 0.0.0.0 --port 8080  # Custom
```

**Access:**
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health
- Root: http://localhost:8000/

**Endpoints:**
- POST /ai/chat - Conversational AI
- POST /ai/chat/stream - Streaming chat (SSE)
- POST /ai/upload - Document upload for RAG
- POST /ai/summarize - Text summarization
- POST /ai/qa - Question answering with RAG
- POST /ai/mindmap - Mind map generation
- GET /ai/sessions - List user sessions
- POST /ai/sessions - Create new session

**Authentication:** All endpoints require JWT Bearer token (except /health and /)

📖 **See [FASTAPI_ARCHITECTURE.md](FASTAPI_ARCHITECTURE.md) for complete server documentation**

---

## Environment Setup

**REQUIRED:** Create `.env` file from template:
```bash
cp .env.example .env
# Edit .env with your values
```

**Minimum required variables:**
```bash
MONGO_URI=mongodb://localhost:27017
OLLAMA_BASE_URL=http://localhost:11434
JWT_SECRET_KEY=your-secret-key-change-in-production
```

**Optional but recommended:**
```bash
SERPER_API_KEY=your-serper-api-key-for-better-search
STABLE_DIFFUSION_API=http://127.0.0.1:7860
```

See [.env.example](.env.example) for all available configuration options.

---

## Core Imports (Direct Usage)

```python
from core.agent import create_agent
from core.memory import MemoryManager, format_thread_id, parse_thread_id
from core.rag_retriever import RAGRetriever
from langchain_core.documents import Document
from config import CONFIG
```

## Agent Creation (Direct Usage)

```python
# Create user-isolated agent
agent, llm, tools, memory = create_agent(
    user_id="user_123",          # REQUIRED: From JWT token
    session_id="session_abc",    # REQUIRED: From client or generate UUID
    config=CONFIG                # Optional: Override default config
)

# Process user message
agent.handle_user_input_stream(
    user_input="What is quantum computing?",
    on_token=lambda chunk: print(chunk, end="", flush=True)
)
```

## Memory Management

```python
# Initialize memory with user context
memory = MemoryManager(
    user_id="user_123",
    session_id="session_abc",
    llm=llm  # Optional
)

# Add messages
memory.add_user_message("What is AI?")
memory.add_assistant_message("AI stands for...")

# List all sessions for current user
sessions = memory.list_user_sessions()
# Returns: [{"session_id": "...", "thread_id": "...", "last_activity": "..."}]

# Create new session
new_session_id = memory.create_session()  # Auto-generates UUID
new_session_id = memory.create_session(session_id="custom_id")  # Custom ID

# Switch to different session (same user only)
memory.switch_session("session_xyz")

# Get conversation history
history = memory.get_recent(n=10)  # Last 10 messages
```

## Thread ID Format

```python
# Format thread_id from components
thread_id = format_thread_id("user_123", "session_abc")
# Returns: "user_123:session_abc"

# Parse thread_id to components
user_id, session_id = parse_thread_id("user_123:session_abc")
# Returns: ("user_123", "session_abc")

# Invalid format raises ValueError
try:
    parse_thread_id("invalid")
except ValueError as e:
    print(f"Error: {e}")
```

## RAG Document Retrieval

```python
# Initialize RAG with user context
rag = RAGRetriever(config=CONFIG, user_id="user_123")

# Retrieve documents (auto-filtered by user_id + public)
docs = rag.get_relevant_documents("quantum computing")
# Returns documents where:
#   metadata['user_id'] == "user_123" OR
#   metadata['user_id'] == "public"

# Add user-specific documents
user_docs = [
    Document(
        page_content="User's private notes...",
        metadata={"source": "notes.txt"}
    )
]
rag.add_user_documents(user_docs, user_id="user_123", save_index=True)

# Override user_id for specific query
docs = rag.get_relevant_documents("query", user_id="user_456")
```

## FastAPI Integration

```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from uuid import uuid4

app = FastAPI()
security = HTTPBearer()

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract user_id from JWT token."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/chat")
async def chat(message: str, session_id: str = None, user_id: str = Depends(verify_token)):
    """Chat endpoint with JWT-based authentication."""
    # Generate session_id if not provided
    if not session_id:
        session_id = str(uuid4())
    
    # Create user-isolated agent
    agent, _, _, memory = create_agent(user_id=user_id, session_id=session_id)
    
    # Process message
    response_chunks = []
    agent.handle_user_input_stream(message, lambda chunk: response_chunks.append(chunk))
    
    return {
        "response": "".join(response_chunks),
        "user_id": user_id,
        "session_id": session_id
    }

@app.get("/sessions")
async def list_sessions(user_id: str = Depends(verify_token)):
    """List all sessions for authenticated user."""
    memory = MemoryManager(user_id=user_id, session_id="temp")
    sessions = memory.list_user_sessions()
    return {"user_id": user_id, "sessions": sessions}

@app.post("/sessions")
async def create_session(user_id: str = Depends(verify_token)):
    """Create new session for authenticated user."""
    memory = MemoryManager(user_id=user_id, session_id="temp")
    new_session_id = memory.create_session()
    return {"session_id": new_session_id}
```

## Error Handling

```python
from pymongo.errors import ConnectionFailure

try:
    agent, llm, tools, memory = create_agent(user_id, session_id)
except ConnectionFailure as e:
    # MongoDB not available
    print(f"Database connection failed: {e}")
except PermissionError as e:
    # Cross-user access attempt
    print(f"Permission denied: {e}")
except ValueError as e:
    # Invalid thread_id format
    print(f"Invalid format: {e}")
```

## Security Best Practices

```python
# ✅ CORRECT: Extract user_id from JWT
payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
user_id = payload["sub"]
agent = create_agent(user_id=user_id, session_id=session_id)

# ❌ WRONG: Accept user_id from client
# user_id = request.json.get("user_id")  # NEVER DO THIS!
# agent = create_agent(user_id=user_id, session_id=session_id)

# ✅ CORRECT: Generate session_id server-side
session_id = str(uuid4())

# ⚠️  ACCEPTABLE: Accept session_id from client (for switching)
# session_id = request.json.get("session_id")
# (Still requires JWT validation for user_id)
```

## CLI Testing

```bash
# Start CLI with specific user/session
python legacy_tools/main_cli.py --user alice --session work

# Available commands in CLI:
# - sessions            : List all user's sessions
# - new session         : Create and switch to new session
# - switch <session_id> : Switch to existing session
# - exit                : Quit CLI
```

## MongoDB Queries

```python
from pymongo import MongoClient

client = MongoClient(CONFIG["mongo_uri"])
db = client[CONFIG["mongo_db"]]
collection = db[CONFIG["memory_collection"]]

# Get all messages for user in specific session
messages = collection.find({
    "user_id": "user_123",
    "thread_id": "user_123:session_abc"
}).sort("timestamp", 1)

# Get all sessions for user
sessions = collection.aggregate([
    {"$match": {"user_id": "user_123"}},
    {"$group": {
        "_id": "$thread_id",
        "last_activity": {"$max": "$timestamp"}
    }},
    {"$sort": {"last_activity": -1}}
])

# Delete user's specific session
collection.delete_many({
    "user_id": "user_123",
    "thread_id": "user_123:session_abc"
})

# Delete all data for user (GDPR compliance)
collection.delete_many({"user_id": "user_123"})
```

## Testing

```python
# Run multi-user isolation tests
# python scripts/test_multi_user_isolation.py

from scripts.test_multi_user_isolation import (
    test_memory_isolation,
    test_rag_isolation,
    test_agent_creation,
    test_session_switching,
    test_public_document_access
)

# Run individual tests
assert test_memory_isolation() == True
assert test_rag_isolation() == True
assert test_agent_creation() == True
```

## Configuration

```python
# Environment variables (override config.py defaults)
import os

os.environ["MONGO_URI"] = "mongodb://localhost:27017"
os.environ["MONGO_DB"] = "collabry"
os.environ["COLLABRY_LLM_MODEL"] = "llama3.1"
os.environ["OLLAMA_HOST"] = "http://localhost:11434"

# Access in code
from config import CONFIG

print(CONFIG["mongo_uri"])  # "mongodb://localhost:27017"
print(CONFIG["mongo_db"])   # "collabry"
print(CONFIG["llm_model"])  # "llama3.1"
```

## Common Patterns

### New User Registration
```python
def on_user_registration(user_id: str):
    """Initialize resources for new user."""
    # Create default session
    memory = MemoryManager(user_id=user_id, session_id="default")
    
    # Add welcome message
    memory.add_assistant_message(
        "Welcome to Collabry! I'm your AI study assistant."
    )
    
    return memory.thread_id
```

### Session List UI
```python
def get_session_list_for_ui(user_id: str):
    """Format sessions for frontend display."""
    memory = MemoryManager(user_id=user_id, session_id="temp")
    sessions = memory.list_user_sessions()
    
    return [
        {
            "id": s["session_id"],
            "name": f"Chat {i+1}",  # Or extract from first message
            "lastActive": s["last_activity"],
            "isCurrent": s["session_id"] == memory.session_id
        }
        for i, s in enumerate(sessions)
    ]
```

### Document Upload Per User
```python
def upload_user_document(user_id: str, file_content: str, filename: str):
    """Add document to user's RAG index."""
    rag = RAGRetriever(CONFIG, user_id=user_id)
    
    doc = Document(
        page_content=file_content,
        metadata={
            "source": filename,
            "uploaded_at": datetime.now().isoformat()
        }
    )
    
    rag.add_user_documents([doc], user_id=user_id, save_index=True)
```

### Streaming Response
```python
from fastapi.responses import StreamingResponse

@app.post("/chat/stream")
async def chat_stream(message: str, session_id: str, user_id: str = Depends(verify_token)):
    """Stream chat response in real-time."""
    agent, _, _, _ = create_agent(user_id=user_id, session_id=session_id)
    
    async def generate():
        chunks = []
        def collector(chunk):
            chunks.append(chunk)
        
        agent.handle_user_input_stream(message, collector)
        
        for chunk in chunks:
            yield f"data: {chunk}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

## Troubleshooting

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Check MongoDB connection
from pymongo import MongoClient
try:
    client = MongoClient(CONFIG["mongo_uri"], serverSelectionTimeoutMS=5000)
    client.server_info()  # Trigger connection
    print("✓ MongoDB connected")
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")

# Check FAISS index
from pathlib import Path
faiss_path = Path(CONFIG["faiss_index_path"])
if faiss_path.exists():
    print(f"✓ FAISS index found: {faiss_path}")
else:
    print(f"✗ FAISS index missing: {faiss_path}")

# Verify user isolation
memory_a = MemoryManager(user_id="user_a", session_id="test")
memory_b = MemoryManager(user_id="user_b", session_id="test")

try:
    memory_a.set_thread("user_b:test")
    print("✗ SECURITY ISSUE: Cross-user access allowed!")
except PermissionError:
    print("✓ Security check passed")
```

---

**Complete Documentation:** [MULTI_USER_ARCHITECTURE.md](MULTI_USER_ARCHITECTURE.md)  
**Implementation Details:** [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
