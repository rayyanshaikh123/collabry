from typing import Optional, Dict, Any, List, Tuple
import json
import re
from core.llm import chat_completion
from core.session_state import SessionTaskState

ROUTER_PROMPT = """You are the CONTROL PLANNER of a Study Assistant system.

Your job is to decide what the system should do and how information must be retrieved.
You DO NOT answer the user. You ONLY decide the plan.

---
TASK ACTIONS

START_TASK: Begin a new tool-based task.
MODIFY_PARAM: Tweak parameters of an existing task (difficulty, count).
ASK_ARTIFACT: User is asking about a specific item in a quiz/mindmap/report.
ANSWER_GENERAL: Small-talk or general questions not needing sources.
CLARIFY: Ask the user for more info if needed.

---
TASK TYPES
QUIZ, FLASHCARDS, MINDMAP, SUMMARY, STUDY_PLAN, COURSE_SEARCH, NONE

---
RETRIEVAL POLICY (AUTHORITY)

STRICT_SELECTED: Answer must come ONLY from selected sources.
PREFER_SELECTED: Use selected sources first, fallback to notebook if needed.
AUTO_EXPAND: Search across all user knowledge.
GLOBAL: General info; ignore notebook sources.

---
RETRIEVAL MODE (HOW TO READ DATA)

CHUNK_SEARCH: Semantic search over chunks. (Used for specific detail questions)
FULL_DOCUMENT: Process the entire raw source. (Used for summary, recap, overview)
MULTI_DOC_SYNTHESIS: Combine info across >1 source. (Used for comparisons)
NONE: No retrieval needed.

---
SESSION STATE:
Active Task: %s
Current Topic: %s
Selected Sources (%d):
%s

RESPONSE FORMAT (JSON ONLY):
{
  "action": "START_TASK | MODIFY_PARAM | ASK_ARTIFACT | ANSWER_GENERAL | SWITCH_TASK | CLARIFY",
  "task": "QUIZ | FLASHCARDS | MINDMAP | SUMMARY | STUDY_PLAN | COURSE_SEARCH | NONE",
  "retrieval_policy": "STRICT_SELECTED | PREFER_SELECTED | AUTO_EXPAND | GLOBAL",
  "retrieval_mode": "CHUNK_SEARCH | FULL_DOCUMENT | MULTI_DOC_SYNTHESIS | NONE",
  "param_updates": {
    "topic": string | null,
    "difficulty": string | null,
    "count": number | null
  },
  "thought": "brief reasoning"
}
"""

async def route_message(
    message: str,
    history: List[Dict[str, str]],
    session_state: SessionTaskState,
    selected_sources: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Route a message using the Control Planner architecture.
    """
    active_task = session_state.active_task or "none"
    current_topic = session_state.task_params.get("topic") or "none"
    
    sources_text = ""
    if selected_sources:
        for s in selected_sources:
            sources_text += f"- {s.get('name')} ({s.get('type')})\n"
    else:
        sources_text = "None"

    # Use LLM for routing
    history_text = "\n".join([f"{h['role']}: {h['content'][:300]}" for h in history[-5:]])
    
    prompt = ROUTER_PROMPT % (active_task, current_topic, len(selected_sources or []), sources_text)
    
    try:
        response = await chat_completion(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"History:\n{history_text}\n\nUser Message: {message}"}
            ],
            temperature=0,
            max_tokens=300,
            stream=False
        )
        
        raw_content = response.choices[0].message.content.strip()
        # Strip markdown if present
        if raw_content.startswith("```"):
            raw_content = re.sub(r"```(json)?", "", raw_content).strip("`").strip()
            
        data = json.loads(raw_content)
        
        # Ensure minimal fields exist
        data.setdefault("action", "ANSWER_GENERAL")
        data.setdefault("task", "NONE")
        data.setdefault("retrieval_policy", "GLOBAL")
        data.setdefault("retrieval_mode", "NONE")
        data.setdefault("param_updates", {})
        data.setdefault("thought", "Determined intent")
        
        return data
        
    except Exception as e:
        print(f"⚠️ Planner error: {e}")
        return {
            "action": "ANSWER_GENERAL",
            "task": "NONE",
            "retrieval_policy": "GLOBAL",
            "retrieval_mode": "NONE",
            "param_updates": {},
            "thought": "Planner failed, falling back to general chat."
        }

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
