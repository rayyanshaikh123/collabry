"""
Retrieval Service - Orchestrates semantic search (RAG) and full-text retrieval.
"""

import logging
import httpx
from typing import List, Optional, Dict, Any
from rag.vectorstore import similarity_search
from config import CONFIG

logger = logging.getLogger(__name__)

BACKEND_URL = CONFIG.get("backend_url", "http://localhost:5000")

async def get_hybrid_context(
    user_id: str,
    notebook_id: str,
    policy: str,
    mode: str,
    source_ids: List[str],
    query: str,
    token: Optional[str] = None
) -> str:
    """
    Retrieves context based on the validated plan.
    """
    logger.info(f"🚀 Retrieval: policy={policy}, mode={mode}, sources={len(source_ids)}")
    
    if mode == "NONE":
        return ""

    context_parts = []

    # 1. Handle FULL_DOCUMENT (High fidelity recap/summary)
    if mode == "FULL_DOCUMENT" or mode == "MULTI_DOC_SYNTHESIS":
        if source_ids and token:
            full_texts = await fetch_full_sources(notebook_id, source_ids, token)
            for st in full_texts:
                context_parts.append(f"--- SOURCE: {st['name']} (Type: {st['type']}) ---\n{st['content']}")
        
        # If we got full text, we might skip chunk search for summaries, 
        # but for synthesis we might want both.
        if mode == "FULL_DOCUMENT" and context_parts:
            return "\n\n".join(context_parts)

    # 2. Handle CHUNK_SEARCH (Standard RAG)
    # We always do this for specific queries or if full text failed/wasn't requested.
    search_policy_notebook = notebook_id if policy != "AUTO_EXPAND" else None
    search_source_ids = source_ids if policy == "STRICT_SELECTED" or policy == "PREFER_SELECTED" else None
    
    docs = similarity_search(
        query=query,
        user_id=user_id,
        notebook_id=search_policy_notebook,
        source_ids=search_source_ids,
        k=15 if mode == "MULTI_DOC_SYNTHESIS" else 8
    )
    
    if docs:
        if context_parts: context_parts.append("\n--- RELEVANT EXCERPTS ---")
        for doc in docs:
            source_name = doc.metadata.get("source", "Unknown")
            context_parts.append(f"[{source_name}]: {doc.page_content}")

    return "\n\n".join(context_parts)

async def fetch_full_sources(
    notebook_id: str, 
    source_ids: List[str], 
    token: str
) -> List[Dict[str, Any]]:
    """
    Call the Node.js backend to get the full raw text of specific sources.
    """
    results = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for sid in source_ids:
            try:
                # Use the existing backend endpoint
                url = f"{BACKEND_URL}/api/notebook/notebooks/{notebook_id}/sources/{sid}/content"
                headers = {"Authorization": f"Bearer {token}"}
                
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json().get("data", {})
                    if data.get("content"):
                        results.append({
                            "id": sid,
                            "name": data.get("name", "Unknown"),
                            "type": data.get("type", "unknown"),
                            "content": data.get("content")
                        })
            except Exception as e:
                logger.error(f"Error fetching source {sid}: {e}")
                
    return results

async def fetch_source_metadata(
    notebook_id: str,
    source_ids: List[str],
    token: str
) -> List[Dict[str, Any]]:
    """
    Fetch names and types for the provided source IDs.
    """
    if not notebook_id or not token:
        return []

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            url = f"{BACKEND_URL}/api/notebook/notebooks/{notebook_id}"
            headers = {"Authorization": f"Bearer {token}"}
            
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                notebook = response.json().get("data", {})
                sources = notebook.get("sources", [])
                
                # Filter to requested IDs
                meta_list = []
                for s in sources:
                    sid = str(s.get("_id") or s.get("id"))
                    if sid in [str(requested_id) for requested_id in source_ids]:
                        meta_list.append({
                            "id": sid,
                            "name": s.get("name", "Unknown"),
                            "type": s.get("type", "unknown")
                        })
                return meta_list
    except Exception as e:
        logger.error(f"Error fetching source metadata: {e}")
        
    return []
