# Production-Grade Study Assistant Backend

Clean, maintainable backend architecture following strict engineering principles.

## ✅ Architecture Principles

1. **Single LLM Client** - All LLM access through `core/llm.py` only
2. **OpenAI-Compatible Only** - Works with any OpenAI-compatible API
3. **Native Tool Calling** - No manual intent classification or JSON parsing
4. **Minimal LangChain** - Used only for agent orchestration, not as framework maze
5. **Provider Agnostic** - Switch LLM/embeddings/vector DB via environment variables
6. **Free Local First** - Works with Ollama/LM Studio, upgradable to OpenAI

## 📁 Folder Structure

```
ai-engine/
├── core/
│   ├── llm.py              # SINGLE LLM client (OpenAI-compatible)
│   ├── agent.py            # LangChain agent with native tool calling
│   ├── conversation.py     # MongoDB conversation history
│   └── embeddings.py       # Unified embeddings client
│
├── rag/
│   ├── vectorstore.py      # Vector database client
│   ├── retriever.py        # Filtered retriever (user_id + notebook_id)
│   └── ingest.py           # Document processing pipeline
│
├── tools/
│   ├── search_sources.py       # RAG retrieval tool
│   ├── summarize.py            # Summarization tool
│   ├── generate_quiz.py        # Quiz generation tool
│   └── generate_flashcards.py  # Flashcard generation tool
│
├── server/
│   └── routes/
│       ├── chat.py         # Unified chat endpoint
│       └── upload.py       # Document upload endpoint
│
├── config.py               # Environment configuration
├── requirements.txt        # Minimal dependencies
└── .env                    # Environment variables
```

## 🚀 Quick Start

### Local Development (Free, No API Keys)

```bash
# 1. Install Ollama
# Download from: https://ollama.ai

# 2. Pull model
ollama pull llama3.1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Use the Ollama configuration (already set as default)

# 5. Start MongoDB (Docker)
docker run -d -p 27017:27017 mongo:latest

# 6. Run server
python run_server.py
```

Server runs at: http://localhost:8000

### Production (OpenAI)

```bash
# 1. Configure .env for OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small

VECTOR_STORE=pinecone
PINECONE_API_KEY=...

MONGODB_URI=mongodb+srv://...

# 2. Run
python run_server.py
```

## 🔄 Switching Providers

### LLM Providers

**Local Development:**
```bash
# Ollama
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.1

# LM Studio
OPENAI_API_KEY=lm-studio
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_MODEL=llama-3.1-8b-instruct
```

**Cloud:**
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# OpenRouter
OPENAI_API_KEY=sk-or-v1-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Together AI
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.together.xyz/v1
OPENAI_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo
```

**NO CODE CHANGES REQUIRED**

### Embedding Providers

```bash
# OpenAI
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small

# Local (Free)
EMBEDDING_PROVIDER=sentence-transformers
EMBEDDING_MODEL=all-MiniLM-L6-v2

# HuggingFace API
EMBEDDING_PROVIDER=huggingface
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
HF_API_KEY=hf_...
```

### Vector Store Providers

```bash
# FAISS (Local, Simple)
VECTOR_STORE=faiss
FAISS_INDEX_PATH=./data/faiss_index

# Chroma (Local/Cloud)
VECTOR_STORE=chroma
CHROMA_PERSIST_DIR=./data/chroma_db

# Pinecone (Cloud Production)
VECTOR_STORE=pinecone
PINECONE_API_KEY=...
PINECONE_INDEX=study-assistant

# Qdrant (Local/Cloud)
VECTOR_STORE=qdrant
QDRANT_URL=http://localhost:6333
```

## 📡 API Endpoints

### POST /ai/chat

Unified chat endpoint - LLM decides actions automatically.

```json
{
  "message": "Summarize my biology notes",
  "session_id": "session_123",
  "notebook_id": "bio_101",
  "stream": true
}
```

**The agent automatically:**
- Searches documents when asked about notes
- Generates summaries when requested
- Creates quizzes when user wants testing
- Makes flashcards when asked
- Answers directly for general questions

**No separate endpoints needed for each action!**

### POST /ai/upload

Upload document for indexing.

```bash
curl -X POST http://localhost:8000/ai/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@notes.pdf" \
  -F "notebook_id=bio_101"
```

### GET /ai/sessions

List conversation sessions.

### GET /ai/sessions/{session_id}/history

Get conversation history.

## 🛠️ How It Works

### Request Flow

1. **User sends message** → POST /ai/chat
2. **Load history** → MongoDB (last 10 messages)
3. **Agent initialization** → LangChain agent executor with tools
4. **LLM reasoning** → Native function calling decides:
   - Answer directly? OR
   - Call search_sources? OR
   - Call summarize_notes? OR
   - Call generate_quiz? OR
   - Call generate_flashcards?
5. **Tool execution** → If tool chosen, execute with user context
6. **Response generation** → LLM formats final answer
7. **Save turn** → MongoDB conversation history
8. **Stream to client** → SSE format

### Tool Calling (Not Manual Routing!)

**OLD (REMOVED):**
```python
# Manual intent classification ❌
intent = classify_intent(message)
if intent == "summarize":
    result = summarize_tool()
```

**NEW:**
```python
# LLM decides via function calling ✅
agent = create_openai_tools_agent(llm, tools, prompt)
result = agent.invoke(message)
# LLM automatically calls tools as needed
```

## 🧪 Testing

```bash
# Test with curl
curl -X POST http://localhost:8000/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the main topics in my notes?",
    "session_id": "test_session",
    "notebook_id": "test_notebook"
  }'
```

## 📦 Dependencies

**Core (Always Required):**
- fastapi - Web framework
- openai - OpenAI-compatible client
- langchain - Agent orchestration
- pymongo - MongoDB client
- pypdf, python-docx - Document parsing

**Optional (Provider-Specific):**
- sentence-transformers - Local embeddings
- faiss-cpu - Local vector store
- pinecone-client - Cloud vector store
- chromadb - Alternative vector store

**Total: ~15-20 packages** (vs 50+ in old architecture)

## 🔐 Environment Variables Reference

See `.env.example` for complete reference with all provider options.

## 🏗️ Design Decisions

### Why OpenAI-Compatible Only?

OpenAI's API has become the industry standard (like S3 for storage). Every major provider offers compatibility:
- Ollama, LM Studio, Together AI, OpenRouter, Anthropic (via proxy), Azure OpenAI

This means **zero vendor lock-in**.

### Why No Manual Intent Classification?

Modern LLMs with function calling are better at intent understanding than rule-based systems or separate classifiers. Let the LLM decide.

### Why Single LLM File?

`core/llm.py` is the only file importing LLM SDKs. This creates a clear abstraction boundary. To change providers, modify one file (or just environment variables).

### Why Minimal LangChain?

We use LangChain for:
1. Agent executor (standard pattern)
2. Tool decorators (clean interface)
3. Basic RAG retrievers

We DON'T use:
- Complex chains
- Memory classes (use MongoDB directly)
- Proprietary abstractions
- Experimental features

This keeps the codebase maintainable and easy to understand.

## 🚨 Migration Guide

If migrating from old architecture:

**Files REMOVED:**
- `core/gemini_service.py` ❌
- `core/ollama_service.py` ❌
- `core/local_llm.py` ❌
- `core/gemini_intent.py` ❌
- `core/intent_classifier.py` ❌
- `core/intent.py` ❌
- `core/nlp.py` ❌
- `core/study_copilot.py` ❌

**Files REPLACED:**
- `core/agent.py` → New version with native tool calling
- `core/embeddings.py` → Unified multi-provider
- `server/routes/chat.py` → Simplified unified endpoint
- `config.py` → Environment-based only

**Files ADDED:**
- `core/llm.py` → Single LLM client
- `core/conversation.py` → MongoDB manager
- `rag/` folder → Clean RAG pipeline
- New tools in LangChain format

## 📝 License

MIT

## 🤝 Contributing

This architecture follows strict principles. Before contributing:

1. Read architecture principles above
2. Never add provider-specific code outside `core/llm.py` or `core/embeddings.py`
3. Never add manual intent classification
4. Never add custom JSON parsing for tool calls
5. Keep it simple
