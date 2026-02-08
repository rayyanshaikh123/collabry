# Real-Time AI Classroom Tutor - Implementation Guide

## Overview

This is a **state-driven pedagogical agent** built on LiveKit for real-time voice tutoring. Unlike chatbots, this system proactively drives teaching sessions using deterministic state machines where the LLM only generates natural language responses—never makes teaching decisions.

## Architecture

### Core Principles

1. **Separation of Intelligence from Language**
   - Decision making = deterministic code (state machines)
   - Speech generation = LLM (GPT-4o-mini)

2. **The LLM NEVER chooses what to do next**
   - It only verbalizes predetermined actions

3. **Event-Driven System**
   ```
   LiveKit events → Classroom events → State machine → Action → LLM → TTS
   ```

4. **No Intent Classifiers or Autonomous Agents**
   - Only controlled teacher state machine

---

## System Components

### LAYER 1: Transport (LiveKit)
- **File**: `ai-engine/core/livekit_manager.py`
- **Purpose**: Room creation, token generation, participant management
- **Key Methods**:
  - `create_classroom_room()` - Creates LiveKit room
  - `generate_student_token()` - Student access token
  - `generate_agent_token()` - AI tutor access token

### LAYER 2: Conversation Engine (Voice Agent)
- **File**: `ai-engine/core/voice_agent.py`
- **Purpose**: Audio I/O pipeline, STT/TTS integration
- **Produces Events**:
  - `STUDENT_SPOKE` - Transcribed utterance
  - `SILENCE` - Prolonged silence detected
  - `INTERRUPTION` - Student interrupted tutor
  - `JOIN` / `LEAVE` - Participant events

### LAYER 3: Classroom Intelligence (State Machine)
- **File**: `ai-engine/core/teaching_engine.py`
- **Purpose**: The brain - makes ALL teaching decisions
- **State Phases**:
  ```python
  SETUP → INTRODUCTION → TEACHING → INTERACTION → ASSESSMENT → REVISION → SUMMARY → END
  ```
- **Teaching Loop**:
  ```python
  EXPLAIN → ASK → WAIT → EVALUATE → ADAPT → CONTINUE
  ```
- **Actions**:
  - `EXPLAIN_CONCEPT` - Present new topic
  - `ASK_QUESTION` - Test comprehension
  - `SIMPLIFY` - Re-explain at lower difficulty
  - `GIVE_HINT` - Provide clue
  - `CALL_STUDENT` - Prompt inactive student
  - `RECAP` - Summarize previous topics
  - `ADVANCE_TOPIC` - Move to next topic

### LAYER 4: Knowledge Engine (Curriculum)
- **File**: `ai-engine/core/curriculum.py`
- **Purpose**: Structured sequential teaching content
- **Structure**:
  ```
  LessonPlan
    └─ Topics
        └─ Subtopics (atomic concepts)
            └─ Questions (easy/medium/hard)
  ```
- **NOT semantic search** - predetermined topic progression like a real teacher

---

## Data Models

### Student Profile
```python
{
  "user_id": str,
  "notebook_id": str,
  
  # Real-time metrics (0.0 - 1.0)
  "attention_score": float,      # Engagement
  "understanding_score": float,  # Comprehension
  "confidence_level": float,     # Based on response patterns
  "participation_rate": float,   # % spoke when prompted
  
  # Behavioral patterns
  "avg_response_latency_ms": float,
  "interruption_frequency": float,
  "weak_topics": [str],
  "strong_topics": [str]
}
```

### Voice Session
```python
{
  "session_id": str,
  "user_id": str,
  "notebook_id": str,
  "room_name": str,
  
  # Teaching state
  "current_phase": "TEACHING",
  "current_topic": str,
  "topics_covered": [str],
  
  # Metrics
  "total_duration_seconds": int,
  "questions_asked": int,
  "questions_answered_correctly": int,
  
  # Transcript
  "turns": [
    {
      "speaker": "student" | "tutor",
      "text": str,
      "timestamp": datetime
    }
  ]
}
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd ai-engine
pip install -r requirements.txt
```

**New dependencies added**:
- `livekit>=0.11.0`
- `livekit-api>=0.5.0`
- `openai>=1.10.0` (Whisper STT + TTS)
- `webrtcvad>=2.0.10` (Voice Activity Detection)

### 2. Configure Environment

Copy `.env.example` to `.env` and set:

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_WS_URL=wss://your-project.livekit.cloud

# OpenAI (for Whisper STT and TTS)
OPENAI_API_KEY=sk-...

# Existing MongoDB, JWT, etc.
MONGO_URI=mongodb://localhost:27017
JWT_SECRET_KEY=your-jwt-secret
```

**Getting LiveKit Credentials**:
1. Go to https://cloud.livekit.io/
2. Create a project
3. Copy API Key, Secret, and WebSocket URL

### 3. Start AI Engine

```bash
cd ai-engine
python run_server.py
```

Server starts on `http://localhost:8000`

### 4. Frontend (Next.js)

```bash
cd frontend
npm install @livekit/components-react livekit-client  # If using full LiveKit UI
npm run dev
```

Navigate to: `http://localhost:3000/study-notebook/[notebook-id]/voice-tutor`

---

## API Endpoints

### Create Voice Tutor Room
```http
POST /voice/rooms
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "notebook_id": "string",
  "username": "string" (optional)
}
```

**Response**:
```json
{
  "room_name": "tutor_notebook123_user456_1738989600",
  "student_token": "eyJ...",
  "ws_url": "wss://your-project.livekit.cloud",
  "session_id": "session_tutor_..."
}
```

### Get Session Status
```http
GET /voice/sessions/{session_id}
Authorization: Bearer {jwt_token}
```

### End Session
```http
DELETE /voice/sessions/{session_id}
Authorization: Bearer {jwt_token}
```

---

## How It Works

### 1. Session Creation Flow

```mermaid
sequenceDiagram
    Student->>Backend: POST /voice/rooms
    Backend->>LiveKit: Create room
    Backend->>Backend: Generate tokens
    Backend->>Background: Start Voice Agent
    Backend-->>Student: Return credentials
    Student->>LiveKit: Connect with token
    Voice Agent->>LiveKit: Connect with token
    Voice Agent->>Teaching Engine: Initialize
    Teaching Engine->>Voice Agent: "Hello! Let's start..."
    Voice Agent->>LiveKit: TTS audio stream
```

### 2. Teaching Loop Example

```
1. [TEACHING/EXPLAIN] Tutor: "Photosynthesis is the process plants use to convert light into energy..."

2. [TEACHING/ASK] Tutor: "Can you tell me what are the main inputs needed?"

3. [TEACHING/WAIT] (Voice Agent listens for student response)

4. [Event: STUDENT_SPOKE] Student: "Um... sunlight and water?"

5. [TEACHING/EVALUATE] Teaching Engine evaluates with LLM
   → is_correct = False (missing CO₂)

6. [TEACHING/ADAPT] Teaching Engine decides: GIVE_HINT

7. [LLM generates speech] "Good start! You're right about sunlight and water. What about the gas plants take in from the air?"

8. [TEACHING/WAIT] (Listening again)

9. [Event: STUDENT_SPOKE] Student: "Carbon dioxide!"

10. [TEACHING/EVALUATE] → is_correct = True
    → correct_answers_streak = 1

11. [TEACHING/CONTINUE] Teaching Engine decides: ASK_QUESTION (same difficulty)

12. Repeat until correct_answers_streak >= 2
    → ADVANCE_TOPIC
```

### 3. Engagement Detection

**Behavioral Signals**:
- Long silence (>5s waiting for answer) → `GIVE_HINT`
- Very long silence (>10s) → `SIMPLIFY`
- Multiple silences during explanation → `CALL_STUDENT`
- Interruption → Student likely confused or has question
- Short answers (<3 words) → Low confidence

**Engagement Score Calculation**:
```python
engagement = (
    0.4 * recency_score +      # How recently student spoke
    0.3 * participation_score + # % of questions answered
    0.3 * quality_score        # Correctness rate
)
```

**Actions Triggered**:
- Engagement < 0.3 → Cold call student
- Understanding < 0.3 → Simplify explanations
- Understanding > 0.7 → Increase difficulty

---

## Curriculum Structure

### Default: Photosynthesis Example

Located: `ai-engine/data/curricula/`

```json
{
  "id": "curriculum_bio101",
  "title": "Introduction to Photosynthesis",
  "topics": [
    {
      "id": "topic_1",
      "name": "What is Photosynthesis?",
      "subtopics": [
        {
          "id": "subtopic_1_1",
          "name": "Definition and Overview",
          "content": "Photosynthesis is the process...",
          "key_concepts": ["light energy", "glucose", "oxygen"]
        }
      ]
    }
  ]
}
```

### Question Bank Structure

Located: `ai-engine/data/questions/`

```json
[
  {
    "id": "q_1_1_1",
    "text": "What is photosynthesis?",
    "expected_answer": "Process by which plants convert light energy into chemical energy",
    "difficulty": "easy",
    "type": "factual",
    "hints": ["Think about what plants do with sunlight"]
  }
]
```

---

## Database Collections

### voice_tutor_sessions
```javascript
{
  _id: ObjectId,
  session_id: String,
  user_id: String,
  notebook_id: String,
  room_name: String,
  status: "active" | "completed" | "interrupted",
  current_phase: String,
  topics_covered: Array,
  turns: Array,
  ...metrics
}
```

### student_profiles
```javascript
{
  _id: ObjectId,
  user_id: String,
  notebook_id: String,
  attention_score: Number,
  understanding_score: Number,
  weak_topics: Array,
  ...behavioral_data
}
```

---

## Testing

### 1. Unit Tests

```bash
cd ai-engine
pytest tests/test_teaching_engine.py
pytest tests/test_curriculum.py
```

### 2. Integration Test

```python
# Test full flow
async def test_voice_tutor_session():
    # 1. Create room
    room_data = await create_tutor_room(notebook_id="test", user_id="alice")
    
    # 2. Initialize components
    voice_agent = VoiceTutorAgent(room_data["room_name"], "test_session")
    teaching_engine = ClassroomIntelligenceEngine("test_session", "alice", "test")
    
    # 3. Simulate events
    await voice_agent.event_queue.put(ParticipantJoinEvent(...))
    action = await teaching_engine.handle_event(event)
    
    assert action == TeachingAction.EXPLAIN_CONCEPT
```

### 3. Manual Testing

1. Start AI Engine: `python run_server.py`
2. Open frontend: `http://localhost:3000/study-notebook/[id]/voice-tutor`
3. Allow microphone permissions
4. Verify:
   - Tutor greets you within 5 seconds
   - Say "hello" → Tutor responds
   - Wait 10 seconds silently → Tutor prompts you
   - Answer questions → Check engagement score updates

---

## Extending the System

### Add New Subject

1. **Create Curriculum File**:
   ```bash
   ai-engine/data/curricula/chemistry101.json
   ```

2. **Define Topics/Subtopics**:
   ```json
   {
     "id": "curriculum_chemistry101",
     "title": "Introduction to Chemistry",
     "topics": [...]
   }
   ```

3. **Generate Question Bank**:
   ```bash
   ai-engine/data/questions/{subtopic_id}.json
   ```

### Add Tavus Avatar (Visual Teacher)

Replace `VoiceTutorAgent` with Tavus SDK:

```python
from livekit.plugins import tavus

avatar = tavus.AvatarSession(
    replica_id="your-replica-id",
    persona_id="your-persona-id"
)

await avatar.start(session, room=room)
```

### Add Multi-Student Support

Currently supports 1:1 tutoring. For multi-student:

1. Track multiple `StudentProfile` instances
2. Modify state machine to handle multiple `STUDENT_SPOKE` events
3. Implement turn-taking logic
4. Add student identification in transcript

---

## Production Deployment

### Prerequisites
- LiveKit Cloud account (paid plan for production)
- OpenAI API key with sufficient credits
- MongoDB Atlas or self-hosted MongoDB
- SSL certificates for HTTPS/WSS

### Environment Variables (Production)

```env
LIVEKIT_API_KEY=prod_key_...
LIVEKIT_API_SECRET=prod_secret_...
LIVEKIT_WS_URL=wss://your-production.livekit.cloud

OPENAI_API_KEY=sk-prod-...

MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/collabry

JWT_SECRET_KEY=<64-character-random-hex>
```

### Cost Estimates

**Per 1-hour session**:
- LiveKit Cloud: ~$0.004/minute = $0.24
- OpenAI Whisper: ~$0.006/minute = $0.36
- OpenAI TTS: ~$15/1M characters ≈ $0.15 (assuming 10k chars spoken)
- OpenAI GPT-4o-mini: ~$0.15/1M input tokens ≈ $0.05

**Total**: ~$0.80 per hour per student

### Scaling Considerations

- **Concurrent sessions**: LiveKit Cloud handles load balancing
- **High traffic**: Consider self-hosted LiveKit server
- **Cost optimization**:
  - Batch STT requests
  - Cache LLM responses for common questions
  - Use local Whisper for STT (trade latency for cost)

---

## Troubleshooting

### Issue: Voice Agent won't connect
**Check**:
1. LiveKit credentials in `.env`
2. WebSocket URL format (must start with `wss://` or `ws://`)
3. Network firewall rules

### Issue: No speech detected
**Check**:
1. Microphone permissions in browser
2. VAD threshold in `SimpleVAD` class
3. Audio track subscription in LiveKit

### Issue: Teaching engine loops forever
**Check**:
1. Curriculum file exists for notebook
2. Question bank has questions for all subtopics
3. `correct_answers_streak` condition in state machine

### Issue: LLM evaluation always wrong
**Check**:
1. OpenAI API key valid
2. Network connectivity to OpenAI
3. Fallback keyword matching in `_evaluate_answer()`

---

## Architecture Decisions

### Why extend AI Engine instead of separate service?
- **User preference** for simpler deployment
- FastAPI handles background tasks well with `asyncio`
- Fewer services to manage

**Tradeoff**: FastAPI not optimized for long-lived WebSocket connections, but manageable for MVP.

### Why OpenAI Whisper/TTS instead of alternatives?
- **Cheapest** STT/TTS option
- **Good quality** for educational use case
- **Lowest integration complexity**

**Alternative**: Deepgram (faster) or ElevenLabs (more natural voice)

### Why hard-coded curriculum instead of RAG generation?
- **Deterministic teaching flow** requires structured content
- **Quality control** over teaching sequence
- **MVP priority** - RAG curriculum generation planned for v2

### Why no visual avatar in MVP?
- **Audio-only** sufficient for teaching
- **Cost reduction** (no Tavus API needed)
- **Faster to implement**

**Can add later**: Tavus avatar or simple animated avatar

---

## Next Steps

### Immediate (MVP Complete)
- [x] LiveKit integration
- [x] State machine implementation
- [x] Student modeling
- [x] Basic curriculum
- [x] Frontend UI

### Short-term (v1.1)
- [ ] Full LiveKit audio integration (replace stub)
- [ ] Real-time transcript updates
- [ ] Session analytics dashboard
- [ ] Multi-topic curricula

### Medium-term (v1.2)
- [ ] Generate curriculum from uploaded documents
- [ ] Visual avatar (Tavus or custom)
- [ ] Multi-student support (classrooms)
- [ ] Formal assessments (quizzes)

### Long-term (v2.0)
- [ ] Adaptive difficulty per topic (fine-grained)
- [ ] Learning style detection
- [ ] Parent/teacher dashboard
- [ ] Multi-language support

---

## Support & Documentation

- **Codebase**: `collabry/ai-engine/core/`
- **API Docs**: http://localhost:8000/docs
- **LiveKit Docs**: https://docs.livekit.io/
- **OpenAI Whisper**: https://platform.openai.com/docs/guides/speech-to-text

## License

MIT License - See LICENSE file

---

**Built with ❤️ using deterministic state machines, not prompt engineering.**
