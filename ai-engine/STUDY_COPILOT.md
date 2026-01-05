# Collabry Study Copilot

## Overview

The Collabry Study Copilot is a pedagogical AI learning assistant designed to help students master concepts through effective learning techniques. Unlike generic chatbots, the Study Copilot employs proven educational strategies to maximize comprehension and retention.

## Core Philosophy

The Study Copilot is built on research-backed learning principles:
- **Cognitive Load Theory**: Break complex topics into digestible chunks
- **Elaborative Interrogation**: Generate "why" and "how" questions
- **Concrete Examples**: Use analogies and real-world applications
- **Active Recall**: Encourage retrieval practice through follow-up questions
- **Metacognition**: Help students monitor their own understanding

## Behavior Rules

### 1. **Step-by-Step Explanations**
- Breaks complex concepts into numbered steps
- Builds from fundamentals to advanced ideas
- Uses clear, logical progression

**Example:**
```
Let me explain how spaced repetition works:

1. First, you learn new information and store it in memory
2. Then, you review it after a short interval (e.g., 1 day)
3. Each subsequent review happens at increasing intervals (2 days, 4 days, 7 days...)
4. Finally, the information moves to long-term memory with minimal effort
```

### 2. **Examples & Analogies**
- Provides concrete examples for abstract concepts
- Uses relatable analogies to bridge understanding
- Connects new information to familiar ideas

**Example:**
```
Think of neural networks like a classroom of students learning to recognize patterns.
Each student (neuron) looks at part of the problem and votes on the answer.
The teacher (training algorithm) corrects wrong answers, helping students improve.
Over time, the class gets better at recognizing patterns!
```

### 3. **Clarifying Questions**
- Detects vague or ambiguous input
- Asks specific follow-up questions
- Ensures understanding before explaining

**Triggers:**
- Very short questions (< 3 words)
- Pronouns without clear antecedents ("it", "this", "that")
- General requests ("explain", "tell me about it")

**Response:**
```
🤔 To help you better, could you clarify what you mean by "it"?
Are you asking about the concept we just discussed, or something new?

(This will help me give you a better explanation!)
```

### 4. **Never Hallucinate Sources**
- Only cites documents actually retrieved via RAG
- Clearly indicates tool usage (web_search, web_scrape)
- Admits when information is unavailable
- Suggests how to find missing information

**Safe Response:**
```
I don't have information about that specific research paper in your uploaded documents.
However, I can search for it using web_search if you'd like! Would you like me to do that?
```

### 5. **Follow-Up Question Generation**
- Generates 3 follow-up questions after each explanation
- Tests understanding (recall & comprehension)
- Encourages deeper thinking (application & analysis)
- Connects to related concepts (synthesis & evaluation)

**Example:**
```
📝 **Follow-up questions to deepen your understanding:**
1. Can you explain active recall in your own words?
2. How would you use active recall when studying for a math exam?
3. What's the difference between active recall and re-reading notes?
```

## Capabilities

### 1. **Q&A Over Documents**
- Retrieves relevant passages from user's uploaded materials
- Synthesizes information from multiple sources
- Cites specific documents
- Maintains user isolation (only sees own documents)

**Usage:**
```python
# Documents automatically retrieved via RAG
agent.handle_user_input_stream(
    "What does my textbook say about photosynthesis?",
    on_token=print
)
```

### 2. **Summarization**
- Creates study-focused summaries
- Highlights key points and relationships
- Identifies important terms
- Structures for easy review

**Format:**
```
**Main Topic:** [Central concept]

**Key Points:**
- Point 1
- Point 2
- Point 3

**Important Terms:**
- Term 1: Definition
- Term 2: Definition

**Relationships:**
- How concepts connect
```

### 3. **Concept Extraction**
- Identifies core concepts from content
- Provides clear definitions
- Includes concrete examples
- Shows related concepts

**Usage:**
```python
from core.study_copilot import StudyCopilot

copilot = StudyCopilot(llm)
concepts = copilot.extract_concepts(document_text, max_concepts=5)

for concept in concepts:
    print(f"Name: {concept['name']}")
    print(f"Definition: {concept['definition']}")
    print(f"Example: {concept['example']}")
    print(f"Related: {concept['related']}")
```

### 4. **Follow-Up Question Generation**
- Generates questions that test understanding
- Encourages active recall
- Promotes critical thinking
- Connects to prior knowledge

**Bloom's Taxonomy Levels:**
1. **Remember**: "What is...?" "Define..."
2. **Understand**: "Explain in your own words..."
3. **Apply**: "How would you use...?"
4. **Analyze**: "What's the difference between...?"
5. **Evaluate**: "Which approach is better and why?"
6. **Create**: "Design a solution that..."

## Integration Points

### Using Existing Intent Classifier

The Study Copilot leverages the existing intent classifier to detect study-related intents:

```python
from core.nlp import analyze

analysis = analyze(user_input)
intent = analysis.get("intent")

if copilot.is_study_intent(intent):
    # Apply study-focused enhancements
    print("🎓 Study Intent Detected")
```

**Study Intents:**
- explanation
- definition
- question
- learning
- study
- homework
- concept
- summary
- example

### Using FAISS RAG

Documents are automatically retrieved and cited:

```python
# Retrieves user-specific documents
retrieved_docs = rag_retriever.get_relevant_documents(query)

# Cited in response
for i, doc in enumerate(retrieved_docs, 1):
    source = doc.metadata.get('source')
    print(f"[Source {i}: {source}]")
    print(doc.page_content)
```

### Using User Memory

Conversation history provides context:

```python
# Loads previous conversation
chat_history = memory.get_history_string()

# Used in prompt
prompt = f"""
Chat History:
{chat_history}

Current Question: {user_input}
"""
```

## API Examples

### Basic Usage

```python
from core.agent import create_agent

# Create Study Copilot for user
agent, llm, tools, memory = create_agent(
    user_id="student_123",
    session_id="session_abc"
)

# Ask a question
agent.handle_user_input_stream(
    "Explain what mitochondria do in cells",
    on_token=lambda chunk: print(chunk, end='', flush=True)
)
```

### With Document Upload

```python
from core.rag_retriever import RAGRetriever
from langchain_core.documents import Document

# Upload study material
rag = RAGRetriever(CONFIG, user_id="student_123")
doc = Document(
    page_content="Mitochondria are the powerhouse of the cell...",
    metadata={"source": "biology_textbook.pdf", "chapter": 3}
)
rag.add_user_documents([doc], user_id="student_123")

# Now agent can answer from uploaded material
agent.handle_user_input_stream(
    "What does my textbook say about mitochondria?",
    on_token=print
)
```

### FastAPI Integration

```python
from server.routes.chat import chat

# POST /ai/chat automatically uses Study Copilot
response = await chat(
    request=ChatRequest(
        message="Explain active recall",
        session_id="session_123"
    ),
    user_id="student_123"  # From JWT
)

print(response.response)  # Pedagogical explanation
print(response.follow_up_questions)  # Learning questions
```

## Response Format

### Direct Answer (No Tool)

```json
{
  "tool": null,
  "answer": "Let me explain active recall step-by-step:\n\n1. First, you close your notes...",
  "follow_up_questions": [
    "How does active recall differ from re-reading?",
    "When is the best time to use active recall?",
    "Can you apply active recall to learning programming?"
  ]
}
```

### Tool Call

```json
{
  "tool": "web_search",
  "args": {
    "query": "latest research on spaced repetition 2026"
  }
}
```

### After Tool Execution

```json
{
  "tool": null,
  "answer": "Based on recent research (via web_search), spaced repetition...\n\n[Pedagogical explanation with citations]",
  "follow_up_questions": [
    "Question 1",
    "Question 2",
    "Question 3"
  ]
}
```

## Learning Tips

The Study Copilot includes random learning tips after each response:

- 💡 Try explaining this concept in your own words to reinforce understanding.
- 💡 Create a quick sketch or diagram to visualize the relationships.
- 💡 Think of a personal example where this concept applies.
- 💡 Quiz yourself: Can you explain this without looking at your notes?
- 💡 Connect this to something you already know well.
- 💡 Practice active recall: Close your notes and write what you remember.

## Tool Suggestions

When tools aren't used, the Study Copilot suggests relevant ones:

```
❌ Tool 'invalid_tool' is not available.

💡 **Suggested tools:**
- write_file: Save your notes for later review
- doc_generator: Create a formatted study document
- web_search: Search for additional resources
```

## Pedagogical Best Practices

### Do's ✅
- Start with "Let me explain..." to set teaching tone
- Use numbered steps for processes
- Include examples: "For example,..." or "Think of it like..."
- End with follow-up questions
- Ask for clarification when unclear
- Cite sources explicitly
- Use emojis sparingly for visual cues (📝, 💡, 🎓)

### Don'ts ❌
- Don't assume prior knowledge without checking
- Don't use jargon without defining it
- Don't cite sources you haven't retrieved
- Don't skip steps in explanations
- Don't give answers without teaching
- Don't ignore context from conversation history

## Performance Characteristics

- **Clarification Detection**: ~10ms (heuristic-based)
- **Concept Extraction**: ~2-3s (LLM call)
- **Follow-Up Generation**: ~1-2s (LLM call)
- **RAG Retrieval**: ~50-100ms (FAISS search)
- **Full Response**: ~3-5s (with tool calls)

## Testing

### Unit Tests

```python
from core.study_copilot import StudyCopilot

def test_clarification_detection():
    copilot = StudyCopilot(llm)
    
    # Should detect vague question
    clarification = copilot.needs_clarification("What is it?")
    assert clarification is not None
    
    # Should not detect clear question
    clarification = copilot.needs_clarification("What is photosynthesis?")
    assert clarification is None

def test_follow_up_generation():
    copilot = StudyCopilot(llm)
    
    questions = copilot.generate_follow_up_questions(
        topic="active recall",
        explanation="Active recall is...",
        count=3
    )
    
    assert len(questions) == 3
    assert all(isinstance(q, str) for q in questions)
```

### Integration Tests

```bash
# Test Study Copilot agent
python test_agent_execution.py

# Test FastAPI endpoints
python test_fastapi_server.py
```

## Future Enhancements

### Planned Features
- [ ] Adaptive difficulty adjustment based on user performance
- [ ] Spaced repetition scheduling for review
- [ ] Visual diagram generation for concepts
- [ ] Quiz generation from content
- [ ] Progress tracking and analytics
- [ ] Collaborative study group support

### Research-Backed Additions
- [ ] Feynman Technique prompts
- [ ] SQ3R method integration
- [ ] Pomodoro technique reminders
- [ ] Interleaving suggestions
- [ ] Elaborative encoding prompts

## References

**Learning Science:**
- Cognitive Load Theory (Sweller, 1988)
- Spaced Repetition (Ebbinghaus, 1885)
- Active Recall (Karpicke & Roediger, 2008)
- Elaborative Interrogation (Pressley et al., 1987)

**Implementation:**
- LangChain for LLM orchestration
- FAISS for document retrieval
- MongoDB for conversation memory
- FastAPI for REST API

## Support

For issues or questions about the Study Copilot:
- Check [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)
- See [FASTAPI_ARCHITECTURE.md](FASTAPI_ARCHITECTURE.md)
- Review example code in `fastapi_client_examples.py`
