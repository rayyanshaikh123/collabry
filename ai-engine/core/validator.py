"""
Retrieval Validator - Deterministic Rule Engine.

Ensures the combination of policy and mode is logically possible and safe.
This module is pure Python and contains no LLM calls for maximum safety.
"""

from typing import Dict, Any, Tuple

def validate_retrieval_plan(
    policy: str, 
    mode: str, 
    selected_sources_count: int
) -> Dict[str, Any]:
    """
    Verify and correct the planner decision so retrieval is logically possible and safe.
    
    Args:
        policy: The requested retrieval policy (STRICT_SELECTED, etc.)
        mode: The requested retrieval mode (CHUNK_SEARCH, etc.)
        selected_sources_count: Number of sources currently selected by the user.
        
    Returns:
        Dict containing final_policy, final_mode, changed (bool), and reason.
    """
    final_policy = policy
    final_mode = mode
    reason = "valid"
    changed = False

    # Rule 1: STRICT_SELECTED requires at least one selected source.
    if final_policy == "STRICT_SELECTED" and selected_sources_count == 0:
        final_policy = "AUTO_EXPAND"
        reason = "STRICT_SELECTED requires >= 1 source. Falling back to AUTO_EXPAND."
        changed = True

    # Rule 2: GLOBAL knowledge cannot use retrieval.
    if final_policy == "GLOBAL":
        if final_mode != "NONE":
            final_mode = "NONE"
            reason = "GLOBAL policy overrides mode to NONE."
            changed = True

    # Rule 3: FULL_DOCUMENT requires selected sources.
    if final_mode == "FULL_DOCUMENT" and selected_sources_count == 0:
        final_mode = "NONE"
        final_policy = "GLOBAL"
        reason = "FULL_DOCUMENT requires >= 1 source. Changing to GLOBAL/NONE."
        changed = True

    # Rule 4: MULTI_DOC_SYNTHESIS requires at least 2 sources.
    if final_mode == "MULTI_DOC_SYNTHESIS" and selected_sources_count < 2:
        final_mode = "CHUNK_SEARCH"
        reason = "MULTI_DOC_SYNTHESIS requires >= 2 sources. Downgrading to CHUNK_SEARCH."
        changed = True

    # Rule 6: NONE mode overrides policy only if we aren't in a notebook session.
    # Actually, we should keep the requested policy so the system prompt stays grounded.
    if final_mode == "NONE":
        # We don't force GLOBAL here anymore to allow "Source Awareness" in general chat.
        pass

    # Rule 5: STRICT_SELECTED cannot expand beyond selected sources.
    if final_policy == "STRICT_SELECTED":
        allowed_modes = ["CHUNK_SEARCH", "FULL_DOCUMENT", "MULTI_DOC_SYNTHESIS", "NONE"]
        if final_mode not in allowed_modes:
            final_mode = "CHUNK_SEARCH"
            reason = "STRICT_SELECTED supports search or NONE mode."
            changed = True

    return {
        "final_policy": final_policy,
        "final_mode": final_mode,
        "changed": changed,
        "reason": reason
    }
