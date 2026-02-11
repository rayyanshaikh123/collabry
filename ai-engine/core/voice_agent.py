"""
Voice Tutor Agent - Audio I/O Handler
Manages LiveKit connection, STT/TTS pipeline
Does NOT make teaching decisions - only handles audio
"""
from __future__ import annotations
import asyncio
import logging
import io
import wave
from datetime import datetime
from typing import Optional, Callable, TYPE_CHECKING, Any
from collections import deque

try:
    from livekit import rtc
except ImportError:
    # For development without LiveKit installed
    rtc = None

if TYPE_CHECKING:
    from livekit import rtc as rtc_types
else:
    rtc_types = Any

from openai import AsyncOpenAI
import numpy as np
import edge_tts
import tempfile
import os

try:
    from silero_vad import load_silero_vad, VADIterator
    SILERO_AVAILABLE = True
except Exception:
    SILERO_AVAILABLE = False

# Optional imports for voice services
try:
    from elevenlabs import AsyncElevenLabs
    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("ElevenLabs not available, will use Edge-TTS as fallback")

try:
    from groq import AsyncGroq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Groq not available, will use OpenAI Whisper as fallback")

from .voice_events import (
    ClassroomEvent, StudentSpokeEvent, SilenceEvent,
    InterruptionEvent, ParticipantJoinEvent, ParticipantLeaveEvent,
    VoiceAction
)

logger = logging.getLogger(__name__)


class SimpleVAD:
    """Simple Voice Activity Detection using energy threshold"""
    
    def __init__(self, threshold: float = 0.02, min_speech_duration_ms: int = 250):
        self.threshold = threshold
        self.min_speech_duration_ms = min_speech_duration_ms
        self.speech_frames = []
        self.is_speech_active = False
    
    def detect(self, audio_frame: np.ndarray) -> bool:
        """
        Detect if frame contains speech based on energy
        
        Args:
            audio_frame: numpy array of audio samples
            
        Returns:
            True if speech detected, False otherwise
        """
        # Calculate RMS energy
        energy = np.sqrt(np.mean(audio_frame ** 2))
        return energy > self.threshold


class SileroVAD:
    """Streaming Silero VAD wrapper.

    Uses `silero-vad` package (local, no network download).
    """

    def __init__(
        self,
        threshold: float = 0.5,
        sampling_rate: int = 16000,
        min_silence_duration_ms: int = 200,
        speech_pad_ms: int = 30,
    ):
        if not SILERO_AVAILABLE:
            raise RuntimeError("silero-vad not available")

        self.sampling_rate = sampling_rate
        self._model = load_silero_vad()
        self._iterator = VADIterator(
            self._model,
            threshold=threshold,
            sampling_rate=sampling_rate,
            min_silence_duration_ms=min_silence_duration_ms,
            speech_pad_ms=speech_pad_ms,
        )
        self._in_speech = False

    def detect(self, audio_frame_f32: np.ndarray) -> bool:
        """Return True if currently in speech segment."""
        # VADIterator expects a 1D float tensor-like array at 16kHz
        if audio_frame_f32.size == 0:
            return False
        try:
            speech_event = self._iterator(audio_frame_f32)
        except Exception as e:
            # Silero can raise "Input audio chunk is too short" for very small frames.
            # Treat that as "no speech" instead of crashing the stream.
            msg = str(e)
            if "Input audio chunk is too short" in msg:
                logger.debug("Silero VAD: chunk too short, treating as silence")
                return False
            logger.warning(f"Silero VAD error, falling back to silence: {e}")
            return False
        if isinstance(speech_event, dict):
            if "start" in speech_event:
                self._in_speech = True
            if "end" in speech_event:
                self._in_speech = False
        return self._in_speech


class AudioBuffer:
    """Buffered audio for utterance collection"""
    
    def __init__(self, sample_rate: int = 16000, num_channels: int = 1):
        self.sample_rate = sample_rate
        self.num_channels = num_channels
        self.frames = []
        self.start_time = None
    
    def append(self, frame: bytes, *, sample_rate: Optional[int] = None, num_channels: Optional[int] = None):
        """Add audio frame to buffer"""
        if not self.start_time:
            self.start_time = datetime.now()
        if sample_rate:
            self.sample_rate = sample_rate
        if num_channels:
            self.num_channels = num_channels
        self.frames.append(frame)
    
    def has_speech(self) -> bool:
        """Check if buffer contains audio"""
        return len(self.frames) > 0
    
    def get_audio(self) -> bytes:
        """Get buffered audio as bytes"""
        return b''.join(self.frames)
    
    def get_duration_ms(self) -> int:
        """Get duration of buffered audio in milliseconds"""
        if not self.frames:
            return 0
        # Approximate using configured sample rate and channels, 16-bit PCM
        bytes_per_ms = int((self.sample_rate * self.num_channels * 2) / 1000)
        if bytes_per_ms <= 0:
            return 0
        total_bytes = sum(len(f) for f in self.frames)
        return total_bytes // bytes_per_ms
    
    def clear(self):
        """Clear buffer"""
        self.frames = []
        self.start_time = None


class VoiceTutorAgent:
    """
    Manages LiveKit connection and audio processing
    Produces events for Teaching Engine
    Executes actions from Teaching Engine
    """
    
    def __init__(
        self,
        room_name: str,
        session_id: str,
        openai_client: Optional[AsyncOpenAI] = None,
        tts_provider: str = "elevenlabs",
        stt_provider: str = "groq"
    ):
        self.room_name = room_name
        self.session_id = session_id
        self.room: Optional[rtc_types.Room] = None
        
        # Event and action queues
        self.event_queue = asyncio.Queue()
        self.action_queue = asyncio.Queue()
        
        # Audio processors
        # Default to a simple energy-based VAD for robustness; Silero can be enabled via VAD_PROVIDER=silero.
        self.vad_provider = os.getenv("VAD_PROVIDER", "simple").lower()
        if self.vad_provider == "silero" and SILERO_AVAILABLE:
            try:
                self.vad = SileroVAD(
                    threshold=float(os.getenv("SILERO_VAD_THRESHOLD", "0.5")),
                    sampling_rate=16000,
                )
                logger.info("VAD: Using Silero")
            except Exception as e:
                logger.warning(f"VAD: Silero init failed, falling back to SimpleVAD: {e}")
                self.vad = SimpleVAD()
        else:
            self.vad = SimpleVAD()
            logger.info("VAD: Using SimpleVAD")
        self.openai_client = openai_client or AsyncOpenAI()
        
        # Voice service providers
        self.tts_provider = os.getenv('TTS_PROVIDER', tts_provider)
        self.stt_provider = os.getenv('STT_PROVIDER', stt_provider)
        
        # Auto-fallback if provider not available
        if self.tts_provider == 'elevenlabs' and not ELEVENLABS_AVAILABLE:
            logger.warning("ElevenLabs not available, falling back to Edge-TTS")
            self.tts_provider = 'edge-tts'
        
        if self.stt_provider == 'groq' and not GROQ_AVAILABLE:
            logger.warning("Groq not available, falling back to OpenAI Whisper")
            self.stt_provider = 'openai'
        
        # Initialize TTS client
        if self.tts_provider == 'elevenlabs' and ELEVENLABS_AVAILABLE:
            self.elevenlabs_client = AsyncElevenLabs(api_key=os.getenv('ELEVENLABS_API_KEY'))
            self.elevenlabs_voice_id = os.getenv('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM')
            self.elevenlabs_model = os.getenv('ELEVENLABS_MODEL', 'eleven_multilingual_v2')
            logger.info(f"TTS: Using ElevenLabs with voice {self.elevenlabs_voice_id}")
        elif self.tts_provider == 'openai':
            logger.info("TTS: Using OpenAI")
        else:  # edge-tts
            logger.info("TTS: Using Edge-TTS (free)")
        
        # Initialize STT client
        if self.stt_provider == 'groq' and GROQ_AVAILABLE:
            self.groq_client = AsyncGroq(api_key=os.getenv('GROQ_API_KEY'))
            self.groq_model = os.getenv('GROQ_MODEL', 'whisper-large-v3')
            logger.info(f"STT: Using Groq with model {self.groq_model}")
        else:  # openai
            logger.info("STT: Using OpenAI Whisper")
        
        # State
        self.is_speaking = False
        self.last_speech_end: Optional[datetime] = None
        self.speech_start_time: Optional[datetime] = None
        self.connected = False
        
        # Audio buffer
        # Store 16kHz mono PCM for STT
        self.audio_buffer = AudioBuffer(sample_rate=16000, num_channels=1)
        self.silence_start: Optional[datetime] = None

        # Utterance segmentation
        self._utterance_silence_ms = 0
        self._utterance_min_speech_ms = int(os.getenv("UTTERANCE_MIN_SPEECH_MS", "250"))
        self._utterance_end_silence_ms = int(os.getenv("UTTERANCE_END_SILENCE_MS", "600"))

        # Background tasks
        self.tasks: list[asyncio.Task] = []

        logger.info(f"VoiceTutorAgent initialized for room: {self.room_name}")

    def _elevenlabs_error_allows_model_retry(self, err: Exception) -> bool:
        """Return True if we should retry with a different ElevenLabs model.

        ElevenLabs returns a 401 for some free-tier model deprecations.
        """
        msg = str(err)
        if "model_deprecated_free_tier" in msg:
            return True
        if "Model is not available on the free tier" in msg:
            return True
        # Some SDK exceptions expose structured body
        body = getattr(err, "body", None)
        if isinstance(body, dict):
            detail = body.get("detail") or body
            if isinstance(detail, dict) and detail.get("status") == "model_deprecated_free_tier":
                return True
        return False

    async def _elevenlabs_tts_pcm(self, text: str) -> tuple[bytes, int]:
        """Generate 16-bit PCM audio from ElevenLabs."""
        output_format = os.getenv('ELEVENLABS_OUTPUT_FORMAT', 'pcm_24000')

        # Try primary model first, then fallbacks.
        # Keep this list short and predictable.
        fallback_env = os.getenv("ELEVENLABS_FALLBACK_MODEL", "").strip() or None
        model_candidates = [
            self.elevenlabs_model,
            fallback_env,
            "eleven_turbo_v2_5",
            "eleven_multilingual_v2",
        ]
        # Deduplicate while preserving order
        seen = set()
        models = []
        for m in model_candidates:
            if not m:
                continue
            if m in seen:
                continue
            seen.add(m)
            models.append(m)

        last_err: Optional[Exception] = None
        for idx, model_id in enumerate(models):
            try:
                audio_chunks = []
                async for chunk in self.elevenlabs_client.text_to_speech.convert(
                    self.elevenlabs_voice_id,
                    text=text,
                    model_id=model_id,
                    output_format=output_format,
                ):
                    audio_chunks.append(chunk)
                pcm_audio = b''.join(audio_chunks)

                # Infer sample rate from output_format like 'pcm_24000'
                sample_rate = 24000
                try:
                    if isinstance(output_format, str) and output_format.startswith('pcm_'):
                        sample_rate = int(output_format.split('_', 1)[1])
                except Exception:
                    sample_rate = 24000

                if idx > 0:
                    logger.info(f"ElevenLabs TTS recovered using model: {model_id}")
                return pcm_audio, sample_rate
            except Exception as e:
                last_err = e
                if self._elevenlabs_error_allows_model_retry(e) and idx < (len(models) - 1):
                    logger.warning(f"ElevenLabs model rejected ({model_id}); retrying with fallback model")
                    continue
                raise

        # Should never get here
        raise RuntimeError(f"ElevenLabs TTS failed: {last_err}")

    def _to_mono_16k_pcm(self, audio_bytes: bytes, *, sample_rate: int, num_channels: int) -> tuple[bytes, np.ndarray]:
        """Convert incoming PCM16 bytes to 16kHz mono.

        Returns:
            (pcm16_bytes_16k_mono, float32_mono_16k)
        """
        if not audio_bytes:
            return b"", np.array([], dtype=np.float32)

        pcm = np.frombuffer(audio_bytes, dtype=np.int16)
        if num_channels > 1:
            pcm = pcm.reshape(-1, num_channels)
            mono_i16 = pcm[:, 0]
        else:
            mono_i16 = pcm

        mono_f32 = (mono_i16.astype(np.float32) / 32768.0).clip(-1.0, 1.0)

        if sample_rate != 16000 and mono_f32.size > 1:
            # Linear resample to 16kHz
            duration = mono_f32.size / float(sample_rate)
            target_len = max(1, int(duration * 16000))
            x_old = np.linspace(0.0, duration, num=mono_f32.size, endpoint=False)
            x_new = np.linspace(0.0, duration, num=target_len, endpoint=False)
            mono_f32 = np.interp(x_new, x_old, mono_f32).astype(np.float32)
            mono_i16 = (mono_f32 * 32767.0).astype(np.int16)

        return mono_i16.tobytes(), mono_f32
    
    async def connect(self, token: str, ws_url: str) -> bool:
        """Connect to LiveKit room"""
        if not rtc:
            logger.error("LiveKit SDK not installed")
            return False
        
        try:
            self.room = rtc.Room()
            
            # Set up event handlers
            self.room.on("participant_connected", self._on_participant_connected)
            self.room.on("participant_disconnected", self._on_participant_disconnected)
            self.room.on("track_subscribed", self._on_track_subscribed)
            
            # Connect to room (with timeout)
            ws_url = (ws_url or "").strip().rstrip("/")
            if ws_url.endswith("/rtc"):
                # SDK will append its own /rtc path
                ws_url = ws_url[: -len("/rtc")]

            connect_timeout_s = float(os.getenv("LIVEKIT_CONNECT_TIMEOUT_S", "20"))
            logger.info(f"Connecting to LiveKit (timeout={connect_timeout_s}s) url={ws_url}")
            await asyncio.wait_for(
                self.room.connect(ws_url, token),
                timeout=connect_timeout_s,
            )
            self.connected = True
            
            logger.info(f"Connected to LiveKit room: {self.room_name}")
            
            # Start action processing loop
            self.tasks.append(asyncio.create_task(self._action_loop()))
            
            return True

        except asyncio.TimeoutError:
            logger.error(
                "LiveKit connect timed out. Check LIVEKIT_WS_URL, firewall/proxy, and that LiveKit cloud is reachable."
            )
            return False

        except Exception as e:
            logger.error(f"Failed to connect to LiveKit room: {type(e).__name__}: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from LiveKit room"""
        self.connected = False
        
        # Cancel background tasks
        for task in self.tasks:
            task.cancel()
        
        if self.room:
            await self.room.disconnect()
            logger.info("Disconnected from LiveKit room")
    
    def _on_participant_connected(self, participant: rtc_types.RemoteParticipant):
        """Handle participant joining"""
        logger.info(f"Participant connected: {participant.identity}")
        
        event = ParticipantJoinEvent(
            participant_identity=participant.identity,
            participant_name=participant.name or "Student"
        )
        
        # Queue event
        asyncio.create_task(self.event_queue.put(event))
    
    def _on_participant_disconnected(self, participant: rtc_types.RemoteParticipant):
        """Handle participant leaving"""
        logger.info(f"Participant disconnected: {participant.identity}")
        
        # Calculate session duration
        # TODO: Track actual join time
        duration_ms = 0
        
        event = ParticipantLeaveEvent(
            participant_identity=participant.identity,
            session_duration_ms=duration_ms
        )
        
        asyncio.create_task(self.event_queue.put(event))
    
    def _on_track_subscribed(
        self,
        track: rtc_types.Track,
        publication: rtc_types.TrackPublication,
        participant: rtc_types.RemoteParticipant
    ):
        """Handle incoming audio track"""
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            logger.info(f"Subscribed to audio track from {participant.identity}")
            # Start processing audio stream
            asyncio.create_task(self._process_audio_stream(track))
    
    async def _process_audio_stream(self, track: rtc_types.AudioTrack):
        """
        Process incoming audio: VAD → Buffer → STT → Event
        
        This is a simplified implementation for MVP
        Production would use proper audio resampling and chunk handling
        """
        logger.info("Starting audio stream processing")
        
        audio_stream = rtc.AudioStream(track)
        
        try:
            async for event in audio_stream:
                # Newer LiveKit SDK yields AudioFrameEvent objects with a .frame attribute.
                # Older versions may yield AudioFrame directly.
                if hasattr(event, "frame"):
                    frame = event.frame
                else:
                    frame = event

                if not hasattr(frame, "data"):
                    logger.warning(f"Audio frame missing 'data' attribute (type={type(frame).__name__}); skipping")
                    continue

                audio_data = frame.data

                frame_sr = getattr(frame, "sample_rate", 16000)
                frame_ch = getattr(frame, "num_channels", 1)
                samples_per_channel = getattr(frame, "samples_per_channel", 0)

                # Convert to 16k mono for VAD/STT
                pcm16_16k, f32_16k = self._to_mono_16k_pcm(audio_data, sample_rate=frame_sr, num_channels=frame_ch)

                # Frame duration estimate
                if samples_per_channel and frame_sr:
                    frame_ms = int((samples_per_channel / float(frame_sr)) * 1000)
                else:
                    # Fallback: derive from bytes assuming PCM16 mono at source SR
                    frame_ms = int((len(pcm16_16k) / 2) / 16.0) if pcm16_16k else 0

                is_speech = bool(pcm16_16k) and bool(self.vad.detect(f32_16k))
                
                if is_speech:
                    # Speech detected
                    self.audio_buffer.append(pcm16_16k, sample_rate=16000, num_channels=1)
                    self.silence_start = None
                    self._utterance_silence_ms = 0
                    
                    # Check if tutor is speaking (interruption)
                    if self.is_speaking:
                        if self.speech_start_time:
                            duration_ms = int(
                                (datetime.now() - self.speech_start_time).total_seconds() * 1000
                            )
                        else:
                            duration_ms = 0
                        
                        event = InterruptionEvent(
                            tutor_speech_duration_ms=duration_ms
                        )
                        await self.event_queue.put(event)
                        await self.stop_speaking()
                
                else:
                    # Silence detected
                    if self.audio_buffer.has_speech() and frame_ms > 0:
                        self._utterance_silence_ms += frame_ms

                        # End of utterance when we've seen enough trailing silence
                        if self._utterance_silence_ms >= self._utterance_end_silence_ms:
                            audio_bytes = self.audio_buffer.get_audio()
                            duration_ms = self.audio_buffer.get_duration_ms()

                            if duration_ms >= self._utterance_min_speech_ms:
                                transcript = await self._transcribe_audio(audio_bytes)
                                if transcript:
                                    event = StudentSpokeEvent(
                                        transcript=transcript,
                                        duration_ms=duration_ms,
                                        confidence=0.9,
                                        interrupted_tutor=self.is_speaking
                                    )
                                    await self.event_queue.put(event)
                                    logger.info(f"Transcribed: {transcript}")

                            self.audio_buffer.clear()
                            self._utterance_silence_ms = 0
                    
                    # Track silence duration
                    if self.silence_start is None:
                        self.silence_start = datetime.now()
                    else:
                        silence_duration = (datetime.now() - self.silence_start).total_seconds()
                        
                        # Emit silence event every 3 seconds
                        if silence_duration >= 3.0:
                            event = SilenceEvent(
                                duration_ms=int(silence_duration * 1000)
                            )
                            await self.event_queue.put(event)
                            self.silence_start = datetime.now()  # Reset
        
        except Exception as e:
            logger.error(f"Error processing audio stream: {e}")
    
    async def _transcribe_audio(self, audio_bytes: bytes) -> Optional[str]:
        """
        Transcribe audio using configured STT provider (Groq or OpenAI)
        
        Args:
            audio_bytes: Raw audio data
            
        Returns:
            Transcribed text or None
        """
        try:
            # Create in-memory WAV file
            audio_file = io.BytesIO()
            with wave.open(audio_file, 'wb') as wav:
                wav.setnchannels(1)  # Mono
                wav.setsampwidth(2)  # 16-bit
                wav.setframerate(16000)  # 16kHz
                wav.writeframes(audio_bytes)
            
            audio_file.seek(0)
            audio_file.name = "audio.wav"
            
            # Use configured STT provider
            if self.stt_provider == 'groq':
                # Groq Whisper API
                response = await self.groq_client.audio.transcriptions.create(
                    model=self.groq_model,
                    file=("audio.wav", audio_file.read()),
                    language="en",
                    response_format="text"
                )
                return response.strip() if isinstance(response, str) else response.text.strip()
            else:
                # OpenAI Whisper API (fallback)
                response = await self.openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="en"
                )
                return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error transcribing audio with {self.stt_provider}: {e}")
            return None
    
    async def speak(self, text: str, emotion: str = "neutral"):
        """
        Generate speech from text and publish to LiveKit using configured TTS provider
        
        Args:
            text: Text to speak
            emotion: Emotional tone (used by some providers)
        """
        self.is_speaking = True
        self.speech_start_time = datetime.now()

        logger.info(f"Speaking with {self.tts_provider}: {text[:50]}...")

        try:
            pcm_audio: Optional[bytes] = None
            sample_rate: int = 24000
            num_channels: int = 1

            if self.tts_provider == 'elevenlabs':
                pcm_audio, sample_rate = await self._elevenlabs_tts_pcm(text)

            elif self.tts_provider == 'openai':
                # OpenAI TTS: request WAV so we can parse PCM without external decoders.
                response = await self.openai_client.audio.speech.create(
                    model="tts-1",
                    voice="alloy",
                    input=text,
                    response_format="wav",
                )
                wav_bytes = await response.aread()
                with wave.open(io.BytesIO(wav_bytes), 'rb') as wav:
                    sample_rate = wav.getframerate()
                    num_channels = wav.getnchannels()
                    sampwidth = wav.getsampwidth()
                    if sampwidth != 2:
                        raise ValueError(f"Unsupported WAV sample width: {sampwidth}")
                    raw = wav.readframes(wav.getnframes())
                if num_channels == 1:
                    pcm_audio = raw
                else:
                    # Down-mix to mono by taking the left channel (simple, fast)
                    frame_size = num_channels * 2  # 16-bit PCM
                    pcm_audio = b''.join(raw[i:i + 2] for i in range(0, len(raw), frame_size))
                    num_channels = 1

            else:
                # Edge-TTS produces MP3; LiveKit publishing requires PCM.
                raise RuntimeError(
                    "Edge-TTS output is MP3; set TTS_PROVIDER=elevenlabs or openai for LiveKit"
                )

            if self.room and pcm_audio:
                audio_source = rtc.AudioSource(sample_rate=sample_rate, num_channels=num_channels)
                track = rtc.LocalAudioTrack.create_audio_track("tutor_voice", audio_source)
                await self.room.local_participant.publish_track(track)

                bytes_per_sample = 2  # 16-bit PCM
                frame_duration_s = 0.02  # 20ms
                frame_samples = int(sample_rate * frame_duration_s)
                frame_bytes = frame_samples * num_channels * bytes_per_sample

                for offset in range(0, len(pcm_audio), frame_bytes):
                    if not self.is_speaking or self.stop_speech_flag:
                        logger.info("Speech interrupted, stopping playback")
                        break
                    chunk = pcm_audio[offset:offset + frame_bytes]
                    if len(chunk) < frame_bytes:
                        chunk += b'\x00' * (frame_bytes - len(chunk))
                    try:
                        await audio_source.capture_frame(
                            rtc.AudioFrame(
                                data=chunk,
                                sample_rate=sample_rate,
                                num_channels=num_channels,
                                samples_per_channel=frame_samples,
                            )
                        )
                    except Exception as frame_error:
                        logger.warning(f"Frame capture error: {frame_error}")
                        continue
                    await asyncio.sleep(frame_duration_s)

                await self.room.local_participant.unpublish_track(track.sid)

        except Exception as e:
            logger.error(f"Error in TTS ({self.tts_provider}): {e}")
        finally:
            self.is_speaking = False
            self.last_speech_end = datetime.now()

    async def _action_loop(self):
        """Process actions from Teaching Engine"""
        logger.info("Starting action processing loop")
        
        while self.connected:
            try:
                # Wait for action with timeout
                action = await asyncio.wait_for(
                    self.action_queue.get(),
                    timeout=0.1
                )
                
                if action.type == "SPEAK":
                    await self.speak(
                        text=action.data["text"],
                        emotion=action.data.get("emotion", "neutral")
                    )
                
                elif action.type == "END_SESSION":
                    logger.info("Ending session")
                    await self.disconnect()
                    break
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error in action loop: {e}")
        
        logger.info("Action loop ended")


# Stub class for when LiveKit is not available (development)
class VoiceTutorAgentStub:
    """Stub for development without LiveKit"""
    
    def __init__(self, room_name: str, session_id: str, openai_client=None):
        self.room_name = room_name
        self.session_id = session_id
        self.event_queue = asyncio.Queue()
        self.action_queue = asyncio.Queue()
        self.connected = False
        logger.warning("Using VoiceTutorAgentStub (LiveKit not available)")
    
    async def connect(self, token: str, ws_url: str) -> bool:
        logger.info("Stub: Connected to fake room")
        self.connected = True
        return True
    
    async def disconnect(self):
        self.connected = False
        logger.info("Stub: Disconnected")
    
    async def speak(self, text: str, emotion: str = "neutral"):
        logger.info(f"Stub: Speaking: {text}")
        await asyncio.sleep(2)  # Simulate speaking time
