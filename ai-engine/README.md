# Collabry AI Engine

**Production-grade AI backend with LangChain, LiveKit voice tutoring, and multi-user RAG support.**

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                      AI-ENGINE (FastAPI Backend)                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │          server/main.py (FastAPI Application)                 │   │
│  │  • JWT Authentication Middleware (server/deps.py)            │   │
│  │  • Usage Tracking & Limits Middleware                        │   │
│  │  • CORS Configuration                                        │   │
│  └────┬─────────────────────────────────────────────────────────┘   │
│       │                                                              │
│  ┌────▼──────────────────── API ROUTES ─────────────────────────┐   │
│  │                                                               │   │
│  │  📝 /ai/chat         ──► Main chat endpoint                  │   │
│  │  📝 /ai/qa           ──► Question answering                  │   │
│  │  📝 /ai/summarize    ──► Document summarization              │   │
│  │  📝 /ai/mindmap      ──► Mind map generation                 │   │
│  │  📝 /ai/sessions     ──► Session management                  │   │
│  │  📤 /ai/upload       ──► Document ingestion (RAG)            │   │
│  │  📊 /ai/usage        ──► Usage analytics                     │   │
│  │  📚 /ai/studyplan    ──► Study plan generation               │   │
│  │                                                               │   │
│  │  🎙️ /voice/rooms     ──► Create LiveKit room                 │   │
│  │  🎙️ /voice/sessions  ──► Voice session management            │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────── CORE: AGENT LAYER ───────────────────────┐    │
│  │                                                              │    │
│  │  core/agent.py (LangChain-based, 334 lines)                 │    │
│  │  ✅ Native tool calling (no manual routing)                  │    │
│  │  ✅ Streaming support                                        │    │
│  │  ✅ Provider-agnostic (OpenAI-compatible APIs)               │    │
│  │  ✅ Automatic artifact detection & formatting                │    │
│  │                                                              │    │
│  │  Dependencies:                                               │    │
│  │  ├──► core/llm.py (Unified LLM client)                      │    │
│  │  ├──► core/embeddings.py (Unified embeddings)               │    │
│  │  ├──► core/conversation.py (MongoDB chat history)           │    │
│  │  ├──► core/artifact_templates.py (Quiz/Mindmap templates)   │    │
│  │  └──► tools/* (LangChain tools)                             │    │
│  │                                                              │    │
│  │  Compatibility Layer (temporary):                            │    │
│  │  └──► core/agent_compat.py (wrapper for old routes)         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────── RAG & RETRIEVAL ──────────────────────────┐    │
│  │  core/rag_retriever.py (Active - FAISS-based)               │    │
│  │  • User-isolated document storage                           │    │
│  │  • Metadata filtering (user_id, session_id)                 │    │
│  │  • HuggingFace embeddings                                   │    │
│  │  • MongoDB GridFS backup                                    │    │
│  │                                                              │    │
│  │  rag/ module (Future migration target)                      │    │
│  │  ├──► vectorstore.py (Multi-provider vector DB)             │    │
│  │  ├──► retriever.py (Enhanced retrieval)                     │    │
│  │  └──► ingest.py (Document processing pipeline)              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────── VOICE/LIVEKIT INTEGRATION ───────────────────┐    │
│  │  (Separate process - event-driven voice tutoring)           │    │
│  │                                                              │    │
│  │  livekit_agents_voice_tutor.py (Worker Process)             │    │
│  │           │                                                  │    │
│  │           ├──► core/voice_agent.py                          │    │
│  │           │     • Audio I/O (STT/TTS/VAD)                   │    │
│  │           │     • Groq Whisper STT                          │    │
│  │           │     • ElevenLabs TTS (+ Edge-TTS fallback)      │    │
│  │           │     • Silero VAD                                │    │
│  │           │                                                  │    │
│  │           └──► core/teaching_engine.py                      │    │
│  │                 • State Machine (7 teaching phases)         │    │
│  │                 • Deterministic teaching logic              │    │
│  │                 • LLM only generates speech                 │    │
│  │                 • RAG-grounded responses                    │    │
│  │                 • Curriculum management                     │    │
│  │                                                              │    │
│  │  Supporting Components:                                      │    │
│  │  ├──► core/livekit_manager.py (Room/token creation)         │    │
│  │  ├──► core/teaching_models.py (Data models)                 │    │
│  │  ├──► core/voice_events.py (Event definitions)              │    │
│  │  └──► core/curriculum.py (Lesson plan management)           │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────── TOOLS LIBRARY ──────────────────────────┐    │
│  │  tools/generate_quiz.py                                     │    │
│  │  tools/generate_flashcards.py                               │    │
│  │  tools/mindmap_generator.py                                 │    │
│  │  tools/summarize.py                                         │    │
│  │  tools/search_sources.py (RAG integration)                  │    │
│  │  tools/web_search.py                                        │    │
│  │  tools/web_scraper.py                                       │    │
│  │  tools/ppt_generator.py                                     │    │
│  │  tools/doc_generator.py                                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────── STORAGE & DATA ───────────────────────────┐    │
│  │  MongoDB:                                                   │    │
│  │    • Conversations (chat history)                           │    │
│  │    • User sessions                                          │    │
│  │    • Usage tracking & analytics                             │    │
│  │    • Documents (GridFS backup)                              │    │
│  │                                                              │    │
│  │  Vector Store (FAISS - local filesystem):                   │    │
│  │    • User documents (RAG embeddings)                        │    │
│  │    • HuggingFace embeddings                                 │    │
│  │    • Per-user isolation via metadata                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                              │
│  • LiveKit Cloud (WebRTC rooms for voice tutoring)                   │
│  • OpenAI / Ollama / Together AI (LLM providers)                     │
│  • Groq (Whisper STT)                                                │
│  • ElevenLabs (TTS)                                                  │
│  • MongoDB Atlas (Database)                                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Features

### Core Capabilities
- **LangChain-based Agent**: Native tool calling, no manual intent classification
- **Multi-user Isolated RAG**: User-specific document retrieval with metadata filtering
- **Streaming Responses**: Real-time token streaming for chat endpoints
- **JWT Authentication**: Secure user isolation across all endpoints
- **Usage Tracking**: Token/request analytics with MongoDB persistence
- **Background Processing**: Async document ingestion and generation tasks

### AI Tools & Artifacts
- **Study Tools**: Quiz generation, flashcards, mind maps, study plans
- **Document Tools**: Summarization, Q&A, concept maps, course outlines
- **Search Tools**: Web search, RAG-based source search, web scraping
- **Generation Tools**: PPT generator, document generator, infographics

### Voice Tutoring (LiveKit)
- **Real-time Voice Interaction**: WebRTC-based audio communication
- **Adaptive Teaching**: State machine-driven pedagogical decisions
- **RAG Integration**: Voice tutor can reference uploaded study materials
- **Multi-modal Input**: STT (Groq Whisper), VAD (Silero), TTS (ElevenLabs)
- **Fallback Providers**: Edge-TTS when ElevenLabs unavailable

---

## 📦 Installation

### Prerequisites
- Python 3.10+
- MongoDB (local or Atlas)
- Node.js 18+ (for frontend)
- LiveKit account (for voice tutoring)

### 1. Clone Repository
```bash
git clone https://github.com/your-org/collabry.git
cd collabry/ai-engine
```

### 2. Create Virtual Environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

**Required Environment Variables:**

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/collabry

# JWT Authentication
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256

# LLM Provider (OpenAI-compatible)
OPENAI_API_KEY=your-openai-key
OPENAI_BASE_URL=https://api.openai.com/v1  # Or Ollama: http://localhost:11434/v1

# Embeddings
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# LiveKit (for voice tutoring)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_AGENT_NAME=collabry-tutor

# Voice Services
GROQ_API_KEY=your-groq-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Optional
OLLAMA_HOST=http://localhost:11434
```

### 5. Start the Server
```bash
# Development mode with auto-reload
python run_server.py

# Production mode
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Server will be available at: **http://localhost:8000**
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 🎙️ Voice Tutoring Setup

### 1. Install LiveKit CLI (optional)
```bash
# For testing without frontend
pip install livekit livekit-agents
```

### 2. Start Voice Tutor Worker
```bash
# In separate terminal
python livekit_agents_voice_tutor.py dev
```

### 3. Create Voice Session via API
```bash
curl -X POST http://localhost:8000/voice/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "notebook_id": "general",
    "username": "John",
    "source": "Your study material text here..."
  }'
```

Response includes:
- `room_name`: LiveKit room identifier
- `student_token`: JWT token for frontend connection
- `ws_url`: LiveKit WebSocket URL
- `session_id`: Session tracking ID

### 4. Frontend Integration
The frontend (`frontend/app/(main)/voice-tutor/page.tsx`) automatically:
1. Creates room via API
2. Connects to LiveKit with student token
3. Handles audio I/O via `@livekit/components-react`
4. Displays transcript and session stats

---

## 🔧 Development

### Project Structure
```
ai-engine/
├── api/                    # Vercel serverless entrypoint
├── core/                   # Core business logic
│   ├── agent.py           # LangChain agent (main)
│   ├── llm.py             # Unified LLM client
│   ├── embeddings.py      # Unified embeddings
│   ├── rag_retriever.py   # RAG document retrieval
│   ├── conversation.py    # MongoDB chat history
│   ├── voice_agent.py     # LiveKit voice I/O
│   ├── teaching_engine.py # Teaching state machine
│   └── ...
├── server/                 # FastAPI application
│   ├── main.py            # App initialization
│   ├── deps.py            # JWT authentication
│   ├── routes/            # API endpoints
│   └── schemas.py         # Pydantic models
├── tools/                  # LangChain tools
│   ├── generate_quiz.py
│   ├── search_sources.py
│   └── ...
├── rag/                    # Future RAG module (not active)
├── data/                   # Training data, curricula
├── documents/              # User-uploaded documents
├── config.py              # Configuration management
├── requirements.txt       # Python dependencies
├── run_server.py          # Development server launcher
└── livekit_agents_voice_tutor.py  # LiveKit worker
```

### Running Tests
```bash
# Lint code
flake8 core/ server/ tools/

# Type checking
mypy core/ server/

# Run LiveKit test (interactive)
python dev_livekit_connect_test.py
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python run_server.py
```

---

## 📊 API Usage Examples

### 1. Chat (Main Endpoint)
```bash
curl -X POST http://localhost:8000/ai/chat \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a quiz about photosynthesis",
    "session_id": "session-123",
    "notebook_id": "biology-101",
    "stream": false
  }'
```

### 2. Upload Document (RAG)
```bash
curl -X POST http://localhost:8000/ai/upload \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "file=@notes.pdf" \
  -F "session_id=session-123" \
  -F "notebook_id=biology-101"
```

### 3. Question Answering
```bash
curl -X POST http://localhost:8000/ai/qa \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is photosynthesis?",
    "session_id": "session-123",
    "notebook_id": "biology-101"
  }'
```

### 4. Generate Mind Map
```bash
curl -X POST http://localhost:8000/ai/mindmap \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Neural Networks",
    "session_id": "session-123"
  }'
```

---

## 🔐 Authentication

All endpoints (except `/health`) require JWT authentication:

```bash
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

JWT payload must include:
```json
{
  "sub": "user-id-123",
  "exp": 1234567890
}
```

Generate JWT using your authentication service (e.g., backend user service).

---

## 🚧 Migration Notes

### Pending Migrations

**⚠️ Compatibility Layer Still Active:**
- `core/agent_compat.py` is a temporary wrapper for old routes
- Routes using it: `/ai/qa`, `/ai/summarize`, `/ai/mindmap`
- **TODO**: Migrate these routes to directly use `core/agent.py`

**⚠️ RAG Module Not Active:**
- New `rag/` module exists but is not used yet
- Current RAG uses `core/rag_retriever.py` (FAISS-only)
- **TODO**: Migrate to multi-provider `rag/` module for future scalability

### Cleaned Up (Refactorization Complete)
- ✅ Removed all test scripts (kept `dev_livekit_connect_test.py` for debugging)
- ✅ Consolidated documentation to single README.md
- ✅ Deleted PowerShell setup scripts
- ✅ Removed `legacy_tools/` folder (CLI, browser automation)
- ✅ Consolidated to LangChain-based agent (`core/agent.py`)
- ✅ Deleted old LLM services (local_llm, ollama_service, gemini_service)
- ✅ Deleted intent classification system (4 files)
- ✅ Deleted deprecated modules (nlp.py, study_copilot.py)
- ✅ Deleted training/model folders for intent classification
- ✅ Removed duplicate route files (chat_new.py, upload_new.py)

**Files Deleted:** ~40+ files, ~3500+ lines of code removed

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB is running
mongosh --eval "db.runCommand({ ping: 1 })"

# Update connection string in .env
MONGO_URI=mongodb://localhost:27017/collabry
```

### LLM Provider Issues
```bash
# Test OpenAI connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"

# Test Ollama connection
curl http://localhost:11434/api/tags
```

### LiveKit Connection Issues
```bash
# Verify LiveKit credentials
python dev_livekit_connect_test.py

# Check LiveKit Cloud dashboard for room status
# https://cloud.livekit.io
```

### CORS Issues
```bash
# Add frontend origin to .env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Restart server after changing CORS_ORIGINS
```

---

## 📚 Additional Resources

- **LangChain Docs**: https://python.langchain.com/docs
- **LiveKit Agents**: https://docs.livekit.io/agents
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **MongoDB Docs**: https://www.mongodb.com/docs

---

## 📝 License

[Your License Here]

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📧 Support

For issues or questions:
- GitHub Issues: [Your Repo URL]/issues
- Email: support@collabry.com
- Discord: [Your Discord Server]

---

**Built with ❤️ by the Collabry Team**
