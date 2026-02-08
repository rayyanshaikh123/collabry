# AI Engine API Contract - Frontend Integration Guide

## Overview

This document defines the stable API contract between the Study Notebook frontend and AI backend. All response formats use explicit discriminated unions with `type` fields for predictable frontend behavior.

**Base URL**: `http://localhost:8000` (development)

**Authentication**: All endpoints require JWT Bearer token in `Authorization` header.

---

## Table of Contents

1. [Chat Endpoints](#chat-endpoints)
2. [Artifact Endpoints](#artifact-endpoints)
3. [SSE Event Streams](#sse-event-streams)
4. [Response Schemas](#response-schemas)
5. [Testing Examples](#testing-examples)

---

## Chat Endpoints

### POST /ai/chat

**Description**: Main chat endpoint with intent-based routing. Detects whether user wants conversation (chat mode) or artifact generation (artifact mode).

**Request Body**:
```json
{
  "message": "string (required)",
  "session_id": "string (optional)",
  "stream": false,
  "use_rag": false,
  "source_ids": ["list of source IDs (optional)"]
}
```

**Response - Chat Mode** (`200 OK`):
```json
{
  "type": "chat",
  "message": "This is the AI's conversational response...",
  "session_id": "session-uuid",
  "user_id": "user-uuid",
  "timestamp": "2026-02-08T12:34:56Z"
}
```

**Response - Artifact Mode** (`200 OK`):
```json
{
  "type": "artifact_job",
  "job_id": "job-uuid",
  "artifact_type": "quiz",
  "status": "pending",
  "session_id": "session-uuid",
  "user_id": "user-uuid",
  "timestamp": "2026-02-08T12:34:56Z"
}
```

**Frontend Logic**:
```typescript
const response = await fetch('/ai/chat', {
  method: 'POST',
  body: JSON.stringify(request),
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();

if (data.type === "chat") {
  // Display conversational message
  displayMessage(data.message);
} else if (data.type === "artifact_job") {
  // Start polling job status or listen to SSE
  pollArtifactStatus(data.job_id);
  // OR subscribeToArtifactEvents();
}
```

**Example Request - Chat Mode**:
```bash
curl -X POST http://localhost:8000/ai/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is photosynthesis?",
    "session_id": "my-session-1"
  }'
```

**Example Request - Artifact Mode**:
```bash
curl -X POST http://localhost:8000/ai/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a quiz about machine learning with 5 questions",
    "session_id": "my-session-1"
  }'
```

---

### POST /ai/chat/stream

**Description**: Streaming chat endpoint using Server-Sent Events (SSE). For chat mode, streams tokens as they're generated. For artifact mode, sends job creation event and closes immediately.

**Request Body**: Same as `/ai/chat`

**Response - Chat Mode** (SSE stream):
```
data: This
data:  is
data:  streaming
data:  text
event: done
data:
```

**Response - Artifact Mode** (SSE stream):
```
event: artifact_job
data: {"type":"artifact_job","job_id":"job-uuid","artifact_type":"quiz","status":"pending","session_id":"session-uuid","user_id":"user-uuid"}

event: done
data:
```

**Frontend Logic**:
```typescript
const eventSource = new EventSource('/ai/chat/stream?token=' + token);

eventSource.addEventListener('message', (e) => {
  // Chat mode: token-by-token data
  appendToken(e.data);
});

eventSource.addEventListener('artifact_job', (e) => {
  // Artifact mode: job created
  const jobData = JSON.parse(e.data);
  startPollingJob(jobData.job_id);
  eventSource.close();
});

eventSource.addEventListener('done', (e) => {
  eventSource.close();
});

eventSource.addEventListener('error', (e) => {
  console.error('Stream error:', e);
  eventSource.close();
});
```

**Example Request**:
```bash
curl -X POST http://localhost:8000/ai/chat/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "Explain neural networks",
    "session_id": "my-session-1"
  }'
```

---

## Artifact Endpoints

### GET /ai/artifact/status/{job_id}

**Description**: Poll artifact job status. Check this endpoint periodically until status is `completed` or `failed`.

**URL Parameters**:
- `job_id` (string, required): Job identifier from artifact creation response

**Response** (`200 OK`):
```json
{
  "job_id": "job-uuid",
  "status": "generating",
  "progress": 45,
  "artifact_type": "quiz",
  "result": null,
  "error": null,
  "created_at": "2026-02-08T12:34:56Z",
  "updated_at": "2026-02-08T12:35:10Z"
}
```

**Status Values**:
- `pending` - Job created, waiting for worker
- `planning` - Worker is analyzing structure
- `generating` - Worker is generating content
- `validating` - Worker is checking quality
- `completed` - Success, `result` field contains artifact
- `failed` - Error occurred, `error` field contains message

**When status is `completed`**:
```json
{
  "job_id": "job-uuid",
  "status": "completed",
  "progress": 100,
  "artifact_type": "quiz",
  "result": {
    "questions": [
      {
        "question": "What is machine learning?",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "explanation": "..."
      }
    ]
  },
  "error": null,
  "created_at": "2026-02-08T12:34:56Z",
  "updated_at": "2026-02-08T12:36:22Z"
}
```

**When status is `failed`**:
```json
{
  "job_id": "job-uuid",
  "status": "failed",
  "progress": 0,
  "artifact_type": "quiz",
  "result": null,
  "error": "timeout - LLM call exceeded time limit",
  "created_at": "2026-02-08T12:34:56Z",
  "updated_at": "2026-02-08T12:36:00Z"
}
```

**Error Types**:
- `timeout` - LLM took too long (45s/90s/45s/60s per phase)
- `budget_exceeded` - Job used >12,000 tokens
- `snapshot_incompatible` - RAG snapshot version mismatch
- `worker_restart` - Worker crashed during processing
- `validation_failed` - Generated artifact didn't meet quality standards

**Frontend Polling Pattern**:
```typescript
async function pollArtifactStatus(jobId: string) {
  const maxAttempts = 60; // 5 minutes max (5s intervals)
  let attempts = 0;

  const poll = async () => {
    const response = await fetch(`/ai/artifact/status/${jobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const job = await response.json();

    if (job.status === 'completed') {
      displayArtifact(job.result, job.artifact_type);
      return;
    }

    if (job.status === 'failed') {
      showError(job.error);
      return;
    }

    // Still in progress
    updateProgress(job.progress);

    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(poll, 5000); // Poll every 5 seconds
    } else {
      showError('Job timed out');
    }
  };

  poll();
}
```

**Example Request**:
```bash
curl -X GET http://localhost:8000/ai/artifact/status/job-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### GET /ai/artifact/events/stream

**Description**: Subscribe to real-time artifact job events via Server-Sent Events. More efficient than polling - client receives instant notifications when jobs complete or fail.

**Response** (SSE stream):
```
data: {"type":"connected","user_id":"user-uuid"}

data: {"type":"artifact.completed","job_id":"job-uuid","artifact_type":"quiz","result":{...},"user_id":"user-uuid"}

data: {"type":"artifact.failed","job_id":"job-uuid","error":"timeout","user_id":"user-uuid"}
```

**Event Types**:
- `connected` - Initial connection confirmation
- `artifact.completed` - Artifact generation succeeded
- `artifact.failed` - Artifact generation failed

**Frontend Usage**:
```typescript
// Connect to event stream once on app init
const eventSource = new EventSource('/ai/artifact/events/stream?token=' + token);

eventSource.addEventListener('message', (e) => {
  const event = JSON.parse(e.data);

  if (event.type === 'connected') {
    console.log('Connected to artifact events');
  }

  if (event.type === 'artifact.completed') {
    // Display completed artifact
    displayArtifact(event.result, event.artifact_type);
    stopLoadingSpinner(event.job_id);
  }

  if (event.type === 'artifact.failed') {
    // Show error
    showError(`Artifact generation failed: ${event.error}`);
    stopLoadingSpinner(event.job_id);
  }
});

eventSource.addEventListener('error', (e) => {
  console.error('Event stream error, reconnecting...');
  // Reconnect after delay
  setTimeout(() => {
    eventSource = new EventSource('/ai/artifact/events/stream?token=' + token);
  }, 5000);
});
```

**Example Request**:
```bash
curl -X GET http://localhost:8000/ai/artifact/events/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: text/event-stream"
```

**Best Practice**: Use SSE events instead of polling for better performance and instant updates.

---

## Response Schemas

### ChatTextResponse

**Discriminator**: `type: "chat"`

```typescript
interface ChatTextResponse {
  type: "chat";
  message: string;
  session_id: string;
  user_id: string;
  timestamp: string; // ISO 8601
}
```

### ArtifactJobCreatedResponse

**Discriminator**: `type: "artifact_job"`

```typescript
interface ArtifactJobCreatedResponse {
  type: "artifact_job";
  job_id: string;
  artifact_type: "quiz" | "flashcards" | "mindmap";
  status: "pending";
  session_id: string;
  user_id: string;
  timestamp: string; // ISO 8601
}
```

### ArtifactJobStatusResponse

```typescript
interface ArtifactJobStatusResponse {
  job_id: string;
  status: "pending" | "planning" | "generating" | "validating" | "completed" | "failed";
  progress: number; // 0-100
  artifact_type: "quiz" | "flashcards" | "mindmap";
  result: QuizResult | FlashcardsResult | MindmapResult | null;
  error: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

### Artifact Result Types

**Quiz Result**:
```typescript
interface QuizResult {
  questions: Array<{
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  }>;
}
```

**Flashcards Result**:
```typescript
interface FlashcardsResult {
  flashcards: Array<{
    front: string;
    back: string;
  }>;
}
```

**Mindmap Result**:
```typescript
interface MindmapResult {
  root: {
    label: string;
    children: MindmapNode[];
  };
}

interface MindmapNode {
  label: string;
  children: MindmapNode[];
}
```

---

## Testing Examples

### Manual Testing Workflow

#### 1. Test Chat Mode

```bash
# Request
curl -X POST http://localhost:8000/ai/chat \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain the water cycle"
  }'

# Expected Response
{
  "type": "chat",
  "message": "The water cycle, also known as the hydrologic cycle...",
  "session_id": "...",
  "user_id": "...",
  "timestamp": "..."
}
```

#### 2. Test Artifact Mode

```bash
# Request
curl -X POST http://localhost:8000/ai/chat \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generate 3 quiz questions about Python"
  }'

# Expected Response
{
  "type": "artifact_job",
  "job_id": "abc-123-def",
  "artifact_type": "quiz",
  "status": "pending",
  "session_id": "...",
  "user_id": "...",
  "timestamp": "..."
}
```

#### 3. Test Job Status Polling

```bash
# Poll status every 5 seconds
for i in {1..20}; do
  curl -X GET http://localhost:8000/ai/artifact/status/abc-123-def \
    -H "Authorization: Bearer $JWT_TOKEN"
  echo "\n--- Attempt $i ---\n"
  sleep 5
done
```

#### 4. Test Streaming Chat

```bash
curl -X POST http://localhost:8000/ai/chat/stream \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "What is recursion?"
  }'

# Expected Output (tokens stream in real-time):
# data: Recursion
# data:  is
# data:  when
# data:  a
# data:  function
# ...
# event: done
# data:
```

#### 5. Test SSE Event Stream

```bash
# Keep connection open and listen for artifact events
curl -X GET http://localhost:8000/ai/artifact/events/stream \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Accept: text/event-stream"

# Expected Output:
# data: {"type":"connected","user_id":"..."}
#
# (when job completes)
# data: {"type":"artifact.completed","job_id":"...","result":{...}}
```

### Frontend Testing Checklist

- [ ] Chat mode returns `type: "chat"` with message
- [ ] Artifact mode returns `type: "artifact_job"` with job_id
- [ ] Frontend never parses markdown for artifacts
- [ ] Streaming chat shows tokens in real-time
- [ ] Streaming artifact sends single event and closes
- [ ] Job status polling works (5s intervals)
- [ ] SSE event stream receives completion notifications
- [ ] Progress bar updates correctly (0-100)
- [ ] Error handling displays user-friendly messages
- [ ] All 6 status states handled properly

---

## Error Responses

All endpoints may return standard error responses:

**401 Unauthorized**:
```json
{
  "error": "Invalid or missing authentication token",
  "detail": "...",
  "timestamp": "..."
}
```

**404 Not Found**:
```json
{
  "error": "Job not found: job-uuid",
  "detail": "The requested job does not exist",
  "timestamp": "..."
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to process request",
  "detail": "Worker timeout exceeded",
  "timestamp": "..."
}
```

---

## Implementation Notes

### Backend Guarantees (DO NOT CHANGE)

✅ Intent routing already works (chat vs artifact detection)
✅ Async job system with worker pool functional
✅ Multi-phase pipeline (planning → generation → validation)
✅ 6 operational safety features implemented
✅ SSE event bus for real-time notifications
✅ Atomic job claiming prevents race conditions
✅ Token budget enforcement (12k tokens max)
✅ LLM timeouts per phase (45s/90s/45s/60s)
✅ Stuck job recovery on worker restart

### Frontend Requirements

**Required Changes**:
- ✅ Parse `type` field to distinguish chat vs artifacts
- ✅ Display chat messages directly from `message` field
- ✅ For artifacts, poll `/status/{job_id}` or subscribe to SSE
- ✅ Remove markdown parsing for artifact detection
- ✅ Handle all 6 status states properly
- ✅ Show progress bar during generation (0-100)
- ✅ Display artifact when status = completed
- ✅ Show error when status = failed

**Recommended Patterns**:
- Use SSE events instead of polling (more efficient)
- Poll every 5s if SSE not available
- Show loading spinner during planning/generating/validating
- Display phase-specific messages ("Analyzing structure...", "Generating content...", "Validating quality...")
- Implement exponential backoff for failed requests
- Cache completed artifacts locally

---

## Contract Version

**Version**: 1.0
**Last Updated**: 2026-02-08
**Breaking Changes**: None (initial version)

---

**This API contract is stable and ready for frontend integration. No backend architecture changes required.**
