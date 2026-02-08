# Realtime Event System - Lightweight Notifications

## Overview

The artifact job system now includes an in-process event bus for realtime notifications. When jobs complete or fail, events are published to all subscribers.

**Architecture:**
- In-process pub-sub (no external infrastructure)
- Server-Sent Events (SSE) for HTTP clients
- User-filtered event streams
- Async handler execution

---

## Event Types

### artifact.completed

Published when artifact job completes successfully.

**Payload:**
```json
{
  "job_id": "abc123",
  "user_id": "user456",
  "artifact_type": "quiz",
  "notebook_id": "session789",
  "timestamp": "2026-02-08T10:30:15Z",
  "result": {
    "questions": [...]
  }
}
```

### artifact.failed

Published when artifact job fails (after retry exhaustion).

**Payload:**
```json
{
  "job_id": "abc123",
  "user_id": "user456",
  "artifact_type": "flashcards",
  "notebook_id": "session789",
  "timestamp": "2026-02-08T10:30:45Z",
  "error": "Validation failed after 2 repair attempts",
  "retry_count": 1
}
```

---

## Usage: HTTP Client (SSE)

### Connect to Event Stream

```bash
# Connect with authentication
curl -N -H "Authorization: Bearer <token>" \
  http://localhost:8000/ai/artifact/events/stream
```

**Response (SSE format):**
```
data: {"type":"connected","user_id":"user456"}

data: {"job_id":"abc123","user_id":"user456","artifact_type":"quiz","notebook_id":"session789","timestamp":"2026-02-08T10:30:15Z","result":{...}}

: keepalive

data: {"job_id":"def456","user_id":"user456","artifact_type":"flashcards","notebook_id":"session999","timestamp":"2026-02-08T10:30:45Z","error":"...","retry_count":1}
```

### JavaScript Client

```javascript
// Connect to event stream
const evtSource = new EventSource('/ai/artifact/events/stream', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Handle messages
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'connected') {
    console.log('Connected to event stream');
    return;
  }

  // Handle artifact events
  if (data.job_id) {
    if (data.result) {
      // Artifact completed
      console.log(`Job ${data.job_id} completed:`, data.result);
      updateUI(data.job_id, 'completed', data.result);
    } else if (data.error) {
      // Artifact failed
      console.error(`Job ${data.job_id} failed:`, data.error);
      updateUI(data.job_id, 'failed', data.error);
    }
  }
};

// Handle errors
evtSource.onerror = (err) => {
  console.error('EventSource failed:', err);
  evtSource.close();
};

// Close when done
// evtSource.close();
```

### Python Client

```python
import requests
import json

# Connect to SSE stream
url = "http://localhost:8000/ai/artifact/events/stream"
headers = {"Authorization": f"Bearer {token}"}

with requests.get(url, headers=headers, stream=True) as response:
    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')

            # Skip keepalive pings
            if line.startswith(':'):
                continue

            # Parse SSE data
            if line.startswith('data: '):
                data_json = line[6:]  # Remove "data: " prefix
                event = json.loads(data_json)

                if event.get('type') == 'connected':
                    print(f"Connected as user {event['user_id']}")

                elif event.get('job_id'):
                    if 'result' in event:
                        print(f"✅ Job {event['job_id']} completed")
                    elif 'error' in event:
                        print(f"❌ Job {event['job_id']} failed: {event['error']}")
```

---

## Usage: In-Process Subscription

### Custom Event Handler

```python
from events import get_event_bus
import asyncio

# Define async handler
async def my_handler(event_data: dict):
    job_id = event_data['job_id']
    user_id = event_data['user_id']
    artifact_type = event_data['artifact_type']

    if 'result' in event_data:
        # Completed
        print(f"✅ {artifact_type} completed for {user_id}: {job_id}")

        # Do something with result
        result = event_data['result']
        # ... custom logic ...

    elif 'error' in event_data:
        # Failed
        print(f"❌ {artifact_type} failed for {user_id}: {event_data['error']}")

# Subscribe to events
event_bus = get_event_bus()
event_bus.subscribe("artifact.completed", my_handler)
event_bus.subscribe("artifact.failed", my_handler)

# Events will be published automatically by worker
# No need to manually publish unless extending system
```

### Publishing Custom Events

```python
from events import get_event_bus
from datetime import datetime

# Get event bus
event_bus = get_event_bus()

# Publish custom event
await event_bus.publish(
    event_type="artifact.completed",
    event_data={
        "job_id": "job123",
        "user_id": "user456",
        "artifact_type": "quiz",
        "notebook_id": "session789",
        "timestamp": datetime.utcnow().isoformat(),
        "result": {"questions": [...]}
    }
)
```

---

## Architecture Details

### Event Bus

**File:** `events/event_bus.py`

Simple in-process pub-sub:
- Handlers stored in memory (defaultdict)
- Async execution of all handlers
- No persistence or queuing
- Thread-safe publishing

**Methods:**
- `subscribe(event_type, handler)` - Register handler
- `unsubscribe(event_type, handler)` - Remove handler
- `publish(event_type, event_data)` - Emit event to all subscribers

### Worker Integration

**File:** `jobs/artifact_worker.py`

Worker publishes events at completion:

```python
# On success
await self._publish_completed_event(job, result)

# On failure
await self._publish_failed_event(job, error)
```

Events published AFTER job status updated in database.

### SSE Endpoint

**File:** `server/routes/artifact.py`

**Endpoint:** `GET /ai/artifact/events/stream`

1. Client connects with JWT auth
2. Creates async queue for this client
3. Subscribes handler to event bus (filtered by user_id)
4. Streams events to client as SSE
5. Sends keepalive every 30s
6. Unsubscribes on disconnect

---

## Example: End-to-End Flow

### 1. Client Connects to SSE Stream

```javascript
const eventSource = new EventSource('/ai/artifact/events/stream');
console.log('Listening for artifact events...');
```

### 2. Client Creates Artifact Job

```javascript
const response = await fetch('/ai/artifact/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    notebook_id: 'session123',
    artifact_type: 'quiz',
    content: 'Create a quiz on photosynthesis',
    options: { num_questions: 5 }
  })
});

const { job_id } = await response.json();
console.log(`Job created: ${job_id}`);
```

### 3. Worker Processes Job

```
[10:30:00] ⚙️ Processing job abc123 (type=quiz)
[10:30:05] ✓ Plan created
[10:30:12] ✓ Generated artifact
[10:30:15] ✓ Validation passed
[10:30:15] ✅ Job abc123 completed
[10:30:15] 📤 Published artifact.completed event
```

### 4. Client Receives SSE Event

```javascript
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.job_id === 'abc123') {
    console.log('Quiz completed!', data.result);
    displayQuiz(data.result);
  }
};
```

**SSE Message:**
```
data: {"job_id":"abc123","user_id":"user456","artifact_type":"quiz","notebook_id":"session123","timestamp":"2026-02-08T10:30:15Z","result":{"questions":[...]}}
```

---

## Benefits

### 1. No Polling Required
- Client connects once
- Server pushes updates
- Instant notifications

### 2. Lightweight
- In-process (no Redis/Kafka)
- ~100 lines total
- Easy to understand

### 3. User Isolation
- Events filtered by user_id
- Each client only sees their jobs
- Secure by default

### 4. Extensible
- Easy to add new event types
- Custom handlers can subscribe
- Future: voice notifications, webhooks, etc.

---

## Limitations

### Not for Distributed Systems

This is an **in-process** event bus:
- Events only reach handlers in same process
- No persistence across restarts
- No delivery guarantees

For distributed systems:
- Use Redis Pub/Sub
- Use message queues (RabbitMQ, Kafka)
- Use webhooks

### Current Design is Sufficient For:
- Single-server deployments
- Realtime UI updates
- Voice notification triggers
- Internal service communication

---

## Future Enhancements

**Possible extensions (not yet implemented):**

### 1. Event Persistence
```python
event_bus.subscribe("artifact.completed", save_to_db_handler)
```

### 2. Webhooks
```python
async def webhook_handler(event_data):
    await http_client.post(user.webhook_url, json=event_data)

event_bus.subscribe("artifact.completed", webhook_handler)
```

### 3. Voice Notifications
```python
async def voice_notification_handler(event_data):
    if voice_session_active(event_data['user_id']):
        await tts_service.speak(f"Your {event_data['artifact_type']} is ready")

event_bus.subscribe("artifact.completed", voice_notification_handler)
```

### 4. Additional Event Types
```python
# Job started
event_bus.publish("artifact.started", {...})

# Progress updates
event_bus.publish("artifact.progress", {"job_id": "...", "progress": 60})

# Job cancelled
event_bus.publish("artifact.cancelled", {...})
```

---

## Testing

### Manual Test (curl)

Terminal 1 (SSE client):
```bash
curl -N -H "Authorization: Bearer <token>" \
  http://localhost:8000/ai/artifact/events/stream
```

Terminal 2 (create job):
```bash
curl -X POST http://localhost:8000/ai/artifact/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "notebook_id": "test123",
    "artifact_type": "quiz",
    "content": "Create quiz on cells",
    "options": {}
  }'
```

Watch Terminal 1 for event when job completes.

### Python Test

```python
import asyncio
from events import get_event_bus

# Test handler
async def test_handler(event_data):
    print(f"Received event: {event_data}")

# Subscribe
bus = get_event_bus()
bus.subscribe("artifact.completed", test_handler)

# Simulate event
await bus.publish("artifact.completed", {
    "job_id": "test123",
    "user_id": "testuser",
    "artifact_type": "quiz",
    "notebook_id": "session",
    "timestamp": "2026-02-08T10:30:00Z",
    "result": {"questions": []}
})

# Output: Received event: {...}
```

---

## Summary

✅ **Lightweight in-process event system**
✅ **Server-Sent Events endpoint for HTTP clients**
✅ **Worker integration (publishes on complete/fail)**
✅ **User-filtered event streams**
✅ **~150 lines total implementation**

The system is ready for realtime UI updates and future voice notification integration.
