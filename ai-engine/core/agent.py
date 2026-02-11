"""
Study Assistant Agent - LangGraph ReAct agent with dynamic tool calling.

This is the main agent that orchestrates LLM reasoning and tool execution.
Uses LangGraph's create_react_agent for intelligent tool selection.

The LLM autonomously decides when and which tools to use based on user queries.
"""

from typing import AsyncGenerator, Optional, Dict, Any, List, Tuple
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from core.llm import get_langchain_llm, get_llm_config, chat_completion
from core.conversation import get_conversation_manager
from tools import ALL_TOOLS
import json
import re
from urllib.parse import urlparse


# System prompt for the study assistant with tool usage guidelines
STUDY_ASSISTANT_PROMPT = """You are an intelligent study assistant helping students learn effectively.

You have access to these tools (use EXACT names):
- search_web (EXACT NAME: 'search_web'): Search the internet for courses, tutorials, and current information
- search_sources (EXACT NAME: 'search_sources'): Search user's uploaded documents and notes
- generate_quiz (EXACT NAME: 'generate_quiz'): Create practice quizzes on any topic
- generate_flashcards (EXACT NAME: 'generate_flashcards'): Create flashcards for memorization
- generate_mindmap (EXACT NAME: 'generate_mindmap'): Create visual concept maps
- generate_study_plan (EXACT NAME: 'generate_study_plan'): Generate structured study schedules
- summarize_notes (EXACT NAME: 'summarize_notes'): Condense large documents or topics

**CRITICAL: Tool names are case-sensitive and must match exactly. Do NOT use 'web_search', use 'search_web'.**

**When to use tools:**

Use search_web (name='search_web') when:
- User asks about online courses, tutorials, or learning resources
- User wants current information not in their documents
- User needs course recommendations (Coursera, Udemy, edX, etc.)
- Examples: "Find Python courses", "Recommend data science tutorials", "Best AI certifications"
- **CRITICAL: Always use search_web for course/tutorial recommendations - never invent courses!**
- Tool call: search_web(query="Python courses for beginners")

Use search_sources when:
- User asks about their uploaded documents, notes, PDFs
- User wants information from materials they've shared
- Examples: "What did my biology notes say?", "Find info about X in my documents"
- Tool call: search_sources(query="photosynthesis definition")

Use generate_quiz when:
- User wants to test their knowledge
- User requests practice questions or quizzes
- Examples: "Make me a quiz on X", "Test me on Y", "Create practice questions"
- Tool call: generate_quiz(topic="physics")

Use generate_flashcards when:
- User wants to memorize information
- User needs study cards for vocabulary or concepts
- Examples: "Make flashcards for X", "Create cards to memorize Y"
- Tool call: generate_flashcards(topic="chemistry")

Use generate_mindmap when:
- User wants to visualize concepts and relationships
- User needs to see the structure of a topic
- Examples: "Create a concept map for X", "Visualize Y", "Show me a mind map"
- Tool call: generate_mindmap(topic="cell biology")

Use generate_study_plan when:
- User wants to plan their learning journey
- User needs a structured schedule
- Examples: "Help me plan studying X", "Create a study schedule", "Make a learning plan"
- Tool call: generate_study_plan(subject="Mathematics", topics="algebra, calculus")

Use summarize_notes when:
- User wants to condense long materials
- User needs key points extracted
- Examples: "Summarize X", "Give me the main ideas of Y", "TLDR my notes"
- Tool call: summarize_notes(topic="history")

**When NOT to use tools:**
- General questions that don't require documents or generation
- Conversational interactions
- Clarification questions
- Just respond normally with your knowledge

**Tool Usage Guidelines:**
1. Read the user's request carefully
2. Determine if any tool would help provide a better answer
3. Use tools when they add clear value
4. You can use multiple tools in sequence if needed
5. Always provide context with tool results

**HOW TO CALL TOOLS (CRITICAL):**
- **ONLY provide the main functional parameter** (query, topic, subject)
- **DO NOT provide user_id or notebook_id** - these are injected automatically
- Keep tool calls simple and focused

**Examples of CORRECT tool calls:**
- search_web(query="Python courses for beginners")
- generate_quiz(topic="biology")
- generate_flashcards(topic="French Revolution")
- generate_mindmap(topic="photosynthesis")
- search_sources(query="DNA structure")

**WRONG - Don't do this:**
- search_web(query="...", user_id="123", notebook_id="abc")  ❌
- generate_quiz(topic="...", user_id="default")  ❌

**Output Style:**
- Be conversational and supportive
- Use clear markdown formatting
- Explain tool results in a friendly way
- Encourage learning and growth
- If a tool returns JSON, format it nicely for the user

**Important:**
- Never expose internal tool mechanics to users
- Present tool results as if you generated them naturally
- Be helpful and encouraging in all interactions
- **CRITICAL: Use exact tool names as listed above. For web search, use 'search_web' NOT 'web_search'**"""


def _format_history_for_langchain(history: List[Dict[str, str]]) -> List:
    """Convert conversation history to LangChain message format."""
    messages = []
    for msg in history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))
    return messages


def _create_agent(user_id: str, notebook_id: Optional[str] = None):
    """
    Create LangGraph ReAct agent with tools.
    
    Tools that need user context (like search_sources) have optional parameters
    with sensible defaults, so they work without context injection.
    
    Args:
        user_id: User identifier for tool context (passed but not used for injection)
        notebook_id: Optional notebook context (passed but not used for injection)
    
    Returns:
        Configured agent
    """
    # Get LLM with tool binding
    llm = get_langchain_llm()

    # Some OpenAI-compatible providers/models don't reliably support native tool calling.
    # LangGraph's v1 agent uses a more prompt-driven ReAct loop that is generally more portable.
    llm_cfg = get_llm_config()
    provider = (llm_cfg.provider or "").lower()
    base_url = (getattr(llm_cfg, "base_url", "") or "").lower()
    # Native function/tool calling is reliably supported on OpenAI's own API.
    # Many OpenAI-compatible providers return errors like "Failed to call a function".
    supports_native_tool_calling = provider == "openai" and (not base_url or "api.openai.com" in base_url)
    agent_version = "v2" if supports_native_tool_calling else "v1"
    
    # Use tools as-is - they have optional parameters with defaults
    tools = ALL_TOOLS
    
    # Create checkpointer for conversation memory
    checkpointer = MemorySaver()
    
    # Debug: Print agent setup
    print(f"🧠 LLM provider: {provider} | agent version: {agent_version}")
    print(f"🔧 Agent tools: {[t.name for t in tools]}")
    
    # Create ReAct agent (LangGraph signature varies by version)
    import inspect

    sig = inspect.signature(create_react_agent)

    kwargs: Dict[str, Any] = {
        "model": llm,
        "tools": tools,
    }

    # Optional kwargs (only if supported by this langgraph version)
    if "checkpointer" in sig.parameters:
        kwargs["checkpointer"] = checkpointer
    if "version" in sig.parameters:
        kwargs["version"] = agent_version
    if "prompt" in sig.parameters:
        kwargs["prompt"] = STUDY_ASSISTANT_PROMPT
    elif "state_modifier" in sig.parameters:
        kwargs["state_modifier"] = STUDY_ASSISTANT_PROMPT
    elif "messages_modifier" in sig.parameters:
        kwargs["messages_modifier"] = STUDY_ASSISTANT_PROMPT
    else:
        raise TypeError(
            "Unsupported create_react_agent signature: expected one of "
            "'prompt', 'state_modifier', or 'messages_modifier'."
        )

    agent = create_react_agent(**kwargs)
    
    return agent


def _extract_topic(message: str) -> str:
    text = message.strip()
    lowered = text.lower()
    # Common patterns: "quiz on X", "flashcards for X", "mind map of X"
    for token in (" on ", " for ", " of ", ":"):
        if token in lowered:
            idx = lowered.find(token)
            candidate = text[idx + len(token) :].strip()
            if candidate:
                return candidate
    return text


def _extract_course_query(message: str) -> str:
    # Prefer explicit pattern used by the frontend course finder prompt
    m = re.search(r"courses\s+about\s+\"([^\"]+)\"", message, re.IGNORECASE)
    if m and m.group(1).strip():
        return m.group(1).strip()

    # Newer crisp prompt format: a dedicated topic line
    m2 = re.search(r"^Topic:\s*(.+)$", message, re.IGNORECASE | re.MULTILINE)
    if m2 and m2.group(1).strip():
        return m2.group(1).strip()

    # Fallback: use generic topic extraction
    topic = _extract_topic(message)
    return topic.strip()


def _extract_difficulty(message: str, default: str = "medium") -> str:
    m = re.search(r"\bdifficulty\s*:\s*(easy|medium|hard)\b", message, re.IGNORECASE)
    if m:
        return m.group(1).lower()
    # Also accept plain words
    m2 = re.search(r"\b(easy|medium|hard)\b", message, re.IGNORECASE)
    if m2:
        return m2.group(1).lower()
    return default


def _extract_count(message: str, kind: str, default: int) -> int:
    # Primary: "Exactly N questions/cards"
    m = re.search(rf"\bExactly\s+(\d+)\s+{kind}\b", message, re.IGNORECASE)
    if m:
        try:
            return int(m.group(1))
        except Exception:
            pass

    # Secondary: "Create N questions/cards"
    m2 = re.search(rf"\bCreate\s+(\d+)\s+{kind}\b", message, re.IGNORECASE)
    if m2:
        try:
            return int(m2.group(1))
        except Exception:
            pass

    # Tertiary: "N ... questions" anywhere
    m3 = re.search(rf"\b(\d+)\s+\w*\s*{kind}\b", message, re.IGNORECASE)
    if m3:
        try:
            return int(m3.group(1))
        except Exception:
            pass

    # Quaternary: "increase to N", "make it N", "change to N", "N questions" (short follow-ups)
    m4 = re.search(r"(?:to|it to|make it|change to|expand to)\s+(\d+)\b", message, re.IGNORECASE)
    if m4:
        try:
            return int(m4.group(1))
        except Exception:
            pass

    # Last: any standalone number in short follow-up messages
    m5 = re.search(r"\b(\d+)\b", message)
    if m5 and len(message.split()) <= 8:
        try:
            n = int(m5.group(1))
            if 1 <= n <= 50:
                return n
        except Exception:
            pass

    return default


def _extract_quiz_topic(message: str) -> str:
    # If this is the crisp artifact prompt, extract just the human topic portion.
    text = message
    if "###QUIZ_GENERATION_REQUEST###" in text:
        text = text.split("###QUIZ_GENERATION_REQUEST###", 1)[1]

    # Strip the JSON schema portion
    marker = "Return ONLY valid JSON"
    if marker in text:
        text = text.split(marker, 1)[0]

    # Prefer content after the last "about:" occurrence
    lowered = text.lower()
    idx = lowered.rfind("about:")
    if idx != -1:
        candidate = text[idx + len("about:") :].strip()
        # Take first non-empty line
        for line in candidate.splitlines():
            line = line.strip()
            if line:
                return line

    # Fallback: last non-empty line
    for line in reversed(text.splitlines()):
        line = line.strip()
        if line and not line.startswith("###"):
            return line

    return _extract_topic(message)


def _normalize_quiz_topic(topic: str) -> str:
    t = (topic or "").strip()
    if not t:
        return "key concepts"
    # If the extraction accidentally captured instruction-y text, fall back.
    lowered = t.lower()
    if "question" in lowered or "questions" in lowered:
        return "key concepts"
    if len(t) < 4:
        return "key concepts"
    return t


def _normalize_mindmap_topic(topic: str) -> str:
    t = (topic or "").strip()
    if not t or len(t) < 4:
        return "key concepts"
    lowered = t.lower()
    # Common follow-up filler that should not become a topic.
    if any(k in lowered for k in ("simple", "one", "it", "this", "that", "same", "above")) and len(t.split()) <= 4:
        return "key concepts"
    # If the extraction captured instruction-y text, fall back.
    if any(k in lowered for k in ("mind map", "mindmap", "concept map", "create", "make")) and len(t.split()) <= 6:
        return "key concepts"
    return t


def _coerce_quiz_to_frontend_schema(tool_output: str) -> str:
    """Convert tool JSON into frontend quiz array schema."""
    raw = (tool_output or "").strip()
    try:
        data = json.loads(raw)
    except Exception:
        return raw

    # Tool returns { quiz_title, difficulty, questions: [{options:{A..D}, correct_answer:"A"}] }
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        out = []
        for q in data.get("questions", []):
            if not isinstance(q, dict):
                continue
            options_dict = q.get("options") if isinstance(q.get("options"), dict) else {}
            options = [
                options_dict.get("A", ""),
                options_dict.get("B", ""),
                options_dict.get("C", ""),
                options_dict.get("D", ""),
            ]
            letter = (q.get("correct_answer") or "A")
            letter = str(letter).strip().upper()[:1]
            correct_idx = ord(letter) - 65
            if correct_idx < 0 or correct_idx > 3:
                correct_idx = 0
            out.append(
                {
                    "question": q.get("question", "").strip() if isinstance(q.get("question"), str) else "",
                    "options": [o for o in options],
                    "correctAnswer": correct_idx,
                    "explanation": q.get("explanation", "").strip() if isinstance(q.get("explanation"), str) else "",
                }
            )
        if out:
            return json.dumps(out, ensure_ascii=False)

    return raw


def _coerce_flashcards_to_frontend_schema(tool_output: str, fallback_title: str) -> str:
    """Convert tool JSON into frontend flashcards schema: {title, cards:[{id,front,back,category?}]}"""
    raw = (tool_output or "").strip()
    try:
        data = json.loads(raw)
    except Exception:
        return raw

    if isinstance(data, dict) and isinstance(data.get("cards"), list):
        title = data.get("title") if isinstance(data.get("title"), str) else fallback_title
        cards_out = []
        for i, card in enumerate(data.get("cards", [])):
            if not isinstance(card, dict):
                continue
            front = card.get("front")
            back = card.get("back")
            if not isinstance(front, str) or not isinstance(back, str):
                continue
            # map tags -> category (optional)
            category = None
            tags = card.get("tags")
            if isinstance(tags, list) and tags:
                first = tags[0]
                if isinstance(first, str) and first.strip():
                    category = first.strip()[:40]
            out_card = {
                "id": f"card-{i+1}",
                "front": front.strip(),
                "back": back.strip(),
            }
            if category:
                out_card["category"] = category
            cards_out.append(out_card)
        if cards_out:
            return json.dumps({"title": title, "cards": cards_out}, ensure_ascii=False)

    return raw


def _route_tool(message: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    """Heuristic tool router for providers that don't support native tool calling."""
    m = message.lower()

    # Course / tutorial / certification lookups
    if any(k in m for k in ("course", "courses", "tutorial", "certification", "bootcamp", "best course")):
        topic = _extract_course_query(message)
        query = f"best online courses for {topic}"
        return "search_web", {"query": query, "num_results": 5}

    # Notes / documents
    if any(k in m for k in ("my notes", "my note", "my documents", "my document", "uploaded", "pdf", "in my notes", "in my document")):
        return "search_sources", {"query": message}

    # RAG / grounded answers (treat as a request to use the user's sources)
    if any(
        k in m
        for k in (
            "rag",
            "retrieval augmented",
            "use sources",
            "using sources",
            "with sources",
            "use my sources",
            "my sources",
            "grounded",
            "based on my notes",
            "from my notes",
            "from my documents",
            "from my notebook",
        )
    ):
        return "search_sources", {"query": message}

    # Quiz / test
    if any(k in m for k in ("quiz", "test me", "mcq", "multiple choice")):
        num_questions = _extract_count(message, kind="questions", default=10)
        difficulty = _extract_difficulty(message, default="medium")
        topic = _normalize_quiz_topic(_extract_quiz_topic(message))
        return "generate_quiz", {"topic": topic, "num_questions": num_questions, "difficulty": difficulty}

    # Follow-up quiz refinements (no explicit "quiz" keyword)
    # Examples: "make it 5 questions", "increase it to 10", "only 5 questions", "change to 10"
    if re.search(r"\b\d+\b", m) and (
        "questions" in m
        or any(k in m for k in (
            "short", "shorter", "only", "just", "make it", "another", "more",
            "increase", "change", "update", "expand", "double", "to"
        ))
    ):
        num_questions = _extract_count(message, kind="questions", default=5)
        difficulty = _extract_difficulty(message, default="medium")
        return "generate_quiz", {"topic": "key concepts", "num_questions": num_questions, "difficulty": difficulty}

    # Flashcards
    if any(k in m for k in ("flashcard", "flash cards", "cards to memorize", "memorize")):
        num_cards = _extract_count(message, kind="cards", default=10)
        topic = _extract_topic(message)
        return "generate_flashcards", {"topic": topic, "num_cards": num_cards}

    # Mind map
    if any(k in m for k in ("mind map", "mindmap", "concept map")):
        topic = _normalize_mindmap_topic(_extract_topic(message))
        # Default to using sources when available; tool will ignore if notebook_id is missing.
        return "generate_mindmap", {"topic": topic, "include_sources": True}

    # Reports
    if any(k in m for k in ("report", "study report", "analysis report", "revision report")):
        topics = _extract_topic(message)
        return "generate_report", {"topics": topics, "include_sources": True}

    # Infographics
    if any(k in m for k in ("infographic", "visual summary", "visual cheat sheet", "one-pager")):
        topics = _extract_topic(message)
        return "generate_infographic", {"topics": topics, "include_sources": True}

    # Study plan
    if any(k in m for k in ("study plan", "study schedule", "learning plan", "plan for")):
        topic = _extract_topic(message)
        return "generate_study_plan", {"subject": topic, "topics": topic, "duration_days": 7}

    # Summarize (include common misspellings)
    if any(k in m for k in ("summarize", "summarise", "summraize", "summerize", "summary", "tldr", "tl;dr")):
        return "summarize_notes", {"topic": _extract_topic(message)}

    return None


async def _format_with_llm(user_message: str, tool_name: str, tool_output: str) -> str:
    """Ask the LLM to present tool output nicely, without tool-calling."""
    system = (
        "You are a study assistant. You MUST only use the provided tool output. "
        "Do not invent links, ratings, or prices. If missing, say 'Not provided'."
    )

    if tool_name == "search_web":
        system += (
            "\n\nFormat as a short markdown list of 3-5 items with clickable links when present. "
            "For each item include Platform if you can infer it from the title or URL."
        )

    if tool_name == "search_sources":
        system += (
            "\n\nAnswer the user's question using ONLY the excerpts. "
            "When you use a fact, cite it as (Source N) matching the tool output. "
            "If the sources are insufficient, say what's missing and ask one clarifying question."
        )

    resp = await chat_completion(
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": (
                    f"User request:\n{user_message}\n\n"
                    f"Tool used: {tool_name}\n\n"
                    f"Tool output:\n{tool_output}\n\n"
                    "Now produce the final answer."
                ),
            },
        ],
        stream=False,
    )

    try:
        return resp.choices[0].message.content or tool_output
    except Exception:
        return tool_output


def _infer_platform_from_url(url: str) -> Optional[str]:
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        host = (url or "").lower()

    if "coursera" in host:
        return "Coursera"
    if "udemy" in host:
        return "Udemy"
    if "edx" in host:
        return "edX"
    if "codecademy" in host:
        return "Codecademy"
    if "pluralsight" in host:
        return "Pluralsight"
    if "linkedin" in host:
        return "LinkedIn Learning"
    if "udacity" in host:
        return "Udacity"
    if "skillshare" in host:
        return "Skillshare"
    if "youtube" in host or "youtu.be" in host:
        return "YouTube"
    return None


def _courses_markdown_from_search_web_output(tool_output: str, max_items: int = 8) -> str:
    """Convert `search_web` formatted text results into frontend-parsable markdown lines."""
    text = tool_output or ""

    # Blocks look like:
    # **Title**\nSnippet\n🔗 https://...\n
    pattern = re.compile(
        r"\*\*(?P<title>[^*]+)\*\*\s*\n(?P<snippet>.*?)\n🔗\s*(?P<url>\S+)",
        re.DOTALL,
    )
    items: List[Dict[str, str]] = []

    for match in pattern.finditer(text):
        title = (match.group("title") or "").strip()
        url = (match.group("url") or "").strip()
        snippet = (match.group("snippet") or "").strip()
        if not title or not url:
            continue

        platform = _infer_platform_from_url(url) or "Unknown"
        items.append({
            "title": title,
            "url": url,
            "platform": platform,
            "description": snippet,
        })
        if len(items) >= max_items:
            break

    if not items:
        return text.strip()

    # IMPORTANT: ChatPanel only triggers course parsing when it sees a markdown link AND 'Platform:'
    lines: List[str] = []
    for course in items:
        lines.append(
            f"- [{course['title']}]({course['url']}) - Platform: {course['platform']} | Rating: Not provided | Price: Not provided"
        )
    return "\n".join(lines)


async def run_agent(
    user_id: str,
    session_id: str,
    message: str,
    notebook_id: Optional[str] = None,
    use_rag: bool = False,
    source_ids: Optional[List[str]] = None,
    stream: bool = True
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Run ReAct agent with user message and stream tool calls + responses.
    
    This is the main entry point for chat interactions.
    
    Args:
        user_id: User identifier
        session_id: Session/conversation identifier
        message: User's message
        notebook_id: Optional notebook context
        stream: Whether to stream response (always True for real-time UX)
    
    Yields:
        Dict events with types:
        - {"type": "tool_start", "tool": tool_name, "inputs": {...}}
        - {"type": "tool_end", "tool": tool_name, "output": "..."}
        - {"type": "token", "content": "..."}  # Text tokens
        - {"type": "complete", "message": "..."}  # Final message
    """
    llm_cfg = get_llm_config()
    provider = (llm_cfg.provider or "").lower()
    base_url = (getattr(llm_cfg, "base_url", "") or "").lower()
    # Native function/tool calling is reliably supported on OpenAI's own API.
    # Many OpenAI-compatible providers return errors like "Failed to call a function".
    # Treat empty base_url as OpenAI default.
    supports_native_tool_calling = provider == "openai" and (not base_url or "api.openai.com" in base_url)

    # Frontend may omit use_rag but still pass selected source_ids.
    effective_use_rag = bool(use_rag) or (isinstance(source_ids, list) and len(source_ids) > 0)

    def _inject_context_if_supported(tool_obj: Any, tool_inputs: Any) -> Any:
        """Inject user_id/notebook_id into tool inputs when the tool supports them."""
        if not isinstance(tool_inputs, dict):
            return tool_inputs

        supported: set[str] = set()
        schema = getattr(tool_obj, "args_schema", None)
        if schema is not None:
            try:
                # Pydantic v2
                supported = set(getattr(schema, "model_fields", {}).keys())
            except Exception:
                supported = set()

        # Fallback: if no schema is available, don't risk passing extra keys.
        if not supported:
            return tool_inputs

        if "user_id" in supported and tool_inputs.get("user_id") in (None, ""):
            tool_inputs["user_id"] = user_id
        if "notebook_id" in supported and tool_inputs.get("notebook_id") in (None, ""):
            # Only inject if we actually have one; some requests are not notebook-scoped.
            if notebook_id:
                tool_inputs["notebook_id"] = notebook_id

        if (
            "source_ids" in supported
            and tool_inputs.get("source_ids") in (None, "")
            and isinstance(source_ids, list)
            and source_ids
        ):
            tool_inputs["source_ids"] = source_ids
        return tool_inputs

    # If the frontend explicitly requests RAG and no specific tool intent is detected,
    # treat this as a request to answer from the selected sources.
    routed = _route_tool(message)
    if routed is None and effective_use_rag:
        routed = ("search_sources", {"query": message})

    # Load conversation history for context (needed for follow-ups like "increase it to 10")
    conv_manager = get_conversation_manager()
    history = conv_manager.get_history(user_id, session_id, limit=10)
    langchain_history = _format_history_for_langchain(history)

    # For non-OpenAI providers, native tool calling can be unreliable.
    # Use heuristic router + tool invocation, but include history in a plain-chat fallback.
    if not supports_native_tool_calling:
        if routed is not None:
            tool_name, tool_inputs = routed
            tool_obj = next((t for t in ALL_TOOLS if getattr(t, "name", None) == tool_name), None)
            if tool_obj is None:
                yield {
                    "type": "error",
                    "message": f"Tool '{tool_name}' is not registered.",
                    "details": {"tool": tool_name},
                }
                return

            tool_inputs = _inject_context_if_supported(tool_obj, tool_inputs)
            print(f"🛠️ Routed tool for provider={provider}: {tool_name} inputs={tool_inputs}")
            yield {"type": "tool_start", "tool": tool_name, "inputs": tool_inputs}
            try:
                if hasattr(tool_obj, "ainvoke"):
                    tool_output = await tool_obj.ainvoke(tool_inputs)
                else:
                    tool_output = tool_obj.invoke(tool_inputs)
            except Exception as e:
                yield {
                    "type": "error",
                    "message": f"I encountered an error running tool '{tool_name}': {str(e)}",
                    "details": {"tool": tool_name, "error": str(e)},
                }
                return

            yield {"type": "tool_end", "tool": tool_name, "output": tool_output}

            if tool_name == "search_web":
                course_list = _courses_markdown_from_search_web_output(str(tool_output), max_items=8)
                final_text = json.dumps({"tool": None, "answer": course_list}, ensure_ascii=False)
            elif tool_name == "summarize_notes":
                # Tool already returns Markdown; preserve it as-is.
                final_text = str(tool_output)
            elif tool_name == "generate_mindmap":
                # Tool returns JSON; preserve it as-is so the frontend parser/viewer can render it.
                final_text = str(tool_output)
            elif tool_name in ("generate_report", "generate_infographic"):
                # Preserve tool output verbatim (markdown for reports, JSON for infographics).
                final_text = str(tool_output)
            elif tool_name == "generate_quiz":
                # Frontend expects a JSON array of questions with numeric correctAnswer index.
                final_text = _coerce_quiz_to_frontend_schema(str(tool_output))
            elif tool_name == "generate_flashcards":
                # Frontend expects {title, cards:[{id,front,back,category?}]}
                fallback_title = tool_inputs.get("topic") if isinstance(tool_inputs, dict) else "Flashcards"
                final_text = _coerce_flashcards_to_frontend_schema(str(tool_output), fallback_title=str(fallback_title))
            else:
                final_text = await _format_with_llm(message, tool_name, str(tool_output))

            yield {"type": "token", "content": final_text}
            yield {"type": "complete", "message": final_text}
            return

        # No routed tool: do a plain chat completion with conversation history.
        # Include history so the LLM understands follow-ups (e.g. "increase it to 10").
        msg_list = [{"role": "system", "content": "You are a study assistant. Answer clearly and concisely. If the user gives a short follow-up (e.g. 'increase it to 10', 'make it 5 questions'), interpret it in context of the previous messages."}]
        for h in history:
            if h.get("role") == "user":
                msg_list.append({"role": "user", "content": h.get("content", "")})
            elif h.get("role") == "assistant":
                msg_list.append({"role": "assistant", "content": h.get("content", "")})
        msg_list.append({"role": "user", "content": message})

        resp = await chat_completion(
            messages=msg_list,
            stream=True,
        )

        full_text = ""
        try:
            async for chunk in resp:
                delta = None
                try:
                    delta = chunk.choices[0].delta.content
                except Exception:
                    delta = None
                if delta:
                    full_text += delta
                    yield {"type": "token", "content": delta}
        except Exception:
            # If streaming fails for some provider, fall back to non-streaming.
            resp2 = await chat_completion(
                messages=msg_list,
                stream=False,
            )
            try:
                full_text = resp2.choices[0].message.content or ""
            except Exception:
                full_text = ""
            if full_text:
                yield {"type": "token", "content": full_text}

        yield {"type": "complete", "message": full_text}
        return

    # OpenAI native tool-calling path is allowed, but when the frontend asks for RAG,
    # prefer deterministic retrieval to ensure the answer is grounded in the selected sources.
    if effective_use_rag and routed is not None:
        tool_name, tool_inputs = routed
        tool_obj = next((t for t in ALL_TOOLS if getattr(t, "name", None) == tool_name), None)
        if tool_obj is not None:
            tool_inputs = _inject_context_if_supported(tool_obj, tool_inputs)
            yield {"type": "tool_start", "tool": tool_name, "inputs": tool_inputs}
            try:
                if hasattr(tool_obj, "ainvoke"):
                    tool_output = await tool_obj.ainvoke(tool_inputs)
                else:
                    tool_output = tool_obj.invoke(tool_inputs)
            except Exception as e:
                yield {
                    "type": "error",
                    "message": f"I encountered an error running tool '{tool_name}': {str(e)}",
                    "details": {"tool": tool_name, "error": str(e)},
                }
                return
            yield {"type": "tool_end", "tool": tool_name, "output": tool_output}

            if tool_name in ("generate_mindmap", "generate_report", "generate_infographic"):
                final_text = str(tool_output)
            elif tool_name == "search_web":
                course_list = _courses_markdown_from_search_web_output(str(tool_output), max_items=8)
                final_text = json.dumps({"tool": None, "answer": course_list}, ensure_ascii=False)
            else:
                final_text = await _format_with_llm(message, tool_name, str(tool_output))

            yield {"type": "token", "content": final_text}
            yield {"type": "complete", "message": final_text}
            return

    # Create agent (history already loaded above)
    agent = _create_agent(user_id, notebook_id)
    
    # Prepare configuration with user context for tool injection
    config = {
        "configurable": {
            "thread_id": f"{user_id}:{session_id}",
            "user_id": user_id,
            "notebook_id": notebook_id
        }
    }
    
    # Prepare input with history
    agent_input = {
        "messages": langchain_history + [HumanMessage(content=message)]
    }
    
    full_response = ""
    tool_calls = []
    preserve_verbatim_tools = {
        # Artifacts that the frontend expects to be parseable as-is.
        "generate_report",       # markdown
        "generate_infographic",  # JSON
        "generate_mindmap",      # JSON
    }
    force_verbatim_output = False
    verbatim_output: Optional[str] = None
    verbatim_emitted = False
    
    try:
        # Stream agent execution
        async for event in agent.astream(agent_input, config=config, stream_mode="values"):
            messages = event.get("messages", [])
            if not messages:
                continue
            
            # Get the last message in this event
            last_msg = messages[-1]
            
            # Handle different message types
            if isinstance(last_msg, AIMessage):
                # Check for tool calls
                if hasattr(last_msg, 'tool_calls') and last_msg.tool_calls:
                    for tool_call in last_msg.tool_calls:
                        tool_name = tool_call.get('name', 'unknown')
                        tool_inputs = tool_call.get('args', {})

                        if tool_name in preserve_verbatim_tools:
                            force_verbatim_output = True
                        
                        # Emit tool start event
                        yield {
                            "type": "tool_start",
                            "tool": tool_name,
                            "inputs": tool_inputs
                        }
                        
                        tool_calls.append({
                            "tool": tool_name,
                            "inputs": tool_inputs
                        })
                
                # Check for content (final response or reasoning)
                if hasattr(last_msg, 'content') and last_msg.content and isinstance(last_msg.content, str):
                    # If we're generating a structured artifact, ignore any post-tool rewriting.
                    if force_verbatim_output:
                        continue

                    # This is the final response text
                    if last_msg.content not in full_response:
                        # Stream tokens
                        new_content = last_msg.content[len(full_response):]
                        full_response = last_msg.content
                        
                        if new_content:
                            yield {
                                "type": "token",
                                "content": new_content
                            }
            
            elif isinstance(last_msg, ToolMessage):
                # Tool execution completed
                tool_name = last_msg.name if hasattr(last_msg, 'name') else "unknown"
                tool_output = last_msg.content
                
                yield {
                    "type": "tool_end",
                    "tool": tool_name,
                    "output": tool_output
                }

                if tool_name in preserve_verbatim_tools:
                    verbatim_output = str(tool_output)
                    full_response = verbatim_output
                    if not verbatim_emitted and verbatim_output:
                        verbatim_emitted = True
                        yield {"type": "token", "content": verbatim_output}
        
        # Emit completion event
        final_message = verbatim_output if verbatim_output is not None else full_response
        yield {
            "type": "complete",
            "message": final_message
        }
        
        # Save conversation turn
        conv_manager.save_turn(
            user_id=user_id,
            session_id=session_id,
            user_message=message,
            assistant_message=final_message,
            notebook_id=notebook_id,
            metadata={"tool_calls": tool_calls} if tool_calls else None
        )
    
    except Exception as e:
        import traceback
        import os

        # Log full details server-side to help debug tool-calling failures.
        print("❌ Agent exception:", repr(e))
        traceback.print_exc()

        include_debug = os.getenv("DEBUG_AGENT_ERRORS", "false").lower() == "true"

        debug_details: Dict[str, Any] = {
            "error_type": type(e).__name__,
            "error": str(e),
        }
        if include_debug:
            for attr in ("body", "response", "status_code", "message"):
                if hasattr(e, attr):
                    try:
                        debug_details[attr] = getattr(e, attr)
                    except Exception:
                        pass

        error_msg = (
            f"I encountered an error: {str(e)}\n\n"
            "Please try rephrasing your question."
        )

        yield {
            "type": "error",
            "message": error_msg,
            "details": debug_details if include_debug else str(e),
        }
        
        # Save error turn
        conv_manager.save_turn(
            user_id=user_id,
            session_id=session_id,
            user_message=message,
            assistant_message=error_msg,
            notebook_id=notebook_id,
            metadata={"error": debug_details}
        )


async def chat(
    user_id: str,
    session_id: str,
    message: str,
    notebook_id: Optional[str] = None
) -> str:
    """
    Non-streaming chat interface (collects all events and returns final message).
    
    Args:
        user_id: User identifier
        session_id: Session identifier
        message: User message
        notebook_id: Optional notebook context
    
    Returns:
        Complete assistant response
    """
    response = ""
    async for event in run_agent(user_id, session_id, message, notebook_id, stream=True):
        if event["type"] == "token":
            response += event["content"]
        elif event["type"] == "complete":
            response = event["message"]
    return response
