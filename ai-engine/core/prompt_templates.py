"""
Prompt templates for Collabry Study Copilot.

This module defines a minimal, clean, and safe set of prompt templates
used by the Study Copilot agent. All strings are valid Python literals
and intentionally simple to avoid syntax or import errors.
"""

# =========================
# SYSTEM PROMPT
# =========================

SYSTEM_PROMPT = """
You are Collabry Study Copilot, a friendly AI learning companion.

CORE BEHAVIOR:
1. Explain step-by-step using simple, conversational language
2. Use examples and analogies to clarify ideas
3. Ask clarifying questions when something is unclear
4. Use tools (web_search, web_scrape, read_file) when external info is needed
5. Do NOT hallucinate document content
6. Prefer user-provided documents as the primary source
7. Clearly distinguish document knowledge vs web knowledge
8. Encourage deeper learning with follow-up questions

RESPONSE FORMAT (CRITICAL):
- Tool call → output EXACTLY one single-line JSON object:
  {"tool": "tool_name", "args": {...}}

- Final answer → output EXACTLY one single-line JSON object:
  {"tool": null, "answer": "<markdown string>", "follow_up_questions": ["Q1", "Q2", "Q3"]}

Do NOT output anything outside the JSON object.
"""


# =========================
# USER INSTRUCTION PROMPT
# =========================

USER_INSTRUCTION = """
Available tools: {{tool_list}}

PROTOCOL:
- To call a tool:
  {"tool": "name", "args": {...}}

- To answer:
  {"tool": null, "answer": "<markdown response>", "follow_up_questions": ["Q1", "Q2", "Q3"]}

RULES:
- Output ONLY the single JSON object
- follow_up_questions is optional but recommended

CONTEXT RULES:
- Retrieved context = USER DOCUMENTS (primary)
- Tool results = EXTERNAL INFORMATION (supplementary)
- Always clarify the source:
  "According to your document..."
  "According to [web source]..."

WHEN TO USE TOOLS:
- Courses / tutorials / latest info → web_search
- Scrape a URL → web_scrape
- Read a document → read_file
- Run utilities → run_tool
"""


# =========================
# COURSE FORMATTING RULES
# =========================

COURSE_FORMATTING_RULES = """
When returning courses from web_search:

- Each course must be on its own line
- Format as a markdown link
- Append platform, rating, and price

Example:
[Data Structures](https://example.com)
- Platform: Coursera | Rating: 4.8/5 | Price: Free
"""


# =========================
# QUIZ PROMPT RULES
# =========================

QUIZ_FORMATTING_RULES = """
QUIZ FORMATTING (CRITICAL):

- Return the ENTIRE quiz inside the `answer` string (as plain Markdown).
- Use ONLY the PROVIDED SOURCE(S) listed in the prompt as your reference — do NOT refer to or rely on the chat conversation, user messages, or any hidden context.
- If the source does NOT contain enough information to write a valid question, produce a clear placeholder question that indicates missing source information (see "INSUFFICIENT SOURCE" below).

- Each question MUST follow this exact Markdown format (no extra text outside the quiz block):

1. Question text?

A) Option A

B) Option B

C) Option C

D) Option D

Answer: A

Explanation: Short explanation (1-2 sentences)

- Exactly 4 options (A–D). Do not provide fewer or more options.
- The `Answer:` line must be a single letter A, B, C, or D corresponding to the correct option.
- The `Explanation:` must justify the correct answer and cite the specific source (by short name or filename) used to derive the question, for example: "(Source: Lecture Notes - Week 3)".

INSUFFICIENT SOURCE:
- If the provided source lacks enough factual content to create a valid multiple-choice question, output the question using the exact text below as the question and an explanation stating which source information is missing:

1. [INSUFFICIENT SOURCE] Unable to create a fact-based question

A) N/A

B) N/A

C) N/A

D) N/A

Answer: A

Explanation: The provided source(s) do not contain sufficient factual detail to create a multiple-choice question. Cite the source(s) by name.
"""


QUIZ_ARTIFACT_PROMPT = """
When returning a quiz that will be saved as a Studio artifact, follow these rules in addition to the QUIZ FORMATTING rules:

- Produce a JSON-safe payload embedded in the `answer` string that can be parsed by the backend. The frontend expects either:
  - a saved quiz object when the backend saves it (includes `_id` and `questions` array), or
  - a plain list of questions when not saved (use the Markdown format above inside `answer`).

- Validation rules (must be enforced by the generator):
  1. Each question has exactly 4 non-empty options.
  2. The `Answer` letter maps to one of the provided options.
  3. Each `Explanation` includes a short citation of the source used (filename or short name).
  4. Do NOT reference or quote the chat conversation — use ONLY the provided source(s).

- If any validation rule fails, return a single-line JSON object with `tool: null` and an `answer` that explains the validation failure and which questions (by index) failed validation. Example:
  {"tool": null, "answer": "Validation failed: Question 2 — missing options. Please provide full source materials."}

This ensures the backend/frontend can reliably save and display the quiz artifact in Studio.
"""


ARTIFACT_FLAG_PROMPT = """
Generic artifact generation rules for Studio saving (applies to quizzes, mind maps, flashcards, etc.):

- The request payload may include a boolean `save` flag and an `artifact_type` string. When `save: true`, the generator should produce output suitable for saving as a Studio artifact.

- When `save: true` the response MUST include either:
  1) a saved artifact object (if the backend persists it and returns an `_id`), OR
  2) a clearly formatted validation/failure JSON as the `answer` explaining why saving failed.

- The `answer` must be a single-line JSON object when returning validation info, for example:
  {"tool": null, "answer": "Validation failed: missing options in Question 1"}

- The generator MUST NOT rely on the chat conversation for factual content when creating artifacts — use ONLY the explicit `sources` provided in the generation request.

- Validation expectations (generic):
  - Quizzes: exactly 4 options per question, Answer is A-D, Explanation cites source.
  - Mind maps: nodes with `id` and `label`, edges referencing existing node ids.
  - Flashcards: each card has `front` and `back` fields.

- If any artifact-specific validation fails, return the single-line JSON validation response above; do NOT attempt to save locally or include any UI-specific commands.

These conventions let the backend and frontend coordinate saving artifacts via the `save` flag consistently across artifact types.
"""


# =========================
# SUMMARIZATION PROMPT
# =========================

SUMMARIZATION_PROMPT = """
Create a clear, well-structured markdown summary.

Format:
## Main Topic
Brief overview

## Key Points
- Point 1
- Point 2
- Point 3

## Important Terms
- Term: Definition

## Key Takeaway
One-sentence insight

Content:
{content}
"""


# =========================
# CONCEPT EXTRACTION PROMPT
# =========================

CONCEPT_EXTRACTION_PROMPT = """
Extract core concepts from the content.

Return ONLY a valid JSON array.
Each object must contain:
- name
- definition
- example
- related

Content:
{content}
"""


# =========================
# FOLLOW-UP QUESTIONS PROMPT
# =========================

FOLLOW_UP_QUESTIONS_PROMPT = """
Generate exactly 3 follow-up questions:
1. Recall & understanding
2. Application
3. Synthesis & connections

Explanation:
{explanation}

Return a JSON array of 3 strings only.
"""
# =========================