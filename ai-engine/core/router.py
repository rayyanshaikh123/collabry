from typing import Optional, Dict, Any, List, Tuple
import json
import re
from core.llm import chat_completion
from core.session_state import SessionTaskState

ROUTER_PROMPT = """You are a Study Assistant Router. Your job is to classify the user's intent and extract tool parameters.

TOOLS:
- search_web(query): Search the global internet for courses, tutorials, news, and general info.
- search_sources(query): Search the user's specific uploaded documents and notes.
- generate_quiz(topic, num_questions): Create a practice quiz.
- generate_flashcards(topic, num_cards): Create study flashcards.
- generate_mindmap(topic): Create a visual concept map.
- summarize_notes(topic): Summarize documents or notes.

CONVERSATION:
If the user is just chatting, asking a general question, or following up on a previous topic without needing a new tool run, return tool="none".

SESSION STATE:
Active Task: %s
Topic: %s

RESPONSE FORMAT (JSON ONLY):
{
  "thought": "brief reasoning",
  "tool": "tool_name or none",
  "params": { ... }
}

EXAMPLES:
User: "find Python courses" -> {"tool": "search_web", "params": {"query": "Python courses"}, "thought": "Web search for courses"}
User: "make a quiz about it" -> {"tool": "generate_quiz", "params": {"topic": "%s"}, "thought": "Quiz on current topic"}
User: "make it 10 questions" -> {"tool": "none", "params": {"num_questions": 10}, "thought": "Mutation for active quiz"}
User: "tell me more" -> {"tool": "none", "params": {}, "thought": "Conversational follow-up"}
"""

async def route_message(
    message: str,
    history: List[Dict[str, str]],
    session_state: SessionTaskState
) -> Tuple[Optional[str], Dict[str, Any], str]:
    """
    Route a message to a tool or determine it's conversational.
    
    Returns: (tool_name_or_none, params, thought)
    """
    active_task = session_state.active_task or "none"
    current_topic = session_state.task_params.get("topic") or session_state.task_params.get("subject") or "none"
    
    # 1. Check for manual mutations first (fast & reliable)
    mutation = _detect_mutation(message, session_state)
    if mutation:
        return session_state.last_tool, {**session_state.task_params, **mutation}, f"Detected mutation: {mutation}"

    # 2. Use LLM for routing
    history_text = "\n".join([f"{h['role']}: {h['content'][:100]}" for h in history[-3:]])
    
    prompt = ROUTER_PROMPT % (active_task, current_topic, current_topic)
    
    try:
        response = await chat_completion(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"History:\n{history_text}\n\nUser Message: {message}"}
            ],
            temperature=0,
            max_tokens=200,
            stream=False
        )
        
        raw_content = response.choices[0].message.content.strip()
        # Strip markdown if present
        if raw_content.startswith("```"):
            raw_content = re.sub(r"```(json)?", "", raw_content).strip("`").strip()
            
        data = json.loads(raw_content)
        tool = data.get("tool")
        params = data.get("params", {})
        thought = data.get("thought", "Classified intent")
        
        if tool == "none":
            return None, params, thought
            
        return tool, params, thought
        
    except Exception as e:
        print(f"⚠️ Router error: {e}")
        return None, {}, "Router failed, falling back to conversation"

def _detect_mutation(message: str, state: SessionTaskState) -> Optional[Dict[str, Any]]:
    """Simple heuristic for common follow-up mutations."""
    if not state.active_task:
        return None
        
    msg = message.lower()
    updates = {}
    
    # Check for number changes
    num_match = re.search(r'\b(\d+)\b', msg)
    if num_match:
        val = int(num_match.group(1))
        if state.active_task == "quiz" and ("question" in msg or "make it" in msg):
            updates["num_questions"] = val
        elif state.active_task == "flashcards" and ("card" in msg or "make it" in msg):
            updates["num_cards"] = val
            
    # Check for difficulty
    if "easy" in msg or "beginner" in msg:
        updates["difficulty"] = "easy"
    elif "hard" in msg or "advanced" in msg:
        updates["difficulty"] = "hard"
    elif "medium" in msg:
        updates["difficulty"] = "medium"
        
    return updates if updates else None
