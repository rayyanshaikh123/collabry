"""Dispatch a LiveKit Agent into a room (for Playground).

Use this when the Playground is connected to a room but says
"Waiting for agent audio track...". The worker must be running, and you must
create an explicit dispatch for the room + agent name.

Examples:
  # Basic dispatch
  python livekit_dispatch_agent.py --room playground-xxxx-yyyy
  
  # With source material for RAG
  python livekit_dispatch_agent.py --room myroom --source "Photosynthesis is the process..." --user-id user123
  
  # Full metadata
  python livekit_dispatch_agent.py --room myroom --metadata '{"user_name":"Rayyan","source_content":"..."}'
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv

from livekit.api import CreateAgentDispatchRequest
from livekit.api.agent_dispatch_service import AgentDispatchService


def _env(name: str, default: str = "") -> str:
    value = os.getenv(name)
    return value.strip() if isinstance(value, str) and value.strip() else default


def _env_any(names: list[str], default: str = "") -> str:
    for name in names:
        v = _env(name)
        if v:
            return v
    return default


def _normalize_url(url: str) -> str:
    u = (url or "").strip()
    if u.startswith("wss://"):
        return "https://" + u[len("wss://") :]
    if u.startswith("ws://"):
        return "http://" + u[len("ws://") :]
    return u


async def _run(room: str, agent_name: str, metadata: str) -> None:
    import aiohttp

    ws_url = _env_any(["LIVEKIT_URL", "LIVEKIT_WS_URL"])
    api_url = _normalize_url(ws_url)
    api_key = _env("LIVEKIT_API_KEY")
    api_secret = _env("LIVEKIT_API_SECRET")

    if not api_url:
        raise SystemExit("Missing LIVEKIT_URL (or LIVEKIT_WS_URL) in ai-engine/.env")
    if not api_key or not api_secret:
        raise SystemExit("Missing LIVEKIT_API_KEY/LIVEKIT_API_SECRET in ai-engine/.env")

    async with aiohttp.ClientSession() as session:
        svc = AgentDispatchService(session=session, url=api_url, api_key=api_key, api_secret=api_secret)
        req = CreateAgentDispatchRequest(agent_name=agent_name, room=room, metadata=metadata)
        dispatch = await svc.create_dispatch(req)
        # dispatch is a protobuf message; repr includes fields.
        print("dispatch_created", dispatch)


def main() -> None:
    dotenv_path = Path(__file__).with_name(".env")
    load_dotenv(dotenv_path)

    parser = argparse.ArgumentParser()
    parser.add_argument("--room", required=True, help="LiveKit room name (from Playground)")
    parser.add_argument(
        "--agent-name",
        default=_env("LIVEKIT_AGENT_NAME", "collabry-tutor"),
        help="Agent name registered by the worker (LIVEKIT_AGENT_NAME)",
    )
    parser.add_argument(
        "--metadata",
        default=None,
        help="JSON metadata string passed to the agent job (optional)",
    )
    
    # Convenience args for common metadata fields
    parser.add_argument("--user-id", help="User ID for session isolation")
    parser.add_argument("--user-name", help="User display name")
    parser.add_argument("--notebook-id", help="Notebook/course ID")
    parser.add_argument("--session-id", help="Session ID (auto-generated if not provided)")
    parser.add_argument("--source", help="Source content for RAG (learning material)")
    parser.add_argument("--source-file", help="Path to file containing source content")
    
    args = parser.parse_args()
print(f"Dispatching agent '{args.agent_name}' to room '{args.room}'")
    if metadata_dict:
        print(f"Metadata: {', '.join(f'{k}={v[:50] if isinstance(v, str) and len(v) > 50 else v}' for k, v in metadata_dict.items())}")
    
    asyncio.run(_run(room=args.room, agent_name=args.agent_name, metadata=metadata_str
    # Build metadata from args
    if args.metadata:
        # Use provided metadata
        try:
            metadata_dict = json.loads(args.metadata)
        except Exception as e:
            raise SystemExit(f"--metadata must be valid JSON: {e}")
    else:
        # Build from individual args
        metadata_dict = {}
        
        if args.user_id:
            metadata_dict["user_id"] = args.user_id
        if args.user_name:
            metadata_dict["user_name"] = args.user_name
        if args.notebook_id:
            metadata_dict["notebook_id"] = args.notebook_id
        if args.session_id:
            metadata_dict["session_id"] = args.session_id
        
        # Handle source content
        if args.source_file:
            try:
                with open(args.source_file, "r", encoding="utf-8") as f:
                    metadata_dict["source_content"] = f.read()
                print(f"✓ Loaded source from {args.source_file} ({len(metadata_dict['source_content'])} chars)")
            except Exception as e:
                raise SystemExit(f"Failed to read source file: {e}")
        elif args.source:
            metadata_dict["source_content"] = args.source
            print(f"✓ Using provided source content ({len(args.source)} chars)")
    
    metadata_str = json.dumps(metadata_dict)

    import asyncio

    asyncio.run(_run(room=args.room, agent_name=args.agent_name, metadata=args.metadata))


if __name__ == "__main__":
    main()
