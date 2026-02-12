"""
Study Assistant Agent - Simplified Linear Architecture.

This version replaces the ReAct agent with a direct flow:
User -> Router LLM -> Tool Execution -> Formatter LLM.
SessionTaskState is used to manage conversational context and mutations.
"""

from typing import AsyncGenerator, Optional, Dict, Any, List, Tuple
from core.llm import get_langchain_llm, get_llm_config, chat_completion
from core.conversation import get_conversation_manager
from core.session_state import get_session_state, SessionTaskState
from core.router import route_message
from core.validator import validate_retrieval_plan
from core.retrieval_service import get_hybrid_context, fetch_source_metadata
from core.tool_registry import registry
from core.response_manager import ResponseManager
from tools import ALL_TOOLS
import json
import re
import logging

logger = logging.getLogger(__name__)

def _clean_params(params: Dict[str, Any]) -> Dict[str, Any]:
    """Remove placeholder strings and actual None values from params."""
    cleaned = {}
    for k, v in params.items():
        if v is None:
            continue
        if isinstance(v, str) and v.lower() in ("none", "null", "n/a", "undefined", ""):
            continue
        cleaned[k] = v
    return cleaned


async def run_agent(
    user_id: str,
    session_id: str,
    message: str,
    notebook_id: Optional[str] = None,
    use_rag: bool = False,
    source_ids: Optional[List[str]] = None,
    stream: bool = True,
    sender_name: Optional[str] = None,
    is_collaborative: bool = False,
    token: Optional[str] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Main entry point using the simplified linear flow.
    """
    # 1. Initialize State and History
    session_state = get_session_state(session_id)
    conv_manager = get_conversation_manager()
    history = conv_manager.get_history(user_id, session_id, limit=10)
    
    # Pre-fetch source metadata for the Planner
    selected_sources = []
    if source_ids:
        selected_sources = await fetch_source_metadata(notebook_id, source_ids, token)
    
    # 2. Control Planner - Decide Task & Initial Retrieval Strategy
    planner_output = await route_message(message, history, session_state, selected_sources)
    thought = planner_output.get("thought")
    action = planner_output.get("action")
    task = planner_output.get("task")
    
    # 3. Retrieval Validator - Determine Final Policy & Mode (Deterministic)
    validation = validate_retrieval_plan(
        policy=planner_output.get("retrieval_policy", "GLOBAL"),
        mode=planner_output.get("retrieval_mode", "NONE"),
        selected_sources_count=len(source_ids or [])
    )
    
    final_policy = validation["final_policy"]
    final_mode = validation["final_mode"]
    
    if validation["changed"]:
        logger.info(f"🛡️ Validator corrected plan: {validation['reason']}")

    # Emit thinking step for UI
    if thought:
        msg = f"💭 {thought}"
        if validation["changed"]:
            msg += f" (Note: {validation['reason']})"
        yield {"type": "thinking", "content": msg}

    # 4. Handle Task Actions
    if action == "START_TASK" or action == "MODIFY_PARAM":
        # Resolve tool name from task
        tool_name = f"generate_{task.lower()}" if task != "COURSE_SEARCH" else "search_web"
        if task == "SUMMARY": tool_name = "summarize_notes"
        
        params = planner_output.get("param_updates", {})
        params = _clean_params(params)
        
        # Map 'topic' to 'query' or 'subject' where needed
        if tool_name == "search_web" and "topic" in params:
            params["query"] = params.pop("topic")
        elif tool_name == "generate_study_plan" and "topic" in params:
            params["subject"] = params.get("topic")
            params["topics"] = params.pop("topic")
        
        yield {"type": "tool_start", "tool": tool_name, "inputs": params}
        
        # Track task in session state
        session_state.set_task(task, tool_name, params)
        
        # Locate tool object
        tool_obj = next((t for t in ALL_TOOLS if t.name == tool_name), None)
        if not tool_obj:
            yield {"type": "error", "message": f"Tool '{tool_name}' not found."}
            return
            
        # Context Injection
        final_params = params.copy()
        if "user_id" not in final_params: final_params["user_id"] = user_id
        if "notebook_id" not in final_params and notebook_id: final_params["notebook_id"] = notebook_id
        if "source_ids" not in final_params and source_ids: final_params["source_ids"] = source_ids
        
        # Inject Validated Policy & Mode into tool params
        final_params["retrieval_policy"] = final_policy
        final_params["retrieval_mode"] = final_mode
        final_params["token"] = token
        
        try:
            # Execute tool
            print(f"🛠️ Executing {tool_name} with {final_params}")
            if hasattr(tool_obj, "ainvoke"):
                output = await tool_obj.ainvoke(final_params)
            else:
                output = tool_obj.invoke(final_params)
                
            yield {"type": "tool_end", "tool": tool_name, "output": output}
            
            # Dynamic Formatting
            metadata = registry.get_metadata(tool_name)
            if metadata:
                content = await ResponseManager.format_response(tool_name, output, metadata, final_params)
            else:
                content = str(output)
            
            # Stream tokens
            if isinstance(content, str):
                for token_chunk in re.split(r"(\s+)", content):
                    if token_chunk: yield {"type": "token", "content": token_chunk}
                yield {"type": "complete", "message": content}
                conv_manager.save_turn(user_id, session_id, message, content, notebook_id,
                                       sender_id=user_id, sender_name=sender_name)
            else:
                msg = f"I've successfully performed '{tool_name}' for you."
                yield {"type": "token", "content": msg}
                yield {"type": "complete", "message": msg}
                conv_manager.save_turn(user_id, session_id, message, msg, notebook_id,
                                       sender_id=user_id, sender_name=sender_name)
                
        except Exception as e:
            print(f"❌ Execution error: {e}")
            yield {"type": "error", "message": f"I hit a snag running the {tool_name} tool."}
            
        return

    # 5. Hybrid Retrieval Stage (For general chat grounded in sources)
    context = await get_hybrid_context(
        user_id=user_id,
        notebook_id=notebook_id,
        policy=final_policy,
        mode=final_mode,
        source_ids=source_ids or [],
        query=message,
        token=token
    )

    # 6. Standard Conversation with Grounded Context
    system_prompt = "You are a helpful study assistant. Be supportive and keep answers clear."
    
    # Source Awareness in System Prompt
    if selected_sources:
        source_names = ", ".join([s['name'] for s in selected_sources])
        system_prompt += f"\n\nYou are currently grounded in the following sources: {source_names}."

    if context:
        system_prompt += f"\n\nUse the following context to help answer the user. Be concise and prioritize information from the context if it matches the query.\n\nCONTEXT:\n{context}"
        if final_policy == "STRICT_SELECTED":
            system_prompt += "\n\nCRITICAL: Use ONLY the provided context. If the answer is not there, say you don't know based on the selected sources."
        else:
            system_prompt += "\n\nIf the provided context doesn't contain the answer but is related, say so. If completely unrelated, you may use your general knowledge but mention it's not in the sources."
    elif final_mode == "NONE" and notebook_id:
        system_prompt += "\n\nYou have access to the notebook but no specific context was retrieved for this turn. If the user is asking about the sources, suggest that they ask for a 'summary' or 'more detail'."

    messages = [
        {"role": "system", "content": system_prompt},
    ]
    
    # For collaborative sessions, include sender context
    if is_collaborative and sender_name:
        messages[0]["content"] += f"\n\nNote: This is a collaborative study session. The current speaker is '{sender_name}'."
    
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})
    
    try:
        resp_stream = await chat_completion(messages, stream=True)
        full_text = ""
        async for chunk in resp_stream:
            delta = chunk.choices[0].delta.content
            if delta:
                full_text += delta
                yield {"type": "token", "content": delta}
        
        yield {"type": "complete", "message": full_text}
        conv_manager.save_turn(user_id, session_id, message, full_text, notebook_id,
                               sender_id=user_id, sender_name=sender_name)
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        yield {"type": "error", "message": "I'm having trouble connecting right now."}


def _coerce_quiz_to_frontend_schema(tool_output: str) -> str:
    """Convert tool JSON into frontend quiz array schema."""
    raw = (tool_output or "").strip()
    try:
        # If it's already a list, it might be the frontend schema already
        data = json.loads(raw)
        if isinstance(data, list): return raw
    except Exception:
        return raw

    # Tool returns { quiz_title, difficulty, questions: [{options:{A..D}, correct_answer:"A"}] }
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        out = []
        for q in data.get("questions", []):
            if not isinstance(q, dict): continue
            options_dict = q.get("options") if isinstance(q.get("options"), dict) else {}
            options = [
                options_dict.get("A", ""),
                options_dict.get("B", ""),
                options_dict.get("C", ""),
                options_dict.get("D", ""),
            ]
            letter = str(q.get("correct_answer") or "A").strip().upper()[:1]
            correct_idx = ord(letter) - 65 if 'A' <= letter <= 'D' else 0
            out.append({
                "question": str(q.get("question", "")),
                "options": options,
                "correctAnswer": correct_idx,
                "explanation": str(q.get("explanation", "")),
            })
        if out: return json.dumps(out, ensure_ascii=False)
    return raw


def _coerce_flashcards_to_frontend_schema(tool_output: str, fallback_title: str) -> str:
    """Convert tool JSON into frontend flashcards schema."""
    raw = (tool_output or "").strip()
    try:
        data = json.loads(raw)
    except Exception:
        return raw

    if isinstance(data, dict) and isinstance(data.get("cards"), list):
        title = data.get("title") if isinstance(data.get("title"), str) else fallback_title
        cards_out = []
        for i, card in enumerate(data.get("cards", [])):
            if not isinstance(card, dict): continue
            front, back = card.get("front"), card.get("back")
            if not front or not back: continue
            
            category = None
            tags = card.get("tags")
            if isinstance(tags, list) and tags:
                category = str(tags[0]).strip()[:40]

            out_card = {"id": f"card-{i+1}", "front": str(front).strip(), "back": str(back).strip()}
            if category: out_card["category"] = category
            cards_out.append(out_card)
            
        if cards_out: return json.dumps({"title": title, "cards": cards_out}, ensure_ascii=False)
    return raw


# Non-streaming wrapper for sync-like interactions


async def chat(
    user_id: str,
    session_id: str,
    message: str,
    notebook_id: Optional[str] = None,
    source_ids: Optional[List[str]] = None,
) -> str:
    """Non-streaming wrapper."""
    response = ""
    async for event in run_agent(user_id, session_id, message, notebook_id=notebook_id, source_ids=source_ids):
        if event["type"] == "token":
            response += event["content"]
        elif event["type"] == "complete":
            response = event["message"]
    return response
