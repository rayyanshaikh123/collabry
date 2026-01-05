"""Normalize legacy memory entries and reindex FAISS retrieval.

Usage: python scripts/normalize_memory.py

This script will:
 - Back up the existing memory file (if present).
 - Convert legacy entries into canonical entries of the form:
     {"timestamp": <float>, "user": "...", "assistant": "...", "meta": {...}}
 - Save the normalized memory back to the configured memory path.
 - If retrieval (sentence-transformers + faiss) is available, rebuild the index.
"""
import json
import time
from pathlib import Path
from typing import Any, Dict

from config import CONFIG


def load_memory(path: Path):
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []


def is_user_like(meta: Dict[str, Any]):
    src = meta.get("source") or meta.get("type") or ""
    return str(src).lower() in ("user", "user_message", "user")


def normalize_entry(e: Dict[str, Any]):
    # already canonical
    if isinstance(e, dict) and "user" in e and "assistant" in e:
        return e

    # legacy: {'text': ..., 'metadata': {...}} where metadata.source indicates user/assistant/tool
    if isinstance(e, dict) and "text" in e:
        text = e.get("text", "")
        meta = e.get("metadata") or e.get("meta") or {}
        ts = e.get("created_at") or time.time()

        # If text contains both USER: ... ASSISTANT: ... split it
        if isinstance(text, str) and "USER:" in text and "ASSISTANT:" in text:
            try:
                parts = text.split("ASSISTANT:")
                user_part = parts[0].replace("USER:", "").strip()
                assistant_part = parts[1].strip()
                return {"timestamp": ts, "user": user_part, "assistant": assistant_part, "meta": meta}
            except Exception:
                pass

        # If metadata indicates user, treat as user record
        if is_user_like(meta):
            return {"timestamp": ts, "user": text, "assistant": "", "meta": meta}

        # Otherwise treat as assistant/tool output
        return {"timestamp": ts, "user": "", "assistant": text, "meta": meta}

    # other legacy variant: may contain 'assistant' dict and 'user' key
    if isinstance(e, dict) and "user" in e and "assistant" in e:
        # normalize assistant to text if it's a dict
        assistant = e.get("assistant")
        if isinstance(assistant, dict):
            assistant_text = assistant.get("text") or json.dumps(assistant)
        else:
            assistant_text = assistant or ""
        ts = e.get("timestamp") or time.time()
        meta = e.get("meta") or {}
        return {"timestamp": ts, "user": e.get("user", ""), "assistant": assistant_text, "meta": meta}

    # fallback: string or unknown shape
    return {"timestamp": time.time(), "user": "", "assistant": str(e), "meta": {}}


def normalize_all(memory_path: Path):
    raw = load_memory(memory_path)
    normalized = []
    for item in raw:
        try:
            n = normalize_entry(item)
            normalized.append(n)
        except Exception:
            # on error, preserve a safe wrapper
            normalized.append({"timestamp": time.time(), "user": "", "assistant": json.dumps(item, ensure_ascii=False), "meta": {}})

    return normalized


def reindex_faiss(normalized, config):
    try:
        from core.memory_retrieval import RetrievalMemory
    except Exception:
        print("Retrieval memory (faiss/sentence-transformers) not available; skipping reindex.")
        return False

    try:
        rm = RetrievalMemory(config)
    except Exception as e:
        print(f"Failed to initialize RetrievalMemory: {e}; skipping reindex.")
        return False

    # Rebuild index from scratch
    try:
        # Reset index/meta by creating a new instance and replacing internals
        rm._init_empty()
    except Exception:
        pass

    count = 0
    for rec in normalized:
        text = f"USER: {rec.get('user', '')}\nASSISTANT: {rec.get('assistant', '')}"
        try:
            rm.add(text, source=rec.get("meta", {}).get("source", "conversation"), meta=rec.get("meta", {}))
            count += 1
        except Exception:
            pass

    try:
        rm.save()
    except Exception:
        pass

    print(f"Reindexed {count} entries into FAISS.")
    return True


def main():
    mem_path = Path(CONFIG.get("memory_path", "memory/COLLABRY_memory.json"))
    if not mem_path.exists():
        print(f"Memory file not found at {mem_path}. Nothing to normalize.")
        return

    backup = mem_path.with_suffix(mem_path.suffix + f".bak.{int(time.time())}")
    mem_path.replace(backup)
    print(f"Backed up memory to {backup}")

    # load from backup, normalize, write back
    normalized = normalize_all(backup)
    try:
        mem_path.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote normalized memory to {mem_path} ({len(normalized)} entries)")
    except Exception as e:
        print(f"Failed to write normalized memory: {e}")

    # Reindex retrieval memory if available
    reindex_faiss(normalized, CONFIG)


if __name__ == "__main__":
    main()
