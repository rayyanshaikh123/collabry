# Artifact Generation System

## Overview

The AI Engine now has a built-in artifact generation system that automatically detects when users request specialized outputs (quizzes, mindmaps, flashcards, etc.) and applies the correct formatting templates.

This system ensures consistent output formatting that matches the frontend component expectations, eliminating the need for hardcoded prompts in the frontend.

## Architecture

```
┌─────────────────┐
│  User Message   │
│  "Create quiz"  │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│ Artifact Detection      │
│ (agent_new.py)          │
│ - Pattern matching      │
│ - Parameter extraction  │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Template Selection      │
│ (artifact_templates.py) │
│ - Quiz template         │
│ - Mindmap template      │
│ - etc.                  │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Enhanced Prompt         │
│ with Specialized Format │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ LLM Generation          │
│ (Ollama/OpenAI)         │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Formatted Output        │
│ Ready for Frontend      │
└─────────────────────────┘
```

## Supported Artifacts

### 1. Quizzes
**Detection Keywords**: "create quiz", "make quiz", "test me", "practice quiz", "mcq"

**Format**:
```
Question 1: [question text]?
A) [option]
B) [option]
C) [option]
D) [option]
Answer: A
Explanation: [explanation]
```

**Parameters**:
- `num_questions`: Number of questions (default: 5)
- `difficulty`: easy/medium/hard (default: medium)
- `topics`: Subject matter

**Example Request**:
- "Create a quiz with 10 hard questions about photosynthesis"
- "Test me on calculus"
- "Make 5 easy multiple choice questions on World War 2"

---

### 2. Mind Maps
**Detection Keywords**: "create mind map", "mindmap", "concept map", "visual map"

**Format**: JSON with nodes and edges
```json
{
  "nodes": [
    {"id": "root", "label": "Main Topic", "level": 0},
    {"id": "node-1", "label": "Subtopic", "level": 1}
  ],
  "edges": [
    {"from": "root", "to": "node-1"}
  ]
}
```

**Example Request**:
- "Create a mind map about cellular respiration"
- "Make a concept map for machine learning"

---

### 3. Flashcards
**Detection Keywords**: "create flashcards", "make flashcards", "study cards"

**Format**: JSON with cards array
```json
{
  "title": "Flashcards: [Topic]",
  "cards": [
    {
      "id": "card-1",
      "front": "What is...",
      "back": "The answer is...",
      "category": "Basics"
    }
  ]
}
```

**Example Request**:
- "Create flashcards for Spanish vocabulary"
- "Make study cards about chemistry concepts"

---

### 4. Course Finder
**Detection Keywords**: "find courses", "recommend courses", "best courses", "where to learn"

**Requirements**: Uses `web_search` tool to find real courses

**Format**: Markdown list
```
[Course Title](https://course.url) - Platform: X | Rating: X.X/5 | Price: $X
```

**Example Request**:
- "Find the best courses on Python programming"
- "Recommend online courses for data science"

---

### 5. Reports
**Detection Keywords**: "create report", "generate report", "study report"

**Format**: Structured markdown with sections:
1. Executive Summary
2. Key Concepts
3. Learning Objectives
4. Detailed Analysis
5. Practical Applications
6. Study Recommendations
7. Assessment Criteria
8. Additional Resources

**Example Request**:
- "Generate a study report for quantum physics"
- "Create a comprehensive report on the Renaissance"

---

### 6. Infographics
**Detection Keywords**: "create infographic", "visual summary", "data visualization"

**Format**: JSON with title, subtitle, and sections (stats, timeline, comparison)

**Example Request**:
- "Create an infographic about climate change"
- "Make a visual summary of World War 2"

---

### 7. Study Plans
**Detection Keywords**: "create study plan", "study schedule", "learning plan"

**Parameters**:
- `duration`: Time period (e.g., "2 weeks", "1 month")
- `hours_per_day`: Study hours per day (default: 2)

**Format**: Markdown schedule with daily activities

**Example Request**:
- "Create a 2-week study plan for calculus with 3 hours per day"
- "Make a study schedule for learning Spanish in 1 month"

---

### 8. Practice Problems
**Detection Keywords**: "practice problems", "exercises", "problem set"

**Parameters**:
- `num_problems`: Number of problems (default: 5)
- `difficulty`: easy/medium/hard (default: medium)

**Format**: Numbered problems with step-by-step solutions

**Example Request**:
- "Generate 10 practice problems for algebra"
- "Create 5 hard calculus exercises"

---

### 9. Summaries
**Detection Keywords**: "summarize", "summary of", "sum up"

**Parameters**:
- `length`: brief (300-500 words), moderate (500-800), detailed (800-1200)

**Format**: Structured markdown with sections

**Example Request**:
- "Summarize my notes on biology"
- "Create a brief summary of the Civil War"

---

### 10. Concept Maps
**Detection Keywords**: "concept map" (different from mind map - shows relationships)

**Format**: JSON with concepts and relationships
```json
{
  "concepts": [
    {"id": "concept-1", "label": "Main Concept", "description": "...", "level": 0}
  ],
  "relationships": [
    {"from": "concept-1", "to": "concept-2", "type": "leads-to", "label": "..."}
  ]
}
```

**Relationship Types**:
- `leads-to`: Causal/sequential
- `part-of`: Hierarchical
- `relates-to`: General association
- `contrasts-with`: Opposing concepts
- `example-of`: Specific instance

---

## How It Works

### 1. Detection Phase
When a user message comes in, the agent runs pattern matching against artifact keywords:

```python
from core.artifact_templates import detect_artifact_type

artifact_type = detect_artifact_type("Create a quiz about Python")
# Returns: 'quiz'
```

### 2. Parameter Extraction
The agent extracts parameters from the message using regex:

- **Number extraction**: "10 questions" → `num_questions=10`
- **Difficulty extraction**: "hard questions" → `difficulty="hard"`
- **Topic extraction**: "about Python" → `topics="Python"`
- **Duration extraction**: "2 weeks" → `duration="2 weeks"`

### 3. Template Application
Based on the artifact type, the appropriate template is applied:

```python
from core.artifact_templates import format_quiz_prompt

enhanced_message = format_quiz_prompt(
    topics="Python",
    num_questions=10,
    difficulty="hard"
)
```

### 4. LLM Generation
The enhanced message (with template) is sent to the LLM, which generates output following the specified format.

### 5. Frontend Rendering
The frontend receives the formatted output and renders it in the appropriate component (QuizViewer, MindMapViewer, etc.).

---

## Benefits

1. **Consistency**: All artifacts follow a standardized format
2. **Maintainability**: Templates are centralized in one file
3. **Flexibility**: Easy to add new artifact types
4. **Frontend Independence**: Frontend doesn't need to know the exact prompts
5. **LLM Training**: The templates act as few-shot examples for the LLM

---

## Adding New Artifact Types

To add a new artifact type:

1. **Add template to `artifact_templates.py`**:
```python
MY_ARTIFACT_TEMPLATE = """[Template definition]..."""

def format_my_artifact_prompt(topics: str, param1: str) -> str:
    return MY_ARTIFACT_TEMPLATE.format(topics=topics, param1=param1)
```

2. **Add detection pattern**:
```python
ARTIFACT_PATTERNS = {
    'my-artifact': ['create my artifact', 'generate my thing'],
    # ... other patterns
}
```

3. **Update agent detection logic in `agent_new.py`**:
```python
elif artifact_type == 'my-artifact':
    enhanced_message = format_my_artifact_prompt(topics=topics, param1=value)
```

4. **Create frontend component** to render the artifact

5. **Update documentation** in this file

---

## Configuration

### Template Customization
Edit templates in [core/artifact_templates.py](core/artifact_templates.py)

### Detection Sensitivity
Adjust patterns in `ARTIFACT_PATTERNS` dict in [core/artifact_templates.py](core/artifact_templates.py)

### Default Parameters
Modify default values in the format functions:
- `DEFAULT_QUIZ_PROMPT`
- Default `num_questions=5`
- Default `difficulty="medium"`
- Default `length="moderate"`

---

## Testing

### Test Artifact Detection
```python
from core.artifact_templates import detect_artifact_type

assert detect_artifact_type("Create a quiz") == 'quiz'
assert detect_artifact_type("Make flashcards") == 'flashcards'
assert detect_artifact_type("Explain photosynthesis") == None  # Not an artifact
```

### Test Template Formatting
```python
from core.artifact_templates import format_quiz_prompt

prompt = format_quiz_prompt(topics="Biology", num_questions=10, difficulty="hard")
assert "10" in prompt
assert "hard" in prompt
assert "Biology" in prompt
```

### Test End-to-End
```bash
# Start server
python run_server.py

# Send request via frontend or API
# POST /ai/sessions/{session_id}/chat/stream
# Body: {"message": "Create a quiz about Python", ...}

# Verify response format matches template
```

---

## Troubleshooting

### Issue: Artifact not detected
- Check if keywords match patterns in `ARTIFACT_PATTERNS`
- User message might be too vague - add more specific keywords
- Check logs for detection results

### Issue: Wrong format generated
- LLM might be ignoring template - check system prompt in `prompt_templates.py`
- Template might have errors - validate template syntax
- Try increasing temperature for more creative outputs or decreasing for stricter format adherence

### Issue: Parameters not extracted
- Check regex patterns in `_detect_and_enhance_message()`
- Add more pattern variations for param extraction
- Set sensible defaults for missing params

### Issue: Frontend can't parse output
- Verify LLM output matches template exactly (check for markdown code blocks)
- Update frontend parser to handle edge cases
- Add validation in agent before saving

---

## Files

- **[core/artifact_templates.py](core/artifact_templates.py)**: All artifact templates and detection logic
- **[core/agent_new.py](core/agent_new.py)**: Agent with artifact detection and enhancement
- **[core/prompt_templates.py](core/prompt_templates.py)**: System prompts referencing artifact mode

---

## Future Enhancements

- [ ] Add artifact validation before saving
- [ ] Support custom templates per user/notebook
- [ ] Add artifact preview before generation
- [ ] Support multi-artifact requests ("Create quiz AND flashcards")
- [ ] Add artifact versioning/history
- [ ] Support artifact templates from uploaded files
- [ ] Add artifact quality scoring
- [ ] Support artifact forking/customization

---

## API Reference

### `detect_artifact_type(message: str) -> Optional[str]`
Detects artifact type from user message.

**Returns**: Artifact type string or None

---

### `format_quiz_prompt(topics, num_questions=5, difficulty="medium", custom_prompt=None) -> str`
Formats quiz generation prompt.

**Parameters**:
- `topics` (str): Subject matter
- `num_questions` (int): Number of questions
- `difficulty` (str): "easy", "medium", or "hard"
- `custom_prompt` (str, optional): Override default prompt

**Returns**: Formatted prompt string

---

### Similar format functions for other artifacts
See [core/artifact_templates.py](core/artifact_templates.py) for full API.

---

## License

Part of the Collabry Study Assistant project.
