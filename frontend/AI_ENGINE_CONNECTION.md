# Frontend → AI Engine Direct Connection Setup ✅

## Overview

The frontend (Next.js at port 3000) now connects **directly** to the AI Engine (FastAPI at port 8000), bypassing the backend Node.js server for all AI operations.

```
Frontend (Port 3000) ──────────► AI Engine (Port 8000)
                                      │
                                      ├─► Ollama (Port 11434)
                                      └─► MongoDB (Port 27017)

Backend (Port 5000) ────────► (Separate, for auth/users/admin only)
```

## ✅ What's Configured

### 1. **CORS on AI Engine**
[server/main.py](ai-engine/server/main.py) - Lines 69-86:
```python
allowed_origins = [
    "http://localhost:3000",  # Next.js dev server ✅
    "http://localhost:5000",  # Backend server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
```

### 2. **Frontend Environment**
[.env.local](frontend/.env.local):
```env
NEXT_PUBLIC_AI_ENGINE_URL=http://localhost:8000  ✅ NEW
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. **AI Engine Service**
[src/services/aiEngine.service.ts](frontend/src/services/aiEngine.service.ts) ✅ NEW
- Direct HTTP client to AI Engine
- Automatic JWT token injection from localStorage
- Methods: chat, summarize, generateQA, generateMindMap, ingestDocument

### 4. **React Hooks**
[src/hooks/useAI.ts](frontend/src/hooks/useAI.ts) ✅ NEW
- `useAIChat()` - Send messages to AI
- `useSummarize()` - Summarize text
- `useGenerateQA()` - Generate Q&A
- `useGenerateMindMap()` - Create mind maps
- `useIngestDocument()` - Upload documents for RAG
- `useConversationHistory()` - Get chat history
- `useAIHealth()` - Monitor AI engine status

### 5. **Example Component**
[components/AIChatExample.tsx](frontend/components/AIChatExample.tsx) ✅ NEW
- Ready-to-use AI chat interface
- Shows health status
- Demonstrates direct AI engine connection

## 🚀 How to Use in Frontend

### Basic Chat Example

```typescript
'use client';

import { useAIChat } from '@/hooks/useAI';
import { useAuthStore } from '@/stores/auth.store';

export default function MyComponent() {
  const { user } = useAuthStore();
  const { mutate: sendMessage, isPending } = useAIChat();

  const handleChat = () => {
    sendMessage(
      { message: 'Explain quantum physics' },
      {
        onSuccess: (response) => {
          console.log('AI Response:', response);
        },
      }
    );
  };

  return (
    <button onClick={handleChat} disabled={isPending}>
      Ask AI
    </button>
  );
}
```

### Summarize Text

```typescript
import { useSummarize } from '@/hooks/useAI';

const { mutate: summarize } = useSummarize();

summarize(
  {
    text: 'Long document text here...',
    options: { max_length: 150, style: 'bullet_points' },
  },
  {
    onSuccess: (response) => {
      console.log('Summary:', response.summary);
    },
  }
);
```

### Generate Q&A

```typescript
import { useGenerateQA } from '@/hooks/useAI';

const { mutate: generateQA } = useGenerateQA();

generateQA(
  {
    text: 'Study material text...',
    options: { num_questions: 5 },
  },
  {
    onSuccess: (response) => {
      console.log('Questions:', response.questions);
    },
  }
);
```

### Mind Map Generation

```typescript
import { useGenerateMindMap } from '@/hooks/useAI';

const { mutate: generateMindMap } = useGenerateMindMap();

generateMindMap(
  {
    text: 'Topic content...',
    options: { max_nodes: 10 },
  },
  {
    onSuccess: (response) => {
      console.log('Mind Map:', response.mindmap);
    },
  }
);
```

### Check AI Health

```typescript
import { useAIHealth } from '@/hooks/useAI';

const { data: aiHealth } = useAIHealth();

// aiHealth: { status: 'healthy' | 'error', ... }
```

## 📡 Available AI Engine Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check (no auth) |
| `/api/chat` | POST | Chat with AI |
| `/api/chat/stream` | POST | Streaming chat |
| `/api/summarize` | POST | Summarize text |
| `/api/qa/generate` | POST | Generate Q&A |
| `/api/mindmap/generate` | POST | Generate mind map |
| `/api/ingest` | POST | Ingest documents for RAG |
| `/api/conversations` | GET | Get conversation history |
| `/api/conversations` | DELETE | Clear conversation |

## 🔐 Authentication Flow

1. User logs in via backend → receives JWT token
2. Frontend stores token in localStorage
3. AI service reads token from localStorage
4. All AI requests include: `Authorization: Bearer <token>`
5. AI engine validates token using shared JWT secret
6. User-isolated responses returned

**Important**: JWT secrets must match:
- Backend `.env`: `JWT_ACCESS_SECRET`
- AI Engine `.env`: `JWT_SECRET_KEY`

## 🎯 Test the Connection

### 1. Start AI Engine
```powershell
cd C:\Users\Admin\Documents\GitHub\collabry\ai-engine
python .\run_server.py
```

### 2. Test Health Endpoint
```powershell
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-05T...",
  "services": {
    "mongodb": "connected",
    "ollama": "connected"
  }
}
```

### 3. Test from Browser Console

Open frontend (http://localhost:3000) and run in console:
```javascript
// Check if AI Engine URL is set
console.log(process.env.NEXT_PUBLIC_AI_ENGINE_URL);

// Test health check
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(console.log);
```

### 4. Use Example Component

Add to any page in your app:
```typescript
import AIChatExample from '@/components/AIChatExample';

export default function TestPage() {
  return <AIChatExample />;
}
```

## 🐛 Troubleshooting

### CORS Error
**Error**: `Access to fetch at 'http://localhost:8000/...' from origin 'http://localhost:3000' has been blocked by CORS`

**Solution**: AI engine CORS is already configured ✅

### 401 Unauthorized
**Error**: AI requests return 401

**Cause**: JWT token invalid or missing

**Solution**:
1. Ensure user is logged in
2. Check JWT secrets match in both services
3. Verify token is in localStorage: `localStorage.getItem('accessToken')`

### Connection Refused
**Error**: `ERR_CONNECTION_REFUSED`

**Cause**: AI engine not running

**Solution**: Start AI engine on port 8000

### Timeout Error
**Error**: Request timeout after 60s

**Cause**: Ollama not responding or model not loaded

**Solution**:
```bash
ollama serve
ollama pull llama3.1
```

## 📦 Dependencies

Frontend packages (already installed):
- ✅ axios - HTTP client
- ✅ @tanstack/react-query - Data fetching hooks
- ✅ zustand - State management

## ✨ Summary

**✅ Direct frontend → AI engine connection configured**
- CORS properly set up
- Service and hooks created
- Example component provided
- JWT authentication integrated
- No backend required for AI operations

**🚀 AI Engine Running**: http://localhost:8000
**📚 API Docs**: http://localhost:8000/docs
**💚 Health Check**: http://localhost:8000/health

Your frontend can now directly communicate with the AI engine! 🎉
