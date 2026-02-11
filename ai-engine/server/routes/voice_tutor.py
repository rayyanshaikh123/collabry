"""
Voice Tutor API Routes
Endpoints for creating and managing voice tutor sessions and scheduled classes.
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from ..deps import get_current_user
from core.livekit_manager import LiveKitManager
from core.mongo_store import MongoMemoryStore
from core.rag_retriever import RAGRetriever
from core.scheduled_classes_repo import (
    ScheduledClass,
    ScheduledClassCreate,
    ScheduledClassStatus,
    scheduled_classes_repo,
)
from core.teaching_engine import ClassroomIntelligenceEngine
from core.teaching_models import StudentProfile, TeachingAction, VoiceTutorSession
from core.voice_agent import VoiceTutorAgent, VoiceTutorAgentStub
from core.voice_events import VoiceAction

from config import CONFIG
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice_tutor"])

# Global session tracking (augmented with optional class_id)
active_sessions = {}

# Mongo-backed storage for voice tutor artefacts
mongo_store = MongoMemoryStore(CONFIG["mongo_uri"], CONFIG["mongo_db"])


# Schema Models
class CreateRoomRequest(BaseModel):
    notebook_id: Optional[str] = "general"
    username: Optional[str] = None
    source: Optional[str] = None  # Raw text content for teaching


class RoomResponse(BaseModel):
    room_name: str
    student_token: str
    ws_url: str
    session_id: str


class SessionStatusResponse(BaseModel):
    session_id: str
    status: str
    current_phase: str
    topics_covered: list
    questions_asked: int
    questions_answered_correctly: int


class ScheduledClassResponse(ScheduledClass):
    """Alias used for FastAPI response models."""

    pass


class ScheduledClassListResponse(BaseModel):
    classes: List[ScheduledClassResponse]


def _normalize_livekit_ws_url(url: str) -> str:
    """Normalize LiveKit URL to a websocket endpoint."""
    u = (url or "").strip()
    if not u:
        return ""
    if u.startswith("https://"):
        return "wss://" + u[len("https://") :]
    if u.startswith("http://"):
        return "ws://" + u[len("http://") :]
    return u


async def _create_livekit_session_for_user(
    *,
    user_id: str,
    notebook_id: Optional[str],
    username: Optional[str],
    source_content: Optional[str],
    background_tasks: BackgroundTasks,
    class_id: Optional[str] = None,
) -> RoomResponse:
    """
    Shared helper to create a LiveKit room, tokens, and start the tutor agent.

    Returns a RoomResponse with student credentials.
    """
    livekit_manager = LiveKitManager()

    # Create room
    room_data = await livekit_manager.create_classroom_room(
        notebook_id=notebook_id,
        user_id=user_id,
    )
    room_name = room_data["room_name"]

    # Generate tokens
    student_token = livekit_manager.generate_student_token(
        room_name=room_name,
        user_id=user_id,
        username=username or "Student",
    )

    agent_token = livekit_manager.generate_agent_token(
        room_name=room_name, agent_name="AI Tutor"
    )

    # Create session record (in-memory representation)
    session = VoiceTutorSession(
        session_id=f"session_{room_name}",
        user_id=user_id,
        notebook_id=notebook_id or "general",
        room_name=room_name,
    )

    raw_ws = os.getenv("LIVEKIT_WS_URL") or os.getenv("LIVEKIT_URL") or "ws://localhost:7880"
    ws_url = _normalize_livekit_ws_url(raw_ws)

    logger.info(f"Created voice tutor room: {room_name} for user {user_id}")

    # Start agent in background
    background_tasks.add_task(
        run_tutor_agent,
        session_id=session.session_id,
        room_name=room_name,
        agent_token=agent_token,
        user_id=user_id,
        notebook_id=notebook_id or "general",
        source_content=source_content,
        ws_url=ws_url,
        class_id=class_id,
    )

    # Track active session (optionally linked to a scheduled class)
    active_sessions[session.session_id] = {
        "room_name": room_name,
        "user_id": user_id,
        "started_at": datetime.now(),
        "class_id": class_id,
    }

    return RoomResponse(
        room_name=room_name,
        student_token=student_token,
        ws_url=ws_url,
        session_id=session.session_id,
    )


@router.post("/rooms", response_model=RoomResponse)
async def create_tutor_room(
    request: CreateRoomRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    """
    Create an ad-hoc LiveKit room for a voice tutor session.
    """
    try:
        return await _create_livekit_session_for_user(
            user_id=user_id,
            notebook_id=request.notebook_id,
            username=request.username,
            source_content=request.source,
            background_tasks=background_tasks,
        )
    except Exception as e:
        logger.error(f"Error creating tutor room: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create room: {str(e)}"
        )


@router.get("/sessions/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get status of a voice tutor session"""
    # TODO: Load from MongoDB
    
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = active_sessions[session_id]
    
    if session_data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return SessionStatusResponse(
        session_id=session_id,
        status="active",
        current_phase="teaching",
        topics_covered=[],
        questions_asked=0,
        questions_answered_correctly=0
    )


@router.delete("/sessions/{session_id}")
async def end_session(
    session_id: str,
    user_id: str = Depends(get_current_user),
):
    """End a voice tutor session"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = active_sessions[session_id]
    
    if session_data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # TODO: Signal agent to end session
    # TODO: Save final session data to MongoDB (handled in run_tutor_agent)
    class_id = session_data.get("class_id")
    
    del active_sessions[session_id]
    
    logger.info(f"Ended session: {session_id}")

    # If this was a scheduled class, mark it as completed
    if class_id:
        try:
            scheduled_classes_repo.update_status(
                class_id=class_id,
                user_id=user_id,
                status=ScheduledClassStatus.COMPLETED,
            )
        except Exception as e:
            logger.warning(f"Failed to update scheduled class {class_id} on end_session: {e}")
    
    return {"message": "Session ended", "session_id": session_id}


@router.post(
    "/classes/schedule",
    response_model=ScheduledClassResponse,
    summary="Schedule a new AI classroom session",
)
async def schedule_class(
    request: ScheduledClassCreate,
    user_id: str = Depends(get_current_user),
):
    """
    Create a scheduled AI classroom session for the current user.
    """
    try:
        scheduled = scheduled_classes_repo.create_for_user(user_id=user_id, payload=request)
        return ScheduledClassResponse(**scheduled.dict())
    except Exception as e:
        logger.error(f"Error scheduling class: {e}")
        raise HTTPException(status_code=500, detail="Failed to schedule class")


@router.get(
    "/classes",
    response_model=ScheduledClassListResponse,
    summary="List upcoming scheduled classes for the current user",
)
async def list_scheduled_classes(
    user_id: str = Depends(get_current_user),
):
    try:
        classes = scheduled_classes_repo.list_upcoming_for_user(user_id=user_id)
        return ScheduledClassListResponse(
            classes=[ScheduledClassResponse(**c.dict()) for c in classes]
        )
    except Exception as e:
        logger.error(f"Error listing scheduled classes: {e}")
        raise HTTPException(status_code=500, detail="Failed to list scheduled classes")


@router.get(
    "/classes/{class_id}",
    response_model=ScheduledClassResponse,
    summary="Get a single scheduled class",
)
async def get_scheduled_class(
    class_id: str,
    user_id: str = Depends(get_current_user),
):
    scheduled = scheduled_classes_repo.get_for_user(class_id=class_id, user_id=user_id)
    if not scheduled:
        raise HTTPException(status_code=404, detail="Class not found")
    return ScheduledClassResponse(**scheduled.dict())


@router.post(
    "/classes/{class_id}/start",
    response_model=RoomResponse,
    summary="Start a scheduled class and return LiveKit credentials",
)
async def start_scheduled_class(
    class_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    """
    Start a scheduled class:
    - Validates ownership and time window.
    - Creates LiveKit room + tokens.
    - Starts the AI tutor agent.
    - Marks the class as started and attaches room/session IDs.
    """
    scheduled = scheduled_classes_repo.get_for_user(class_id=class_id, user_id=user_id)
    if not scheduled:
        raise HTTPException(status_code=404, detail="Class not found")

    if scheduled.status not in {
        ScheduledClassStatus.SCHEDULED,
        ScheduledClassStatus.STARTED,
    }:
        raise HTTPException(
            status_code=400,
            detail=f"Class has status '{scheduled.status.value}' and cannot be started",
        )

    # Enforce a reasonable time window around the scheduled start
    now = datetime.utcnow()
    window_before = scheduled.scheduled_start - timedelta(minutes=15)
    window_after = scheduled.scheduled_start + timedelta(minutes=60)
    if now < window_before or now > window_after:
        raise HTTPException(
            status_code=400,
            detail="Class can only be started close to its scheduled time",
        )

    try:
        # Create room and start agent
        room_response = await _create_livekit_session_for_user(
            user_id=user_id,
            notebook_id=scheduled.notebook_id,
            username=None,
            source_content=scheduled.source,
            background_tasks=background_tasks,
            class_id=class_id,
        )

        # Persist linkage between scheduled class and live session
        scheduled_classes_repo.mark_started(
            class_id=class_id,
            user_id=user_id,
            room_name=room_response.room_name,
            session_id=room_response.session_id,
        )

        return room_response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting scheduled class {class_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to start scheduled class")


async def run_tutor_agent(
    session_id: str,
    room_name: str,
    agent_token: str,
    user_id: str,
    notebook_id: str,
    source_content: Optional[str],
    ws_url: str,
    class_id: Optional[str] = None,
):
    """
    Main orchestration: Voice Agent + Teaching Engine
    Runs as background task
    """
    logger.info(f"Starting tutor agent for session {session_id}")
    
    # Store source content if provided
    if source_content:
        logger.info(f"Using provided source content ({len(source_content)} chars)")
    
    try:
        # Initialize components
        session_data = VoiceTutorSession(
            session_id=session_id,
            user_id=user_id,
            notebook_id=notebook_id,
            room_name=room_name
        )
        
        # Check if LiveKit is available
        try:
            from core.voice_agent import VoiceTutorAgent as Agent
        except ImportError:
            from core.voice_agent import VoiceTutorAgentStub as Agent
            logger.warning("Using stub agent (LiveKit not available)")
        
        voice_agent = Agent(room_name, session_id)

        rag_retriever = None
        rag_source_id = None
        if source_content:
            try:
                rag_retriever = RAGRetriever(CONFIG, user_id=user_id)
                rag_source_id = f"voice_tutor_source:{session_id}"

                # Prevent duplicate ingestion if session is restarted.
                try:
                    rag_retriever.delete_documents_by_metadata(
                        user_id=user_id,
                        source_id=rag_source_id,
                        session_id=session_id,
                        save_index=False,
                    )
                except Exception:
                    pass

                rag_retriever.add_user_documents(
                    documents=[
                        Document(
                            page_content=source_content,
                            metadata={
                                "source": "voice_tutor_source",
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
                logger.info("✓ Ingested provided source content into RAG")
            except Exception as e:
                logger.warning(f"RAG ingestion failed (continuing without RAG): {e}")

        classroom_engine = ClassroomIntelligenceEngine(
            session_id,
            user_id,
            notebook_id,
            session_data,
            rag_retriever=rag_retriever,
            rag_source_id=rag_source_id,
        )
        
        # Connect to LiveKit
        connected = await voice_agent.connect(agent_token, ws_url)
        
        if not connected:
            logger.error("Failed to connect Voice Agent to LiveKit")
            return
        
        # Initialize teaching engine
        await classroom_engine.initialize()
        
        logger.info("Voice agent and teaching engine initialized")
        
        # Wait for student to join before starting event loop
        # The ParticipantJoinEvent will trigger the first greeting
        await asyncio.sleep(2)
        
        # Main event loop
        logger.info("Starting main event loop")
        
        while classroom_engine.global_phase.value != "end":
            try:
                # Wait for event from Voice Agent (with timeout)
                event = await asyncio.wait_for(
                    voice_agent.event_queue.get(),
                    timeout=30.0  # 30 second timeout
                )
                
                # Teaching engine decides action
                teaching_action = await classroom_engine.handle_event(event)
                
                if teaching_action:
                    # Generate speech for action
                    speech = await classroom_engine.generate_speech(teaching_action)
                    
                    # Add to transcript
                    session_data.add_turn("tutor", speech)
                    
                    # Voice agent executes (speak)
                    voice_action = VoiceAction.speak(speech)
                    await voice_agent.action_queue.put(voice_action)
                    
                    logger.info(f"Executed action: {teaching_action.value}")
                
                # Update engagement score periodically
                classroom_engine.update_engagement_score()
                
            except asyncio.TimeoutError:
                # No events - check if we should prompt student
                logger.debug("Event timeout - checking engagement")
                
                # If waiting for student response, maybe give hint
                if (classroom_engine.loop_state and 
                    classroom_engine.loop_state.value == "wait"):
                    # Been waiting too long
                    from core.voice_events import SilenceEvent
                    silence_event = SilenceEvent(duration_ms=30000)
                    teaching_action = await classroom_engine.handle_event(silence_event)
                    
                    if teaching_action:
                        speech = await classroom_engine.generate_speech(teaching_action)
                        session_data.add_turn("tutor", speech)
                        voice_action = VoiceAction.speak(speech)
                        await voice_agent.action_queue.put(voice_action)
            
            except Exception as e:
                logger.error(f"Error in event loop: {e}")
                break
        
        # Session ended
        logger.info("Session complete, cleaning up")
        
        # Final goodbye
        final_speech = await classroom_engine.generate_speech(
            ClassroomIntelligenceEngine.TeachingAction.END_SESSION
        )
        session_data.add_turn("tutor", final_speech)
        await voice_agent.speak(final_speech)
        
        # Complete session
        session_data.complete_session()
        
        # Save to database (session + student profile)
        try:
            mongo_store.save_voice_session(session_data.to_dict())
        except Exception as e:
            logger.error(f"Failed to persist voice tutor session {session_id}: {e}")
        
        try:
            if classroom_engine.student_profile:
                mongo_store.save_student_profile(
                    classroom_engine.student_profile.to_dict()
                )
        except Exception as e:
            logger.error(f"Failed to persist student profile for session {session_id}: {e}")
        
        # Disconnect
        await voice_agent.disconnect()
        
        # Remove from active sessions
        sess_meta = active_sessions.pop(session_id, None)
        
        # If this was a scheduled class, mark it as completed
        resolved_class_id = class_id or (sess_meta or {}).get("class_id")
        if resolved_class_id:
            try:
                scheduled_classes_repo.update_status(
                    class_id=resolved_class_id,
                    user_id=user_id,
                    status=ScheduledClassStatus.COMPLETED,
                )
            except Exception as e:
                logger.warning(
                    f"Failed to update scheduled class {resolved_class_id} on completion: {e}"
                )
        
        logger.info(f"Session {session_id} ended successfully")
        
    except Exception as e:
        logger.error(f"Fatal error in tutor agent: {e}", exc_info=True)
        
        # Cleanup
        sess_meta = active_sessions.pop(session_id, None)
        resolved_class_id = class_id or (sess_meta or {}).get("class_id")
        if resolved_class_id:
            try:
                scheduled_classes_repo.update_status(
                    class_id=resolved_class_id,
                    user_id=user_id,
                    status=ScheduledClassStatus.CANCELLED,
                )
            except Exception as update_err:
                logger.warning(
                    f"Failed to mark scheduled class {resolved_class_id} as cancelled after error: {update_err}"
                )
