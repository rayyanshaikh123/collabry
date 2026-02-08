# Artifact Generation Pipeline - Multi-Phase Architecture

## Overview

The artifact job system now uses a deterministic 3-phase pipeline:

1. **Planning** - Analyze content and plan structure
2. **Generation** - Generate artifact from plan
3. **Validation** - Verify output quality

Each phase updates job status and progress independently, enabling:
- Fine-grained progress tracking
- Better error recovery
- Consistent output quality
- Idempotent request handling

---

## Job Lifecycle States

```
pending → planning → generating → validating → completed
                                            ↓
                                          failed
```

### State Progression:

| State | Progress | Description |
|-------|----------|-------------|
| `pending` | 0% | Job created, waiting for worker |
| `planning` | 0-20% | Analyzing content, identifying structure |
| `generating` | 20-60% | Creating artifact content from plan |
| `validating` | 60-90% | Verifying structure and quality |
| `completed` | 100% | Artifact ready |
| `failed` | - | Error occurred (with retry) |

---

## Request Flow with Idempotency

### Job Creation (with fingerprint):

```python
# 1. User sends artifact request
POST /ai/chat
{
  "message": "Create a quiz on photosynthesis",
  "session_id": "session123"
}

# 2. Intent router detects artifact mode
intent = classify("Create a quiz on photosynthesis")
# → mode="artifact", artifact_type="quiz"

# 3. Generate request fingerprint
fingerprint = hash(user_id + notebook_id + artifact_type + source_ids + options)
# → "a7f9b2c3d4e5f6..."

# 4. Check for existing active job with same fingerprint
existing_job = find_active_job_by_fingerprint(fingerprint)

if existing_job:
    # IDEMPOTENCY: Return existing job_id
    return {"job_id": existing_job.id, "status": existing_job.status}

# 5. Create new job with fingerprint
job = create_job(
    user_id="user123",
    job_request={
        "notebook_id": "session123",
        "artifact_type": "quiz",
        "content": "Create a quiz on photosynthesis",
        "options": {"num_questions": 5}
    },
    retrieval_snapshot={
        "chunks": [...],  # RAG chunks captured at request time
        "source_ids": ["doc1", "doc2"],
        "captured_at": "2026-02-08T10:30:00Z"
    }
)

# 6. Return job_id immediately
return {
    "type": "artifact_job_created",
    "job_id": "job456",
    "status": "pending",
    "artifact_type": "quiz"
}
```

---

## Worker Processing (3 Phases)

### Phase 1: Planning (0% → 20%)

```python
# Worker fetches pending job (atomic)
job = fetch_pending_job()
# → status changes: pending → planning (atomic in MongoDB)

# Load retrieval snapshot (NO re-querying vector DB)
chunks = load_retrieval_snapshot(job)
# → ["Photosynthesis is...", "Chloroplasts contain...", ...]

# Call ArtifactAgent.plan()
plan = artifact_agent.plan(
    artifact_type="quiz",
    chunks=chunks
)

# Plan output:
# {
#   "concepts": [
#     "photosynthesis process",
#     "chloroplast function",
#     "light-dependent reactions",
#     "Calvin cycle",
#     "ATP synthesis"
#   ]
# }

# Store plan in job
store_plan(job_id, plan)
update_progress(job_id, 20)

LOG: "✓ Plan created: 5 concepts identified"
```

### Phase 2: Generation (20% → 60%)

```python
# Mark job as generating
mark_generating(job_id)
# → status: planning → generating, progress: 20%

# Call ArtifactAgent.generate_from_plan()
result = artifact_agent.generate_from_plan(
    plan=plan,  # Use plan from phase 1
    chunks=chunks,  # Same chunks, no re-query
    options={"num_questions": 5, "difficulty": "medium"}
)

# Result output:
# {
#   "questions": [
#     {
#       "question": "What is the primary function of chloroplasts?",
#       "options": [
#         "Photosynthesis",
#         "Respiration",
#         "Protein synthesis",
#         "DNA replication"
#       ],
#       "correct_answer": "Photosynthesis",
#       "explanation": "Chloroplasts are the organelles where..."
#     },
#     # ... 4 more questions
#   ]
# }

update_progress(job_id, 60)

LOG: "✓ Generated artifact: 5 questions"
```

### Phase 3: Validation (60% → 100%)

```python
# Mark job as validating
mark_validating(job_id)
# → status: generating → validating, progress: 60%

update_progress(job_id, 90)

# Validate artifact structure
validation = validate_artifact("quiz", result)

if not validation["valid"]:
    # Validation failed
    mark_failed(job_id, validation["error"])
    # → Retry once (resets to pending)
    # → If retry also fails, permanently failed
    return

# Validation passed
update_progress(job_id, 100)
mark_completed(job_id, result)
# → status: validating → completed

LOG: "✅ Job completed successfully"
```

---

## Example Lifecycle Trace (Full)

```
[2026-02-08 10:30:00] 🎯 Intent classified: artifact (quiz)
[2026-02-08 10:30:00] 🔍 Fingerprint: a7f9b2c3d4e5f6...
[2026-02-08 10:30:00] ✓ Created job: job456
[2026-02-08 10:30:00] → Status: pending (0%)

[2026-02-08 10:30:02] ⚙️ Worker fetched job: job456
[2026-02-08 10:30:02] → Status: planning (0%)

[2026-02-08 10:30:02] 📋 Phase 1: Planning quiz structure...
[2026-02-08 10:30:03] → Loaded 3 chunks from snapshot
[2026-02-08 10:30:05] → LLM planning call complete
[2026-02-08 10:30:05] ✓ Plan created: 5 concepts
[2026-02-08 10:30:05] → Status: planning (20%)

[2026-02-08 10:30:05] 🔨 Phase 2: Generating quiz content...
[2026-02-08 10:30:05] → Status: generating (20%)
[2026-02-08 10:30:12] → LLM generation call complete
[2026-02-08 10:30:12] ✓ Generated artifact: 5 questions
[2026-02-08 10:30:12] → Status: generating (60%)

[2026-02-08 10:30:12] ✅ Phase 3: Validating quiz...
[2026-02-08 10:30:12] → Status: validating (60%)
[2026-02-08 10:30:13] → Checking structure (90%)
[2026-02-08 10:30:13] ✓ Validation passed
[2026-02-08 10:30:13] → Status: completed (100%)

[2026-02-08 10:30:13] ✅ Job job456 completed successfully
```

---

## Retry Example (Validation Failure)

```
[2026-02-08 10:30:00] ✓ Created job: job789
[2026-02-08 10:30:02] ⚙️ Worker processing job789

[Phase 1] → planning → 20%
[Phase 2] → generating → 60%
[Phase 3] → validating → 90%

[2026-02-08 10:30:15] ✗ Validation failed: Missing 'questions' field
[2026-02-08 10:30:15] → Retry 1/1 queued
[2026-02-08 10:30:15] → Status: pending (0%)

[2026-02-08 10:30:17] ⚙️ Worker fetched job789 (retry 1)
[2026-02-08 10:30:17] → Status: planning (0%)

[Phase 1] → planning → 20%
[Phase 2] → generating → 60%
[Phase 3] → validating → 90%

[2026-02-08 10:30:30] ✓ Validation passed
[2026-02-08 10:30:30] → Status: completed (100%)
```

---

## Idempotency Example

```
# Request 1 (initial)
POST /ai/chat {"message": "Create quiz on cells"}
→ fingerprint: abc123
→ No existing job found
→ Created job: job100
→ Returns: {"job_id": "job100", "status": "pending"}

# Request 2 (duplicate, 2 seconds later)
POST /ai/chat {"message": "Create quiz on cells"}
→ fingerprint: abc123 (same!)
→ Found existing active job: job100 (status: planning)
→ Returns: {"job_id": "job100", "status": "planning"} (same job)

# Request 3 (after completion)
POST /ai/chat {"message": "Create quiz on cells"}
→ fingerprint: abc123
→ Found existing job: job100 (status: completed, not active)
→ Created new job: job101
→ Returns: {"job_id": "job101", "status": "pending"}
```

---

## Retrieval Snapshot Behavior

### Snapshot Captured at Job Creation:

```python
# At job creation time (in router or endpoint):
if source_ids:
    # Query RAG at request time
    docs = rag_retriever.get_relevant_documents(
        query=user_input,
        source_ids=source_ids,
        k=5
    )

    # Create snapshot
    retrieval_snapshot = {
        "chunks": [
            {
                "text": doc.page_content,
                "source_id": doc.metadata.get("source_id"),
                "chunk_id": doc.metadata.get("chunk_id")
            }
            for doc in docs
        ],
        "source_ids": source_ids,
        "embedding_version": "v1",
        "captured_at": datetime.utcnow().isoformat()
    }
else:
    retrieval_snapshot = None

# Store snapshot with job
job = create_job(
    user_id=user_id,
    job_request=job_request,
    retrieval_snapshot=retrieval_snapshot
)
```

### Worker Uses Snapshot:

```python
# Worker NEVER queries vector DB
# Uses only snapshot from job creation

chunks = load_retrieval_snapshot(job)

if job.retrieval_snapshot:
    # Extract chunk texts from snapshot
    chunks = [
        chunk["text"]
        for chunk in job.retrieval_snapshot["chunks"]
    ]
else:
    # No RAG, use job content
    chunks = [job.content]

# Chunks stay the same for all retries
# Deterministic: same input → same output
```

---

## Benefits of Multi-Phase Pipeline

### 1. Deterministic Output
- Planning phase identifies structure BEFORE generation
- Same plan always produces consistent artifacts
- Reduces non-determinism from model improvisation

### 2. Better Error Recovery
- Validation failures can retry with same plan
- Plan persists across retries
- No need to re-plan on retry

### 3. Progress Visibility
- Client sees exactly which phase is running
- Fine-grained progress: 0% → 20% → 60% → 90% → 100%
- Better UX (no "black box" waiting)

### 4. Idempotency
- Duplicate requests return same job_id
- No duplicate work
- Consistent for concurrent requests

### 5. Snapshot Isolation
- Chunks captured once at request time
- Worker never re-queries vector DB
- Plan and generation use identical context

---

## API Usage

### Create Artifact Job:

```bash
POST /ai/chat
Authorization: Bearer <token>

{
  "message": "Create a quiz on photosynthesis",
  "session_id": "session123"
}

Response:
{
  "type": "artifact_job_created",
  "job_id": "abc123",
  "status": "pending",
  "artifact_type": "quiz",
  "message": "Artifact generation job created. Job ID: abc123"
}
```

### Poll Job Status:

```bash
GET /ai/artifact/abc123
Authorization: Bearer <token>

Response (planning):
{
  "job_id": "abc123",
  "status": "planning",
  "progress": 10,
  "artifact_type": "quiz",
  "created_at": "2026-02-08T10:30:00Z",
  "updated_at": "2026-02-08T10:30:02Z"
}

Response (generating):
{
  "job_id": "abc123",
  "status": "generating",
  "progress": 40,
  ...
}

Response (completed):
{
  "job_id": "abc123",
  "status": "completed",
  "progress": 100,
  "artifact_type": "quiz",
  "result": {
    "questions": [...]
  },
  "created_at": "2026-02-08T10:30:00Z",
  "updated_at": "2026-02-08T10:30:15Z"
}
```

---

## Implementation Summary

### New Job Fields:
- `status`: Added `planning` and `generating` states
- `retrieval_snapshot`: RAG chunks captured at creation
- `request_fingerprint`: SHA256 hash for idempotency
- `plan`: Structure from planning phase

### New Service Methods:
- `_generate_fingerprint()`: Create deterministic hash
- `_find_active_job_by_fingerprint()`: Idempotency check
- `store_plan()`: Save planning phase output
- `mark_generating()`: Phase 2 transition

### New Agent Methods:
- `ArtifactAgent.plan()`: Phase 1 - structure planning
- `ArtifactAgent.generate_from_plan()`: Phase 2 - content generation
- Legacy `generate()` kept for backward compatibility

### Worker Changes:
- 3-phase pipeline: planning → generating → validating
- `_load_retrieval_snapshot()`: Load chunks from job (no DB query)
- Progress mapping: 0% → 20% → 60% → 90% → 100%

---

**Architecture complete. The artifact pipeline is now deterministic, idempotent, and provides fine-grained progress tracking through all phases.**
