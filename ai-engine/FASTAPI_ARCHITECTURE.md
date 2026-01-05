# FastAPI Server Architecture

## Overview

The Collabry AI Core FastAPI server provides a production-ready REST API for multi-user AI interactions with JWT-based authentication, background task processing, and comprehensive study platform features.

## Server Structure

```
server/
├── main.py              # FastAPI app, middleware, exception handlers
├── deps.py              # JWT authentication dependencies
├── schemas.py           # Pydantic request/response models
└── routes/
    ├── __init__.py
    ├── chat.py          # Conversational AI endpoints
    ├── ingest.py        # Document upload & embedding
    ├── summarize.py     # Text summarization
    ├── qa.py            # Question answering with RAG
    └── mindmap.py       # Mind map generation
```

## Architecture Principles

### 1. **No CLI Usage**
- All routes are pure REST API endpoints
- No command-line interface invocation
- Direct Python function calls only

### 2. **JWT-Based Authentication**
- Every endpoint (except `/health` and `/`) requires JWT Bearer token
- User identity extracted from token `sub` claim
- User-isolated operations enforced

### 3. **Structured JSON Responses**
- All responses use Pydantic models
- Consistent error format across endpoints
- Timestamp and user_id in all responses

### 4. **Background Task Processing**
- Document ingestion runs in background
- Embedding generation async
- Task ID returned for status tracking

## Authentication Flow

### JWT Token Structure

```json
{
  "sub": "user_123",           // User ID (extracted by deps.get_current_user)
  "exp": 1234567890,           // Expiration timestamp
  "iat": 1234567890            // Issued at timestamp
}
```

### Token Validation

1. Client sends request with `Authorization: Bearer <token>` header
2. `deps.get_current_user()` dependency extracts and validates token
3. User ID (`sub` claim) passed to route handler
4. Route creates user-isolated agent/memory

### Creating Test Tokens (Development Only)

```python
from jose import jwt
from datetime import datetime, timedelta
from config import CONFIG

payload = {
    "sub": "user_123",
    "exp": datetime.utcnow() + timedelta(hours=1),
    "iat": datetime.utcnow()
}

token = jwt.encode(
    payload,
    CONFIG["jwt_secret_key"],
    algorithm=CONFIG["jwt_algorithm"]
)
```

## Endpoint Architecture

### Chat Endpoints (`routes/chat.py`)

**POST /ai/chat**
- Extracts `user_id` from JWT
- Generates or uses provided `session_id`
- Creates user-isolated agent: `create_agent(user_id, session_id)`
- Executes: `agent.handle_user_input_stream(message, callback)`
- Returns structured JSON with response and metadata

**POST /ai/chat/stream**
- Same flow as `/ai/chat`
- Returns Server-Sent Events (SSE) stream
- Chunks streamed as `data: <chunk>\n\n`
- Completion event: `event: done\ndata: <session_id>\n\n`

**GET /ai/sessions**
- Lists all sessions for current user
- Calls: `memory.list_user_sessions()`
- Returns session metadata (ID, last_activity)

**POST /ai/sessions**
- Creates new session for current user
- Calls: `memory.create_session()`
- Returns new `session_id`

### Document Ingestion (`routes/ingest.py`)

**POST /ai/upload**
- Extracts `user_id` from JWT
- Generates unique `task_id`
- Adds background task: `background_tasks.add_task(ingest_document_background, ...)`
- Returns immediately with `task_id` for tracking

**Background Task Flow:**
1. Create `RAGRetriever(CONFIG, user_id=user_id)`
2. Create `Document` with metadata (user_id, filename, upload timestamp)
3. Call `rag.add_user_documents([doc], user_id=user_id, save_index=True)`
4. Update task status (processing → completed/failed)

**GET /ai/upload/status/{task_id}**
- Checks background task status
- Verifies task belongs to current user
- Returns status (processing, completed, failed) with metadata

### Summarization (`routes/summarize.py`)

**POST /ai/summarize**
- Extracts `user_id` from JWT
- Creates temporary session for stateless operation
- Builds prompt with style instructions (concise/detailed/bullet)
- Calls: `agent.handle_user_input_stream(prompt, callback)`
- Returns summary with length statistics

### Question Answering (`routes/qa.py`)

**POST /ai/qa**
- Extracts `user_id` from JWT
- If `use_rag=True`: retrieves documents via `rag.get_relevant_documents()`
- Builds context from retrieved documents (top_k)
- Creates agent with user context
- Executes Q&A prompt with context
- Returns answer with source documents

### Mind Map Generation (`routes/mindmap.py`)

**POST /ai/mindmap**
- Extracts `user_id` from JWT
- If `use_documents=True`: retrieves relevant documents
- Builds hierarchical prompt with depth specification
- Calls agent to generate bullet-point structure
- Parses response into `MindMapNode` tree
- Returns structured graph data

## Error Handling

### Global Exception Handler
- Catches all unhandled exceptions
- Logs with full stack trace
- Returns standardized `ErrorResponse`:
  ```json
  {
    "error": "Internal server error",
    "detail": "Error description",
    "timestamp": "2026-01-05T12:00:00"
  }
  ```

### HTTP Status Codes
- `200 OK` - Success
- `401 Unauthorized` - Invalid/missing JWT token
- `403 Forbidden` - Access denied (wrong user)
- `404 Not Found` - Resource not found (e.g., task_id)
- `500 Internal Server Error` - Unhandled exception

## Background Task Management

### In-Memory Task Tracking
```python
ingestion_tasks = {
    "task_id_123": {
        "status": "processing",
        "user_id": "user_123",
        "filename": "document.txt",
        "started_at": datetime(...),
        "completed_at": datetime(...),  # Set on completion
        "error": "error message"        # Set on failure
    }
}
```

### Production Considerations
- Current implementation uses in-memory dict
- **For production**: Use Redis or MongoDB for task persistence
- **For distributed systems**: Use Celery or RQ task queue

## Middleware & Configuration

### CORS Middleware
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Production Setup:**
- Set `allow_origins` to specific frontend domains
- Example: `["https://app.collabry.com", "https://www.collabry.com"]`

### Startup/Shutdown Events

**Startup:**
1. Log configuration (MongoDB URI, Ollama host, JWT algorithm)
2. Verify MongoDB connection
3. Verify Ollama availability
4. Log startup success/warnings

**Shutdown:**
- Log graceful shutdown
- Close any open connections

## Health Check System

**GET /health**
- No authentication required
- Checks critical components:
  - MongoDB: Connection test with 2s timeout
  - Ollama: API availability check
- Returns component status map
- Overall status: `healthy` (all components OK) or `degraded` (issues detected)

**Example Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "components": {
    "mongodb": "healthy",
    "ollama": "healthy"
  },
  "timestamp": "2026-01-05T12:00:00"
}
```

## Multi-User Isolation

### Thread Format Enforcement
- All conversations use thread format: `"{user_id}:{session_id}"`
- Memory manager validates format
- Agent creation requires both `user_id` and `session_id`

### RAG Document Filtering
- FAISS vector store includes `user_id` metadata
- Retrieval filters by: `metadata["user_id"] == current_user OR metadata["public"] == True`
- No cross-user document access

### Permission Checks
- Every operation verifies user owns resource
- Example: Upload status check verifies `task["user_id"] == current_user`

## Performance Considerations

### Response Times
- Chat (non-streaming): ~2-5s (depends on LLM speed)
- Chat (streaming): First chunk ~0.5-1s
- Document upload: ~100ms (background processing)
- Summarization: ~1-3s
- Q&A with RAG: ~2-4s (includes retrieval)
- Mind map: ~3-5s

### Scaling Recommendations
1. **Horizontal scaling**: Run multiple uvicorn workers
   ```bash
   uvicorn server.main:app --workers 4
   ```

2. **Load balancing**: Use Nginx or cloud load balancer

3. **Caching**: Add Redis for:
   - Session metadata
   - Frequently accessed documents
   - Task status (replace in-memory dict)

4. **Database**: MongoDB with indexes on `user_id` and `thread_id`

5. **Rate limiting**: Add per-user rate limits (e.g., slowapi)

## Security Best Practices

### Production Checklist
- [ ] Change `JWT_SECRET_KEY` to strong random value
- [ ] Set specific `CORS allow_origins` (not "*")
- [ ] Enable HTTPS only (no HTTP)
- [ ] Add rate limiting per user
- [ ] Implement token refresh mechanism
- [ ] Add request size limits
- [ ] Enable request logging (with PII filtering)
- [ ] Use MongoDB authentication
- [ ] Restrict network access to MongoDB/Ollama
- [ ] Add input validation for all fields

### Environment Variables
- Never commit `.env` file (use `.env.example`)
- Rotate `JWT_SECRET_KEY` periodically
- Use strong `SERPER_API_KEY` protection

## Testing

### Unit Tests
- Test each route independently
- Mock `get_current_user` dependency
- Verify response schemas

### Integration Tests
- Full flow tests with real MongoDB
- Test authentication failure cases
- Test background task completion

### Load Tests
- Use `locust` or `artillery` for load testing
- Simulate concurrent users
- Measure response times under load

## API Documentation

### Auto-Generated Docs
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- Interactive testing interface
- Automatic schema validation

### Example cURL Requests

**Health Check:**
```bash
curl http://localhost:8000/health
```

**Chat (with JWT):**
```bash
curl -X POST http://localhost:8000/ai/chat \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is AI?", "stream": false}'
```

**Upload Document:**
```bash
curl -X POST http://localhost:8000/ai/upload \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Python is a programming language.",
    "filename": "python.txt",
    "metadata": {"category": "programming"}
  }'
```

## Deployment

### Docker Deployment
```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python", "run_server.py", "--host", "0.0.0.0"]
```

### Cloud Deployment
- **AWS**: ECS/Fargate with ALB
- **GCP**: Cloud Run with load balancer
- **Azure**: Container Instances with App Gateway
- **Heroku**: Use Procfile with uvicorn

### Environment Configuration
- Use cloud secret managers (AWS Secrets Manager, GCP Secret Manager)
- Set `JWT_SECRET_KEY` from secrets
- Configure MongoDB connection with authentication
- Use managed MongoDB (Atlas, DocumentDB)

## Monitoring

### Logging
- All routes log user_id and operation
- Exceptions logged with full stack trace
- Use structured logging (JSON format)

### Metrics to Track
- Request count by endpoint
- Response times (p50, p95, p99)
- Error rates by status code
- Active sessions per user
- Background task queue length
- MongoDB connection pool usage

### Recommended Tools
- **Logging**: ELK Stack, CloudWatch, Stackdriver
- **Metrics**: Prometheus + Grafana
- **Tracing**: Jaeger, OpenTelemetry
- **APM**: New Relic, DataDog, Sentry
