# Multi-User Isolation Architecture

## Overview

Collabry AI Core Engine implements enterprise-grade multi-user isolation with JWT-based authentication. Each user can have multiple chat sessions (like ChatGPT), with complete data isolation across:

- **Conversation Memory** (MongoDB)
- **RAG Document Retrieval** (FAISS with metadata filtering)
- **Session Management** (UUID-based sessions per user)

## Architecture Components

### 1. Thread ID Format

All conversations use a standardized thread format:
```
thread_id = "{user_id}:{session_id}"
```

**Example:**
```python
user_a_session1 = "user_a:d47f8a9c-1234-5678-9abc-def012345678"
user_a_session2 = "user_a:e58g9b0d-2345-6789-0bcd-ef1234567890"
user_b_session1 = "user_b:f69h0c1e-3456-7890-1cde-f23456789012"
```

### 2. Memory Isolation (`core/memory.py`)

**Key Features:**
- Enforced user_id requirement in constructor
- MongoDB persistence with user_id indexing
- Session management (list/create/switch)
- Permission checks prevent cross-user access

**API:**
```python
from core.memory import MemoryManager

# Initialize with user context
memory = MemoryManager(user_id="user_123", session_id="session_abc")

# List all sessions for current user
sessions = memory.list_user_sessions()
# Returns: [{"session_id": "session_abc", "last_activity": "2024-01-15T10:30:00Z"}, ...]

# Create new session (generates UUID if not provided)
new_session_id = memory.create_session()  # Returns: "d47f8a9c-..."

# Switch to different session (same user only)
memory.switch_session("session_xyz")

# Cross-user access is BLOCKED
try:
    memory.set_thread("other_user:session_123")
except PermissionError:
    print("Cannot access other user's data")
```

**Thread Format Utilities:**
```python
from core.memory import format_thread_id, parse_thread_id

# Format thread_id
thread_id = format_thread_id("user_123", "session_abc")
# Returns: "user_123:session_abc"

# Parse thread_id
user_id, session_id = parse_thread_id("user_123:session_abc")
# Returns: ("user_123", "session_abc")
```

### 3. RAG Document Isolation (`core/rag_retriever.py`)

**Key Features:**
- User-specific document tagging with metadata
- Metadata-based filtering during retrieval
- Support for "public" documents accessible to all users
- Per-user document ingestion

**API:**
```python
from core.rag_retriever import RAGRetriever
from langchain_core.documents import Document

# Initialize with user context
rag = RAGRetriever(config, user_id="user_123")

# Retrieve documents (auto-filtered by user_id)
docs = rag.get_relevant_documents("quantum computing")
# Returns only documents where:
#   - metadata['user_id'] == "user_123" OR
#   - metadata['user_id'] == "public"

# Add user-specific documents
user_docs = [
    Document(
        page_content="User's private research notes...",
        metadata={"source": "research.txt"}
    )
]
rag.add_user_documents(user_docs, user_id="user_123", save_index=True)
```

**Document Metadata Structure:**
```python
{
    "user_id": "user_123",        # User who owns this document
    "source": "filename.txt",     # Original file name
    "chunk_index": 0,             # Chunk number (auto-generated)
    # ... other metadata
}
```

**Public Documents:**
- Default documents in `documents/` directory are tagged with `user_id="public"`
- All users can retrieve public documents
- Use for shared knowledge base, FAQs, documentation

### 4. Agent Creation (`core/agent.py`)

**User Context Injection:**
```python
from core.agent import create_agent

# Create agent with user context (REQUIRED)
agent, llm, tools, memory = create_agent(
    user_id="user_123",          # From JWT token
    session_id="session_abc",    # From request or new UUID
    config=CONFIG                # Optional config override
)

# Agent automatically initializes:
# - Memory with thread_id="user_123:session_abc"
# - RAG retriever filtered to user_123 + public docs
# - Tool access (tools are user-agnostic)

# Use agent
agent.handle_user_input_stream("Explain quantum entanglement", stream_printer)
```

## Security Model

### JWT Token Flow

```
1. Client → Backend: POST /chat with JWT token in Authorization header
2. Backend: Validate JWT → extract user_id (claims['sub'])
3. Backend: Get/create session_id from request or generate new UUID
4. Backend: create_agent(user_id, session_id)
5. Backend: agent.run(user_message)
6. Backend → Client: Stream response
```

**CRITICAL:** `user_id` MUST come from validated JWT token, NOT from client input.

### Permission Model

| Component | Isolation Level | Enforcement |
|-----------|----------------|-------------|
| **Memory** | User + Session | MongoDB query filters by user_id |
| **RAG** | User + Public | FAISS metadata filtering |
| **Tools** | None | Tools are user-agnostic (shared) |
| **Sessions** | User-scoped | User can only access their sessions |

### Attack Vectors Mitigated

✅ **Cross-User Memory Access:** Thread format enforces user_id, MongoDB indexes user_id  
✅ **Cross-User Document Retrieval:** FAISS metadata filtering blocks other users' docs  
✅ **Session Hijacking:** Permission checks in `set_thread()` validate user_id match  
✅ **Session Enumeration:** `list_user_sessions()` only returns current user's sessions  

## Database Schema

### MongoDB Collection: `conversations`

**Indexes:**
```javascript
db.conversations.createIndex({ "user_id": 1, "thread_id": 1, "timestamp": 1 })
db.conversations.createIndex({ "timestamp": -1 })
```

**Document Structure:**
```javascript
{
  "_id": ObjectId("..."),
  "user_id": "user_123",
  "thread_id": "user_123:session_abc",
  "timestamp": ISODate("2024-01-15T10:30:00Z"),
  "turn": {
    "user_message": "What is machine learning?",
    "assistant_message": "Machine learning is...",
    "metadata": {
      "tool_used": "web_search",
      "intent": "question"
    }
  }
}
```

**Query Patterns:**
```python
# Retrieve conversation history (with user isolation)
db.conversations.find({
    "user_id": "user_123",
    "thread_id": "user_123:session_abc"
}).sort("timestamp", 1).limit(50)

# List user's sessions
db.conversations.aggregate([
    {"$match": {"user_id": "user_123"}},
    {"$group": {
        "_id": "$thread_id",
        "last_activity": {"$max": "$timestamp"}
    }},
    {"$sort": {"last_activity": -1}}
])
```

### FAISS Index: `memory/faiss_index/`

**Metadata Stored Per Document:**
```python
{
    "user_id": "user_123" | "public",
    "source": "filename.txt",
    "chunk_index": 0,
    "timestamp": "2024-01-15T10:30:00Z"
}
```

**Retrieval Flow:**
1. User queries: "quantum computing"
2. FAISS retrieves top-k candidates (over-retrieve by 3x)
3. Filter results:
   - Keep if `metadata['user_id'] == user_id`
   - Keep if `metadata['user_id'] == "public"`
   - Discard all others
4. Return top-k after filtering

## Testing

### Running Multi-User Tests

```bash
# Full test suite
python scripts/test_multi_user_isolation.py

# Tests include:
# 1. Memory isolation (cross-user access blocked)
# 2. RAG document isolation (no data leakage)
# 3. Agent creation with user context
# 4. Session switching (same user only)
# 5. Public document access (all users)
```

**Expected Output:**
```
======================================================================
 COLLABRY AI CORE ENGINE - MULTI-USER ISOLATION TEST SUITE
======================================================================

============================================================
TEST 1: Memory Isolation
============================================================
✓ User A sessions:
  - session_1 (last activity: 2024-01-15T10:30:00Z)
  - session_2 (last activity: 2024-01-15T10:31:00Z)
✓ User B sessions:
  - session_1 (last activity: 2024-01-15T10:32:00Z)
✓ Correctly blocked: Cannot access thread 'user_b:session_1' (user_id mismatch)
✓ Memory isolation test PASSED

... (more tests)

======================================================================
 TEST SUMMARY
======================================================================
✓ PASSED: Memory Isolation
✓ PASSED: RAG Document Isolation
✓ PASSED: Agent Creation
✓ PASSED: Session Switching
✓ PASSED: Public Document Access

Total: 5/5 tests passed

🎉 All multi-user isolation tests PASSED!
```

### CLI Testing with Multiple Users

```bash
# User A, Session 1
python legacy_tools/main_cli.py --user alice --session work

# User A, Session 2 (different terminal)
python legacy_tools/main_cli.py --user alice --session personal

# User B, Session 1 (different terminal)
python legacy_tools/main_cli.py --user bob --session default
```

**CLI Commands:**
- `sessions` - List all sessions for current user
- `new session` - Create and switch to new session
- `switch <session_id>` - Switch to existing session
- `exit` - Quit

## Integration Guide

### FastAPI Example

```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from core.agent import create_agent
from config import CONFIG

app = FastAPI()
security = HTTPBearer()

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract and validate JWT token, return user_id."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@app.post("/chat")
async def chat(
    message: str,
    session_id: str = None,
    user_id: str = Depends(verify_token)
):
    """
    Chat endpoint with JWT-based user isolation.
    
    - user_id: Extracted from JWT token (NOT from request body)
    - session_id: Optional, generates UUID if not provided
    """
    if not session_id:
        from uuid import uuid4
        session_id = str(uuid4())
    
    # Create user-isolated agent
    agent, _, _, memory = create_agent(
        user_id=user_id,
        session_id=session_id,
        config=CONFIG
    )
    
    # Process message
    response = []
    def collector(chunk: str):
        response.append(chunk)
    
    agent.handle_user_input_stream(message, collector)
    
    return {
        "response": "".join(response),
        "user_id": user_id,
        "session_id": session_id,
        "thread_id": memory.thread_id
    }

@app.get("/sessions")
async def list_sessions(user_id: str = Depends(verify_token)):
    """List all sessions for the authenticated user."""
    from core.memory import MemoryManager
    memory = MemoryManager(user_id=user_id, session_id="temp")
    sessions = memory.list_user_sessions()
    return {"user_id": user_id, "sessions": sessions}
```

### cURL Examples

```bash
# Get JWT token (from your auth service)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Chat with default session
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is machine learning?"}'

# Chat with specific session
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Continue our discussion",
    "session_id": "d47f8a9c-1234-5678-9abc-def012345678"
  }'

# List sessions
curl -X GET http://localhost:8000/sessions \
  -H "Authorization: Bearer $TOKEN"
```

## Migration from Single-User

If you have existing single-user code:

### Before (Single-User):
```python
agent, llm, tools, memory = create_agent(CONFIG)
agent.handle_user_input("What is AI?")
```

### After (Multi-User):
```python
# Extract user_id from JWT token
user_id = jwt.decode(token)["sub"]
session_id = "default_session"  # or from request

agent, llm, tools, memory = create_agent(
    user_id=user_id,
    session_id=session_id,
    config=CONFIG
)
agent.handle_user_input("What is AI?")
```

**Breaking Changes:**
- `create_agent()` now REQUIRES `user_id` and `session_id` parameters
- `MemoryManager()` constructor requires `user_id` and `session_id`
- `RAGRetriever()` accepts optional `user_id` parameter for filtering

## Best Practices

### 1. User ID Source
✅ **DO:** Extract user_id from validated JWT token  
❌ **DON'T:** Accept user_id from request body or query params

### 2. Session Management
✅ **DO:** Generate UUIDs for new sessions  
✅ **DO:** Store session_id in client (localStorage/cookies)  
❌ **DON'T:** Use sequential IDs or predictable patterns

### 3. Public Documents
✅ **DO:** Tag shared documents with `user_id="public"`  
✅ **DO:** Use public docs for FAQs, documentation, policies  
❌ **DON'T:** Store sensitive info in public docs

### 4. Error Handling
✅ **DO:** Catch `PermissionError` for cross-user access attempts  
✅ **DO:** Log security violations for monitoring  
❌ **DON'T:** Expose internal user_ids in error messages

### 5. Performance
✅ **DO:** Use MongoDB indexes on (user_id, thread_id, timestamp)  
✅ **DO:** Limit conversation history to recent N messages  
✅ **DO:** Cache FAISS index in memory (don't rebuild per request)

## Troubleshooting

### "Cannot access thread 'user_x:session_y' (user_id mismatch)"
**Cause:** Attempting to access another user's session  
**Fix:** Verify JWT token extraction and session_id generation

### "No documents found in RAG retrieval"
**Cause:** User has no documents, or documents not tagged with user_id  
**Fix:** Check document metadata, ensure `user_id` field exists

### "MongoDB connection refused"
**Cause:** MongoDB service not running  
**Fix:** Start MongoDB: `net start MongoDB` (Windows) or `sudo systemctl start mongod` (Linux)

### "FAISS index empty after filtering"
**Cause:** Over-aggressive filtering or no public documents  
**Fix:** Verify document ingestion, check `user_id` metadata values

## Monitoring & Logging

```python
import logging

# Enable detailed logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("collabry")

# Key events to monitor:
# - User session creation
# - Cross-user access attempts (PermissionError)
# - RAG document retrieval counts
# - MongoDB query performance

# Example log output:
# INFO:core.memory:✓ Memory thread_id set to: user_123:session_abc
# INFO:core.rag_retriever:✓ RAG retriever initialized with user isolation: user_id=user_123
# WARNING:core.memory:⚠️  Blocked cross-user access: user_123 → user_456:session_xyz
```

## Future Enhancements

- [ ] Role-based access control (admin, teacher, student)
- [ ] Shared sessions (group chats with multiple users)
- [ ] Document sharing between users (explicit permissions)
- [ ] Session expiration policies (auto-cleanup old sessions)
- [ ] Rate limiting per user
- [ ] User quotas (message limits, document storage)

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-15  
**Author:** Collabry AI Team
