# Route Analysis for Study Notebook Implementation

## AI Engine Routes (Port 8000)

### ✅ Sessions Management (`/ai/sessions`)
**Status**: KEEP - Essential for notebook chat
- `GET /ai/sessions` - List all user sessions
- `POST /ai/sessions` - Create new session  
- `GET /ai/sessions/:id` - Get session details
- `DELETE /ai/sessions/:id` - Delete session
- `GET /ai/sessions/:id/messages` - Get session messages
- `POST /ai/sessions/:id/chat` - Send message (non-streaming)
- `GET /ai/sessions/:id/chat/stream` - Send message (streaming)

### ✅ Q&A Generation (`/ai/qa`)
**Status**: KEEP - For quiz generation
- `POST /ai/qa` - Generate questions from content
- `POST /ai/qa/stream` - Generate questions (streaming)

### ✅ Mind Map Generation (`/ai/mindmap`)
**Status**: KEEP - For mind map artifact
- `POST /ai/mindmap` - Generate mind map structure

### ✅ Summarization (`/ai/summarize`)
**Status**: KEEP - Useful for source processing
- `POST /ai/summarize` - Summarize content
- `POST /ai/summarize/stream` - Summarize (streaming)

### ✅ Document Ingestion (`/ai/ingest`)
**Status**: KEEP - For source uploads
- `POST /ai/ingest` - Upload and process documents for RAG

### ✅ Usage Tracking (`/ai/usage`)
**Status**: KEEP - For monitoring
- `GET /ai/usage/me` - Current user usage
- `GET /ai/usage/stats` - Usage statistics

---

## Backend Routes (Port 5000)

### ✅ Visual Aids Routes (`/api/visualaids`)
**Status**: KEEP BUT RENAME to `/api/notebook`

#### Quiz Routes - KEEP ALL
- `POST /quizzes` - Create quiz
- `GET /quizzes` - List quizzes
- `GET /quizzes/:id` - Get quiz
- `PUT /quizzes/:id` - Update quiz
- `DELETE /quizzes/:id` - Delete quiz
- `POST /quizzes/:id/attempts` - Submit quiz attempt
- `GET /quizzes/attempts` - Get user attempts
- `GET /quizzes/:id/statistics` - Quiz stats

#### Mind Map Routes - KEEP ALL
- `POST /mindmaps` - Create mind map
- `GET /mindmaps` - List mind maps
- `GET /mindmaps/:id` - Get mind map
- `PUT /mindmaps/:id` - Update mind map
- `DELETE /mindmaps/:id` - Delete mind map
- `POST /mindmaps/:id/version` - Version control
- `GET /mindmaps/:id/versions` - Version history

#### Generation Routes - KEEP
- `POST /generate/quiz` - Generate quiz from file/content
- `POST /generate/mindmap` - Generate mind map

#### Subjects Routes - KEEP (Optional for organization)
- `GET /subjects` - List subjects
- `POST /subjects` - Create subject
- `GET /subjects/:id` - Get subject
- `PUT /subjects/:id` - Update subject
- `DELETE /subjects/:id` - Delete subject

### ✅ AI Proxy Routes (`/api/ai`)
**Status**: KEEP - Used to proxy AI engine
- Proxies all AI engine requests through backend

---

## Implementation Plan

### Phase 1: Source Management (Local Storage)
Since we're storing sources locally for now:

```javascript
// NEW ROUTE: /api/notebook/sources
router.post('/sources', protect, upload.single('file'), async (req, res) => {
  // Store file in local uploads/ directory
  // Save metadata to MongoDB
  // Return source info
});

router.get('/sources', protect, async (req, res) => {
  // Get user's sources from MongoDB
});

router.delete('/sources/:id', protect, async (req, res) => {
  // Delete file and metadata
});
```

### Phase 2: Notebook Sessions
Create a new notebook model that wraps:
- Sources (local files + metadata)
- Chat session (AI engine session)
- Generated artifacts (quizzes, mind maps)

```javascript
// NEW MODEL: Notebook
const NotebookSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Untitled Notebook' },
  
  // Sources
  sources: [{
    id: String,
    type: { type: String, enum: ['pdf', 'text', 'website', 'notes'] },
    name: String,
    filePath: String, // Local path
    url: String, // For websites
    content: String, // For text/notes
    size: Number,
    dateAdded: { type: Date, default: Date.now }
  }],
  
  // AI Session
  aiSessionId: String, // Reference to AI engine session
  
  // Generated Artifacts
  artifacts: [{
    type: { type: String, enum: ['quiz', 'mindmap', 'flashcards'] },
    referenceId: String, // ID in respective collection
    title: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### Phase 3: Integration Points

#### Chat (Use AI Engine Sessions)
```typescript
// Frontend will call:
POST /api/ai/sessions/:id/chat/stream
// With selected source content in context
```

#### Quiz Generation (Use existing)
```typescript
// Frontend will call:
POST /api/visualaids/generate/quiz
// With source file or content
// Returns quiz saved to DB
```

#### Mind Map Generation (Use existing)
```typescript
// Frontend will call:
POST /api/visualaids/generate/mindmap
// With source content
// Returns mind map saved to DB
```

---

## Routes to REMOVE

### ❌ No routes to remove!
All existing routes are useful for the notebook:
- Sessions → Chat functionality
- Quiz/MindMap → Artifacts
- Generation → Creating artifacts
- Subjects → Organization (optional)

---

## New Routes to ADD

### Notebook Management
```javascript
// /api/notebook/notebooks
POST   /notebooks           - Create notebook
GET    /notebooks           - List notebooks
GET    /notebooks/:id       - Get notebook
PUT    /notebooks/:id       - Update notebook
DELETE /notebooks/:id       - Delete notebook

// /api/notebook/notebooks/:id/sources
POST   /notebooks/:id/sources        - Add source (upload/text/url)
GET    /notebooks/:id/sources        - List sources
DELETE /notebooks/:id/sources/:sid   - Remove source

// /api/notebook/notebooks/:id/artifacts
POST   /notebooks/:id/artifacts      - Link artifact
GET    /notebooks/:id/artifacts      - List artifacts
DELETE /notebooks/:id/artifacts/:aid - Unlink artifact
```

---

## Summary

### KEEP (Use as-is):
- ✅ All AI Engine routes (`/ai/*`)
- ✅ All Quiz routes (`/api/visualaids/quizzes/*`)
- ✅ All Mind Map routes (`/api/visualaids/mindmaps/*`)
- ✅ Generation routes (`/api/visualaids/generate/*`)
- ✅ AI Proxy routes (`/api/ai/*`)

### ADD (New functionality):
- ✅ Notebook CRUD routes
- ✅ Source management routes (local storage)
- ✅ Artifact linking routes

### RENAME:
- `/api/visualaids` → Can stay, but conceptually it's now part of notebook

### REMOVE from Frontend:
- ❌ `/study-buddy` page
- ❌ `/visual-aids` page
- ❌ Sidebar links to above pages

---

## Architecture

```
Study Notebook (Frontend)
    │
    ├─> Sources Panel
    │   └─> POST /api/notebook/notebooks/:id/sources (upload to local)
    │
    ├─> Chat Panel  
    │   └─> POST /api/ai/sessions/:id/chat/stream (via proxy)
    │
    └─> Studio Panel
        ├─> Generate Quiz
        │   └─> POST /api/visualaids/generate/quiz
        │
        └─> Generate Mind Map
            └─> POST /api/visualaids/generate/mindmap
```

All existing backend logic is preserved and reused!
