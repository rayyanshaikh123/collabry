"""
Voice Tutor API Routes
Endpoints for creating and managing voice tutor sessions
"""
import asyncio
import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

from ..deps import get_current_user
from core.livekit_manager import LiveKitManager
from core.teaching_engine import ClassroomIntelligenceEngine
from core.voice_agent import VoiceTutorAgent, VoiceTutorAgentStub
from core.teaching_models import VoiceTutorSession, StudentProfile, TeachingAction
from core.voice_events import VoiceAction

from config import CONFIG
from core.rag_retriever import RAGRetriever
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice_tutor"])

# Global session tracking
active_sessions = {}

#Schema Models
class CreateRoomRequest(BaseModel):
    notebook_id: Optional[str] = 'general'
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


@router.post("/rooms", response_model=RoomResponse)
async def create_tutor_room(
    request: CreateRoomRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user)
):
    """
    Create a LiveKit room for voice tutor session
    
    Returns:
        Room credentials and session ID
    """
    try:
        # Initialize LiveKit manager
        livekit_manager = LiveKitManager()
        
        # Create room
        room_data = await livekit_manager.create_classroom_room(
            notebook_id=request.notebook_id,
            user_id=user_id
        )
        
        room_name = room_data["room_name"]
        
        # Generate tokens
        student_token = livekit_manager.generate_student_token(
            room_name=room_name,
            user_id=user_id,
            username=request.username or "Student"
        )
        
        agent_token = livekit_manager.generate_agent_token(
            room_name=room_name,
            agent_name="AI Tutor"
        )
        
        # Create session record
        session = VoiceTutorSession(
            session_id=f"session_{room_name}",
            user_id=user_id,
            notebook_id=request.notebook_id,
            room_name=room_name
        )
        
        # Store session in MongoDB
        # TODO: Implement MongoDB storage
        
        logger.info(f"Created voice tutor room: {room_name} for user {user_id}")
        
        # Start agent in background
        background_tasks.add_task(
            run_tutor_agent,
            session_id=session.session_id,
            room_name=room_name,
            agent_token=agent_token,
            user_id=user_id,
            notebook_id=request.notebook_id,
            source_content=request.source,
            ws_url=os.getenv("LIVEKIT_WS_URL", "ws://localhost:7880")
        )
        
        # Track active session
        active_sessions[session.session_id] = {
            "room_name": room_name,
            "user_id": user_id,
            "started_at": datetime.now()
        }
        
        return RoomResponse(
            room_name=room_name,
            student_token=student_token,
            ws_url=os.getenv("LIVEKIT_WS_URL", "ws://localhost:7880"),
            session_id=session.session_id
        )
        
    except Exception as e:
        logger.error(f"Error creating tutor room: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create room: {str(e)}")


@router.get("/sessions/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    user_id: str = Depends(get_current_user)
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
    user_id: str = Depends(get_current_user)
):
    """End a voice tutor session"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = active_sessions[session_id]
    
    if session_data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # TODO: Signal agent to end session
    # TODO: Save final session data to MongoDB
    
    del active_sessions[session_id]
    
    logger.info(f"Ended session: {session_id}")
    
    return {"message": "Session ended", "session_id": session_id}


async def run_tutor_agent(
    session_id: str,
    room_name: str,
    agent_token: str,
    user_id: str,
    notebook_id: str,
    source_content: Optional[str],
    ws_url: str
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
        
        # Save to database
        # TODO: Save session_data to MongoDB
        
        # Save student profile
        # TODO: Save classroom_engine.student_profile to MongoDB
        
        # Disconnect
        await voice_agent.disconnect()
        
        # Remove from active sessions
        if session_id in active_sessions:
            del active_sessions[session_id]
        
        logger.info(f"Session {session_id} ended successfully")
        
    except Exception as e:
        logger.error(f"Fatal error in tutor agent: {e}", exc_info=True)
        
        # Cleanup
        if session_id in active_sessions:
            del active_sessions[session_id]
