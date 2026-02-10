"""
Event Types for Voice Tutor Classroom System
Structured events from real-time audio pipeline to teaching engine
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Optional, Dict, Any
from enum import Enum


class EventType(Enum):
    """Types of classroom events"""
    STUDENT_SPOKE = "student_spoke"
    SILENCE = "silence"
    INTERRUPTION = "interruption"
    JOIN = "join"
    LEAVE = "leave"
    VAD_START = "vad_start"  # Voice Activity Detection started
    VAD_END = "vad_end"      # Voice Activity Detection ended
    QUESTION_DETECTED = "question_detected"
    CONFUSION_DETECTED = "confusion_detected"


@dataclass
class ClassroomEvent:
    """Base class for all classroom events"""
    type: str
    timestamp: datetime
    metadata: Dict[str, Any]
    
    def __post_init__(self):
        if isinstance(self.timestamp, str):
            # Parse string timestamp if needed
            self.timestamp = datetime.fromisoformat(self.timestamp)


@dataclass
class StudentSpokeEvent(ClassroomEvent):
    """Event fired when student utterance is transcribed"""
    transcript: str
    duration_ms: int
    confidence: float  # STT confidence score (0.0 - 1.0)
    interrupted_tutor: bool = False  # Was tutor speaking when student started?
    audio_features: Optional[Dict[str, float]] = None  # Volume, pitch, etc.
    
    def __init__(
        self, 
        transcript: str,
        duration_ms: int,
        confidence: float,
        interrupted_tutor: bool = False,
        audio_features: Optional[Dict[str, float]] = None,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            type=EventType.STUDENT_SPOKE.value,
            timestamp=timestamp or datetime.now(),
            metadata=metadata or {}
        )
        self.transcript = transcript
        self.duration_ms = duration_ms
        self.confidence = confidence
        self.interrupted_tutor = interrupted_tutor
        self.audio_features = audio_features or {}
    
    def is_short_answer(self) -> bool:
        """Check if response is very brief (may indicate uncertainty)"""
        word_count = len(self.transcript.split())
        return word_count <= 3
    
    def is_question(self) -> bool:
        """Heuristic to detect if student is asking a question"""
        question_words = ["what", "why", "how", "when", "where", "who", "can", "could", "would"]
        text_lower = self.transcript.lower().strip()
        
        # Ends with question mark or starts with question word
        return (
            text_lower.endswith("?") or 
            any(text_lower.startswith(word) for word in question_words)
        )


@dataclass
class SilenceEvent(ClassroomEvent):
    """Event fired when prolonged silence is detected"""
    duration_ms: int
    context: Literal["waiting_for_answer", "during_explanation", "between_topics"] = "waiting_for_answer"
    
    def __init__(
        self,
        duration_ms: int,
        context: str = "waiting_for_answer",
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            type=EventType.SILENCE.value,
            timestamp=timestamp or datetime.now(),
            metadata=metadata or {}
        )
        self.duration_ms = duration_ms
        self.context = context
    
    def is_long_silence(self) -> bool:
        """Check if silence is longer than 5 seconds"""
        return self.duration_ms > 5000
    
    def is_very_long_silence(self) -> bool:
        """Check if silence is longer than 10 seconds (severe disengagement)"""
        return self.duration_ms > 10000


@dataclass
class InterruptionEvent(ClassroomEvent):
    """Event fired when student interrupts tutor"""
    tutor_speech_duration_ms: int  # How long tutor had been speaking
    
    def __init__(
        self,
        tutor_speech_duration_ms: int,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            type=EventType.INTERRUPTION.value,
            timestamp=timestamp or datetime.now(),
            metadata=metadata or {}
        )
        self.tutor_speech_duration_ms = tutor_speech_duration_ms


@dataclass
class ParticipantJoinEvent(ClassroomEvent):
    """Event fired when student joins the room"""
    participant_identity: str
    participant_name: str
    
    def __init__(
        self,
        participant_identity: str,
        participant_name: str,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            type=EventType.JOIN.value,
            timestamp=timestamp or datetime.now(),
            metadata=metadata or {}
        )
        self.participant_identity = participant_identity
        self.participant_name = participant_name


@dataclass
class ParticipantLeaveEvent(ClassroomEvent):
    """Event fired when student leaves the room"""
    participant_identity: str
    session_duration_ms: int
    
    def __init__(
        self,
        participant_identity: str,
        session_duration_ms: int,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            type=EventType.LEAVE.value,
            timestamp=timestamp or datetime.now(),
            metadata=metadata or {}
        )
        self.participant_identity = participant_identity
        self.session_duration_ms = session_duration_ms


@dataclass
class VADEvent(ClassroomEvent):
    """Voice Activity Detection state change"""
    state: Literal["start", "end"]  # Speech started or ended
    
    def __init__(
        self,
        state: str,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        event_type = EventType.VAD_START.value if state == "start" else EventType.VAD_END.value
        super().__init__(
            type=event_type,
            timestamp=timestamp or datetime.now(),
            metadata=metadata or {}
        )
        self.state = state


# Action types for Voice Agent to execute
@dataclass
class VoiceAction:
    """Actions sent from Teaching Engine to Voice Agent"""
    type: Literal["SPEAK", "END_SESSION", "PAUSE", "RESUME"]
    data: Dict[str, Any]
    
    @staticmethod
    def speak(text: str, emotion: str = "neutral") -> "VoiceAction":
        """Create a SPEAK action"""
        return VoiceAction(
            type="SPEAK",
            data={"text": text, "emotion": emotion}
        )
    
    @staticmethod
    def end_session() -> "VoiceAction":
        """Create an END_SESSION action"""
        return VoiceAction(
            type="END_SESSION",
            data={}
        )
