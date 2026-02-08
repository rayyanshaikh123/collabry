# Contract-Based Validation with Automatic Repair

## Overview

The artifact pipeline now includes sophisticated validation with automatic repair capabilities:

1. **Structural Validation** - Deterministic schema enforcement
2. **Semantic Validation** - LLM-based content verification
3. **Automatic Repair** - LLM fixes violations (max 2 attempts)

This ensures all completed artifacts meet quality standards before delivery.

---

## Validation Architecture

```
Phase 3: Validation (60% → 100%)
├── Step 1: Structural Validation (70%)
│   └── Check schema compliance
├── Step 2: Semantic Validation (80%)
│   └── Check content relevance
├── Step 3: Repair Loop (85-95%)
│   ├── Attempt 1: LLM repair + revalidate
│   └── Attempt 2: LLM repair + revalidate
└── Complete or Fail (100%)
```

---

## Structural Validation Rules

### Quiz
- ≥ 4 options per question
- `correct_answer` must be in `options`
- No duplicate options
- All fields non-empty

### Flashcards
- Term (front) ≥ 2 characters
- Definition (back) ≤ 300 characters
- No duplicate terms

### Mindmap
- Single root node
- All nodes have label + children
- No cycles in hierarchy
- No duplicate labels

---

## Semantic Validation Rules

**LLM checks:**
- Questions answerable from source chunks
- No hallucinated terms/facts
- Correct answers are actually correct
- Definitions accurate per source

---

## Example: Quiz Validation Failure → Repair Trace

### Initial Generation

```json
{
  "questions": [
    {
      "question": "What is photosynthesis?",
      "options": [
        "Energy production",
        "Water absorption",
        "Carbon fixation"
      ],
      "correct_answer": "Energy production",
      "explanation": "Photosynthesis produces energy for plants."
    },
    {
      "question": "Where does photosynthesis occur?",
      "options": [
        "Mitochondria",
        "Mitochondria",
        "Nucleus",
        "Cell wall"
      ],
      "correct_answer": "Chloroplasts",
      "explanation": "Chloroplasts contain chlorophyll."
    }
  ]
}
```

### Structural Validation

**Worker Log:**
```
[10:30:15] ✅ Phase 3: Validating quiz...
[10:30:15]   → Step 1: Structural validation...
```

**Violations Found:**
```
Question 1: Must have at least 4 options (has 3)
Question 2: Options must be unique (found duplicates)
Question 2: correct_answer 'Chloroplasts' must be one of the options
```

**Result:** ❌ FAILED (3 violations)

### Semantic Validation

**Worker Log:**
```
[10:30:16]   → Step 2: Semantic validation...
```

**LLM Analysis:**
```
Source chunks mention:
- "Photosynthesis converts light energy into chemical energy"
- "Occurs in chloroplasts"
- "Produces glucose, not just generic energy"

Issues:
- Question 1: Answer "Energy production" is too vague
- Question 2: "Chloroplasts" not in options
```

**Result:** ❌ FAILED (semantic issues detected)

### Repair Attempt 1

**Worker Log:**
```
[10:30:17] ⚠️  Validation failed: 3 structural violations, 2 semantic issues
[10:30:17]   → Step 3: Attempting automatic repair...
[10:30:17] 🔧 Repair attempt 1/2
```

**Repair Prompt to LLM:**
```
Repair this quiz artifact to fix the following violations.

Original Plan:
{
  "concepts": [
    "photosynthesis process",
    "chloroplast function"
  ]
}

Source Content:
Photosynthesis is the process by which plants convert light
energy into chemical energy stored in glucose molecules. This
occurs in chloroplasts, which contain chlorophyll pigment...

Current Artifact (INVALID):
[... invalid quiz JSON ...]

Violations Found:
Structural Violations:
  - Question 1: Must have at least 4 options (has 3)
  - Question 2: Options must be unique (found duplicates)
  - Question 2: correct_answer 'Chloroplasts' must be one of the options

Semantic Issues:
  - Question 1: Answer "Energy production" is too vague based on content
  - Question 2: "Chloroplasts" not in options list

Rules:
1. Each question MUST have at least 4 options
2. correct_answer MUST be exactly one of the options
3. No duplicate options allowed
4. Questions must be answerable from the provided content

CRITICAL: Return the COMPLETE corrected artifact in valid JSON format.
```

**LLM Repaired Output:**
```json
{
  "questions": [
    {
      "question": "What is photosynthesis?",
      "options": [
        "Conversion of light energy into chemical energy",
        "Water absorption from soil",
        "Carbon dioxide release",
        "Mineral uptake"
      ],
      "correct_answer": "Conversion of light energy into chemical energy",
      "explanation": "Photosynthesis converts light energy into chemical energy stored as glucose."
    },
    {
      "question": "Where does photosynthesis occur?",
      "options": [
        "Mitochondria",
        "Chloroplasts",
        "Nucleus",
        "Cell wall"
      ],
      "correct_answer": "Chloroplasts",
      "explanation": "Chloroplasts contain chlorophyll and are the site of photosynthesis."
    }
  ]
}
```

### Revalidation After Repair 1

**Structural Validation:**
```
[10:30:25]   → Revalidating structure...
```
✅ PASSED (0 violations)

**Semantic Validation:**
```
[10:30:27]   → Revalidating semantics...
```
✅ PASSED (0 issues)

**Worker Log:**
```
[10:30:27] ✓ Repair successful after 1 attempt(s)
[10:30:27] ✅ Job job456 completed successfully
```

---

## Example: Flashcard Repair Failure (Max Attempts)

### Initial Generation

```json
{
  "flashcards": [
    {
      "front": "ATP",
      "back": "Adenosine triphosphate (ATP) is the primary energy currency of cells. It stores energy in phosphate bonds and releases it during cellular processes. ATP is produced during cellular respiration in mitochondria and is used for muscle contraction, protein synthesis, nerve impulse transmission, and many other energy-requiring processes throughout the cell."
    },
    {
      "front": "ATP",
      "back": "Energy molecule"
    }
  ]
}
```

### Validation

**Violations:**
```
Flashcard 1: Back too long (312 chars, max 300)
Duplicate term found: 'ATP'
```

### Repair Attempt 1

**Repaired:**
```json
{
  "flashcards": [
    {
      "front": "ATP (Adenosine Triphosphate)",
      "back": "Primary energy currency of cells. Stores energy in phosphate bonds, produced in mitochondria during cellular respiration. Used for muscle contraction and protein synthesis."
    },
    {
      "front": "ATP Production",
      "back": "Occurs in mitochondria through cellular respiration"
    }
  ]
}
```

**Revalidation:**
- Structural: ✅ PASSED
- Semantic: ❌ FAILED
  - Issue: "ATP Production" not found in source chunks

### Repair Attempt 2

**Repaired:**
```json
{
  "flashcards": [
    {
      "front": "ATP",
      "back": "Adenosine triphosphate. Primary energy molecule storing energy in phosphate bonds. Produced in mitochondria, used for cellular processes."
    },
    {
      "front": "Mitochondria",
      "back": "Organelle where cellular respiration produces ATP"
    }
  ]
}
```

**Revalidation:**
- Structural: ✅ PASSED
- Semantic: ✅ PASSED

**Result:** ✅ SUCCESS (after 2 attempts)

---

## Example: Repair Failure (Permanent)

### Scenario: Source content insufficient

**Source chunks:**
```
"Photosynthesis occurs in plants."
```

**Request:** "Create a detailed quiz on photosynthesis"

**Problem:** Not enough content for detailed quiz

### Generation → Validation → Repair Loop

**Attempt 1:**
- Generated quiz with hallucinated details
- Semantic validation: ❌ FAILED (many hallucinations)
- Repair: Simplified quiz
- Revalidation: ❌ FAILED (still contains hallucinations)

**Attempt 2:**
- Repair: Ultra-simple quiz
- Revalidation: ❌ FAILED (questions not answerable from minimal source)

**Final Result:**
```
[10:30:45] ✗ Repair failed after 2 attempts
[10:30:45] → Status: failed
[10:30:45] → Error: Validation failed after 2 repair attempts.
            Violations: []
            Issues: ["Question 1: Not answerable from source",
                     "Question 2: Contains hallucinated facts"]
```

---

## Progress Mapping (Extended)

```
pending    →   0%
planning   →  20%
generating →  60%
validating →  70-100%
  ├─ structural check   → 70%
  ├─ semantic check     → 80%
  ├─ repair attempt 1   → 85%
  ├─ repair attempt 2   → 90%
  └─ completed/failed   → 100%
```

---

## Worker Log Examples

### Successful Validation (No Repair Needed)

```
[10:30:00] ⚙️ Processing job job123 (type=quiz)
[10:30:02] 📋 Phase 1: Planning quiz structure...
[10:30:05] ✓ Plan created: 5 concepts
[10:30:05] 🔨 Phase 2: Generating quiz content...
[10:30:12] ✓ Generated artifact: 5 questions
[10:30:12] ✅ Phase 3: Validating quiz...
[10:30:12]   → Step 1: Structural validation...
[10:30:13]   ✓ Structure valid
[10:30:13]   → Step 2: Semantic validation...
[10:30:15]   ✓ Semantics valid
[10:30:15] ✅ Job job123 completed successfully (progress: 100%)
```

### Successful Repair

```
[10:30:00] ⚙️ Processing job job456 (type=flashcards)
[10:30:05] ✓ Plan created: 10 terms
[10:30:12] ✓ Generated artifact: 10 flashcards
[10:30:12] ✅ Phase 3: Validating flashcards...
[10:30:13]   → Step 1: Structural validation...
[10:30:13]   ✗ 2 violations found
[10:30:14]   → Step 2: Semantic validation...
[10:30:15]   ✗ 1 issue found
[10:30:15] ⚠️  Validation failed: 2 structural violations, 1 semantic issue
[10:30:15]   → Step 3: Attempting automatic repair...
[10:30:15] 🔧 Repair attempt 1/2
[10:30:22]   → Revalidating structure...
[10:30:22]   ✓ Structure valid
[10:30:23]   → Revalidating semantics...
[10:30:24]   ✓ Semantics valid
[10:30:24] ✓ Repair successful after 1 attempt(s)
[10:30:24] ✅ Job job456 completed successfully (progress: 100%)
```

### Failed Repair

```
[10:30:00] ⚙️ Processing job job789 (type=quiz)
[10:30:05] ✓ Plan created: 3 concepts
[10:30:12] ✓ Generated artifact: 3 questions
[10:30:12] ✅ Phase 3: Validating quiz...
[10:30:13]   ✗ Structural violations found
[10:30:15]   ✗ Semantic issues found
[10:30:15] 🔧 Repair attempt 1/2
[10:30:25]   ✗ Still invalid after repair
[10:30:25] 🔧 Repair attempt 2/2
[10:30:35]   ✗ Still invalid after repair
[10:30:35] ✗ Repair failed after 2 attempts
[10:30:35] → Status: failed (progress: 85%)
[10:30:35] → Error: Validation failed after 2 repair attempts.
```

---

## API Response Evolution

### Polling During Validation

**Request:** `GET /ai/artifact/job123`

**Response (structural check):**
```json
{
  "job_id": "job123",
  "status": "validating",
  "progress": 70,
  "artifact_type": "quiz",
  "created_at": "2026-02-08T10:30:00Z",
  "updated_at": "2026-02-08T10:30:13Z"
}
```

**Response (semantic check):**
```json
{
  "job_id": "job123",
  "status": "validating",
  "progress": 80,
  ...
}
```

**Response (repair in progress):**
```json
{
  "job_id": "job123",
  "status": "validating",
  "progress": 85,
  ...
}
```

**Response (completed after repair):**
```json
{
  "job_id": "job123",
  "status": "completed",
  "progress": 100,
  "artifact_type": "quiz",
  "result": {
    "questions": [...]
  },
  ...
}
```

---

## Benefits of Contract-Based Validation

### 1. Quality Guarantees
- All artifacts meet strict structural standards
- No hallucinations or inaccuracies slip through
- Consistent format for frontend parsing

### 2. Automatic Error Recovery
- Invalid artifacts don't require manual intervention
- LLM repairs most common issues automatically
- Reduces failed job rate significantly

### 3. Transparency
- Clear violation messages in logs
- Repair attempts tracked
- Frontend sees granular progress (70-85-90-100%)

### 4. Extensibility
- Easy to add new artifact types (just add schema)
- Easy to add new validation rules
- Semantic checks can be customized per type

---

## Module Structure

```
artifacts/
├── __init__.py
├── schemas/
│   ├── quiz_schema.py          # Quiz validation rules
│   ├── flashcard_schema.py     # Flashcard validation rules
│   └── mindmap_schema.py       # Mindmap validation rules
└── validators/
    ├── structural_validator.py # Deterministic schema checks
    ├── semantic_validator.py   # LLM-based content checks
    └── repair_chain.py         # Automatic repair with revalidation
```

---

**Implementation complete. All artifacts are now validated with automatic repair before completion.**
