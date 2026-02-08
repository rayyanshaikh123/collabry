"""LiveKit Agents (Playground-compatible) Voice Tutor.

This runs a LiveKit Agents worker that can be dispatched from the LiveKit Agents Playground.
It uses:
- VAD: Silero (livekit-plugins-silero)
- STT: Groq Whisper (livekit-plugins-groq)
- LLM: OpenAI-compatible endpoint (Ollama today, OpenAI later) via livekit-plugins-openai
- TTS: ElevenLabs (livekit-plugins-elevenlabs)
- Teaching Engine: ClassroomIntelligenceEngine for deterministic pedagogy
- RAG: Context retrieval from provided source material

Run:
  python livekit_agents_voice_tutor.py

Then in LiveKit Agents Playground:
- Set Agent name to match LIVEKIT_AGENT_NAME (default: collabry-tutor)
- Dispatch the agent into your room with metadata containing source_content
"""

import json
import logging
import os
from pathlib import Path
import asyncio

from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import AgentServer
from livekit.agents.worker import ServerOptions

from livekit.plugins import elevenlabs, groq, openai, silero

# Import teaching engine components
from core.teaching_engine import ClassroomIntelligenceEngine
from core.teaching_models import TeachingAction, VoiceTutorSession
from core.voice_events import StudentSpokeEvent, SilenceEvent, ParticipantJoinEvent
from core.rag_retriever import RAGRetriever
from config import CONFIG
from langchain_core.documents import Document


def _env(name: str, default: str = "") -> str:
    value = os.getenv(name)
    return value.strip() if isinstance(value, str) and value.strip() else default


def _env_any(names: list[str], default: str = "") -> str:
    for name in names:
        value = _env(name)
        if value:
            return value
    return default


def _normalize_livekit_ws_url(url: str) -> str:
    u = (url or "").strip()
    if not u:
        return ""
    if u.startswith("https://"):
        return "wss://" + u[len("https://") :]
    if u.startswith("http://"):
        return "ws://" + u[len("http://") :]
    return u


class TutorAgent(Agent):
    def __init__(self, chat_ctx: ChatContext) -> None:
        super().__init__(
            chat_ctx=chat_ctx,
            instructions=(
                "You are a friendly, patient voice tutor. "
                "Keep responses concise, conversational, and easy to follow. "
                "Ask short questions to check understanding when appropriate."
            ),
        )


async def entrypoint(ctx: agents.JobContext) -> None:
    log = logging.getLogger("livekit_agents_voice_tutor")

    # Metadata may be provided by the dispatcher/playground.
    user_name = "Student"
    notebook_id = "general"

    try:
        if ctx.job and ctx.job.metadata:
            meta = json.loads(ctx.job.metadata)
            user_name = meta.get("user_name") or user_name
            notebook_id = meta.get("notebook_id") or notebook_id
    except Exception:
        pass

    stt = groq.STT(
        api_key=_env("GROQ_API_KEY"),
        model=_env_any(["GROQ_STT_MODEL", "GROQ_MODEL"], "whisper-large-v3"),
    )

    # OpenAI-compatible LLM (Ollama today via OPENAI_BASE_URL)
    llm = openai.LLM(
        api_key=_env("OPENAI_API_KEY", "ollama"),
        base_url=_env("OPENAI_BASE_URL", "http://localhost:11434/v1"),
        model=_env("OPENAI_MODEL", "llama3.2"),
        temperature=float(_env("OPENAI_TEMPERATURE", "0.7")),
    )

    tts = elevenlabs.TTS(
        api_key=_env("ELEVENLABS_API_KEY"),
        voice_id=_env("ELEVENLABS_VOICE_ID", elevenlabs.DEFAULT_VOICE_ID),
        model=_env("ELEVENLABS_MODEL", "eleven_turbo_v2_5"),
    )

    session_kwargs = {
        # Avoid livekit-plugins-turn-detector (requires model_q8.onnx download)
        # and use VAD endpointing instead.
        "turn_detection": "vad",
        "stt": stt,
        "llm": llm,
        "tts": tts,
        "vad": silero.VAD.load(),
    }

    session = AgentSession(**session_kwargs)

    initial_ctx = ChatContext()
    initial_ctx.add_message(
        role="assistant",
        content=(
            f"Hi {user_name}! I’m your Collabry tutor. "
            f"We’ll work on {notebook_id}. Tell me what you want to learn today."
        ),
    )

    await session.start(room=ctx.room, agent=TutorAgent(chat_ctx=initial_ctx))

    # Produce an initial spoken greeting.
    await session.generate_reply(
        instructions=(
            f"Greet {user_name} warmly in 1-2 sentences and ask what they want to focus on."
        )
    )


if __name__ == "__main__":

    logging.basicConfig(
        level=getattr(logging, _env("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    log = logging.getLogger("livekit_agents_voice_tutor")

    dotenv_path = Path(__file__).with_name(".env")
    load_dotenv(dotenv_path)

    agent_name = _env("LIVEKIT_AGENT_NAME", "collabry-tutor")
    ws_url = _normalize_livekit_ws_url(_env_any(["LIVEKIT_URL", "LIVEKIT_WS_URL"]))
    api_key = _env("LIVEKIT_API_KEY")
    api_secret = _env("LIVEKIT_API_SECRET")

    if not ws_url:
        raise SystemExit("Missing LIVEKIT_URL (or LIVEKIT_WS_URL) in ai-engine/.env")
    if not api_key or not api_secret:
        raise SystemExit("Missing LIVEKIT_API_KEY/LIVEKIT_API_SECRET in ai-engine/.env")

    log.info("Starting LiveKit Agents worker")
    log.info("agent_name=%s", agent_name)
    log.info("ws_url=%s", ws_url)

    options = ServerOptions(
        entrypoint_fnc=entrypoint,
        agent_name=agent_name,
        ws_url=ws_url,
        api_key=api_key,
        api_secret=api_secret,
        port=int(_env("LIVEKIT_AGENT_PORT", "0")),
    )

    server = AgentServer.from_server_options(options)
    asyncio.run(server.run())
