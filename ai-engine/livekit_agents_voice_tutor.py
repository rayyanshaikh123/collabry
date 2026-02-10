"""LiveKit Agents (Playground-compatible) Voice Tutor with Teaching Engine.

This runs a LiveKit Agents worker that can be dispatched from the LiveKit Agents Playground.
Features:
- VAD: Silero for utterance detection
- STT: Groq Whisper for speech-to-text
- TTS: ElevenLabs for text-to-speech
- Teaching Engine: ClassroomIntelligenceEngine for pedagogical decisions
- RAG: Context retrieval from provided source material

Run:
  python livekit_agents_voice_tutor.py

Then dispatch from LiveKit Playground with metadata:
  {
    "user_id": "user123",
    "user_name": "Alex",
    "notebook_id": "calculus_101",
    "session_id": "session_abc",
    "source_content": "Your learning material here..."
  }
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
from livekit.plugins import elevenlabs, groq, silero

# Import teaching engine components
from core.teaching_engine import ClassroomIntelligenceEngine
from core.teaching_models import TeachingAction, VoiceTutorSession
from core.voice_events import StudentSpokeEvent, SilenceEvent
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


async def entrypoint(ctx: agents.JobContext) -> None:
    """
    Entrypoint for teaching-engine-driven voice tutor.
    Supports RAG-grounded responses from source material.
    """
    log = logging.getLogger("livekit_agents_voice_tutor")

    # Extract metadata from dispatch
    user_id = "playground_user"
    user_name = "Student"
    notebook_id = "general"
    session_id = f"playground_{ctx.room.name}"
    source_content = None

    try:
        if ctx.job and ctx.job.metadata:
            meta = json.loads(ctx.job.metadata)
            user_id = meta.get("user_id") or user_id
            user_name = meta.get("user_name") or user_name
            notebook_id = meta.get("notebook_id") or notebook_id
            session_id = meta.get("session_id") or session_id
            source_content = meta.get("source_content")
            
            if source_content:
                log.info(f"Received source content: {len(source_content)} chars")
    except Exception as e:
        log.warning(f"Failed to parse metadata: {e}")

    # Initialize RAG if source provided
    rag_retriever = None
    rag_source_id = None
    
    if source_content:
        try:
            log.info("Initializing RAG retriever...")
            rag_retriever = RAGRetriever(CONFIG, user_id=user_id)
            rag_source_id = f"playground_source:{session_id}"

            # Clear any existing session documents
            try:
                rag_retriever.delete_documents_by_metadata(
                    user_id=user_id,
                    source_id=rag_source_id,
                    session_id=session_id,
                    save_index=False,
                )
            except Exception:
                pass

            # Ingest source content
            rag_retriever.add_user_documents(
                documents=[
                    Document(
                        page_content=source_content,
                        metadata={
                            "source": "playground_source",
                            "source_id": rag_source_id,
                            "session_id": session_id,
                            "notebook_id": notebook_id,
                            "user_id": user_id,
                        },
                    )
                ],
                user_id=user_id,
                save_index=True,
            )
            log.info("✓ RAG ingestion complete")
        except Exception as e:
            log.error(f"RAG initialization failed: {e}", exc_info=True)
            rag_retriever = None

    # Initialize teaching engine
    session_data = VoiceTutorSession(
        session_id=session_id,
        user_id=user_id,
        notebook_id=notebook_id,
        room_name=ctx.room.name,
    )

    classroom_engine = ClassroomIntelligenceEngine(
        session_id=session_id,
        user_id=user_id,
        notebook_id=notebook_id,
        session_data=session_data,
        rag_retriever=rag_retriever,
        rag_source_id=rag_source_id,
    )

    await classroom_engine.initialize()
    log.info("✓ Teaching engine initialized")

    # Set up STT/TTS providers
    stt = groq.STT(
        api_key=_env("GROQ_API_KEY"),
        model=_env_any(["GROQ_STT_MODEL", "GROQ_MODEL"], "whisper-large-v3"),
    )

    tts = elevenlabs.TTS(
        api_key=_env("ELEVENLABS_API_KEY"),
        voice_id=_env("ELEVENLABS_VOICE_ID", elevenlabs.DEFAULT_VOICE_ID),
        model=_env("ELEVENLABS_MODEL", "eleven_turbo_v2_5"),
    )

    vad = silero.VAD.load()

    # Connect to room
    await ctx.connect()
    log.info(f"✓ Connected to room: {ctx.room.name}")

    # Create and publish audio track for TTS output
    audio_source = rtc.AudioSource(24000, 1)
    audio_track = rtc.LocalAudioTrack.create_audio_track("agent_voice", audio_source)
    audio_options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    await ctx.room.local_participant.publish_track(audio_track, audio_options)
    log.info("✓ Audio track published")

    # Track remote audio streams
    remote_audio_stream = None
    audio_buffer = bytearray()
    
    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        nonlocal remote_audio_stream
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            log.info(f"✓ Subscribed to audio from {participant.identity}")
            remote_audio_stream = rtc.AudioStream(track)
            asyncio.create_task(process_student_audio(remote_audio_stream))

    async def process_student_audio(stream: rtc.AudioStream):
        """Process incoming student audio with VAD + STT"""
        nonlocal silence_count
        log.info("Starting student audio processing")
        
        async for event in stream:
            frame = event.frame
            # VAD would go here - for simplicity, we're doing basic buffering
            # In production, integrate Silero VAD properly
            audio_buffer.extend(frame.data.tobytes())
            
            # Simple heuristic: if buffer reaches certain size, transcribe
            if len(audio_buffer) > 48000:  # ~1 second at 24kHz 16-bit
                try:
                    # Convert to audio format STT expects
                    # Note: This is simplified - real impl needs proper format conversion
                    speech = await stt.recognize(audio_data=bytes(audio_buffer))
                    if speech and speech.strip():
                        log.info(f"Student said: {speech}")
                        # Reset silence counter
                        silence_count = 0
                        
                        # Send to teaching engine
                        event = StudentSpokeEvent(text=speech)
                        teaching_action = await classroom_engine.handle_event(event)
                        
                        if teaching_action:
                            response_speech = await classroom_engine.generate_speech(teaching_action)
                            session_data.add_turn("student", speech)
                            session_data.add_turn("tutor", response_speech)
                            
                            log.info(f"Tutor responds: {response_speech[:100]}...")
                            async for audio_chunk in tts.synthesize(response_speech):
                                await audio_source.capture_frame(audio_chunk.frame)
                    
                    audio_buffer.clear()
                except Exception as e:
                    log.warning(f"STT error: {e}")
                    audio_buffer.clear()

    # Generate and speak initial greeting
    try:
        greeting_action = TeachingAction.EXPLAIN_CONCEPT
        greeting_speech = await classroom_engine.generate_speech(greeting_action)
        session_data.add_turn("tutor", greeting_speech)
        
        log.info(f"Speaking greeting: {greeting_speech[:100]}...")
        async for audio_chunk in tts.synthesize(greeting_speech):
            await audio_source.capture_frame(audio_chunk.frame)
        log.info("✓ Greeting spoken")
        
    except Exception as e:
        log.error(f"Failed to generate greeting: {e}", exc_info=True)

    # Main teaching loop - handle silence and phase transitions
    log.info("✓ Starting teaching event loop")
    silence_count = 0
    
    while classroom_engine.global_phase.value != "end":
        try:
            await asyncio.sleep(1)
            
            # Check for prolonged silence when waiting for student response
            if classroom_engine.loop_state and classroom_engine.loop_state.value == "wait":
                silence_count += 1
                
                if silence_count > 10:  # 10 seconds of silence
                    log.info("Detected prolonged silence")
                    event = SilenceEvent()
                    teaching_action = await classroom_engine.handle_event(event)
                    
                    if teaching_action:
                        speech = await classroom_engine.generate_speech(teaching_action)
                        session_data.add_turn("tutor", speech)
                        
                        log.info(f"Speaking prompt: {speech[:100]}...")
                        async for audio_chunk in tts.synthesize(speech):
                            await audio_source.capture_frame(audio_chunk.frame)
                    
                    silence_count = 0
                
        except asyncio.CancelledError:
            log.info("Teaching loop cancelled")
            break
        except Exception as e:
            log.error(f"Error in teaching loop: {e}", exc_info=True)
            await asyncio.sleep(1)

    log.info("Teaching session ended")


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

    log.info("Starting LiveKit Agents worker with Teaching Engine")
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
