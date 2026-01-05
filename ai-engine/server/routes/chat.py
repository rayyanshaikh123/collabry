"""
Chat endpoint for conversational AI interactions.

Handles:
- Multi-user isolated conversations
- Session management
- Streaming and non-streaming responses
- Tool invocation tracking
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from server.deps import get_current_user
from server.schemas import ChatRequest, ChatResponse, ErrorResponse
from core.agent import create_agent
from config import CONFIG
import logging
from uuid import uuid4
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Chat with AI assistant",
    description="Send a message to the AI assistant with conversation continuity via session_id"
)
async def chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user)
) -> ChatResponse:
    """
    Chat endpoint with user-isolated conversation memory.
    
    - Extracts user_id from JWT token
    - Maintains conversation context via session_id
    - Supports tool invocation (web search, document generation, etc.)
    """
    try:
        # Generate session_id if not provided
        session_id = request.session_id or str(uuid4())
        
        logger.info(f"Chat request from user={user_id}, session={session_id}")
        
        # Create user-isolated agent
        agent, _, _, memory = create_agent(
            user_id=user_id,
            session_id=session_id,
            config=CONFIG
        )
        
        # Collect response chunks
        response_chunks = []
        tool_used = None
        
        def collect_chunk(chunk: str):
            response_chunks.append(chunk)
        
        # Execute agent with streaming collection
        agent.handle_user_input_stream(request.message, collect_chunk)
        
        # Check if tool was used
        if hasattr(agent, 'last_tool_called') and agent.last_tool_called:
            tool_used = agent.last_tool_called
        
        # Combine chunks into full response
        full_response = "".join(response_chunks)
        
        logger.info(f"Chat response generated: {len(full_response)} chars, tool={tool_used}")
        
        return ChatResponse(
            response=full_response,
            session_id=session_id,
            user_id=user_id,
            timestamp=datetime.utcnow(),
            tool_used=tool_used
        )
        
    except Exception as e:
        logger.exception(f"Chat endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat request: {str(e)}"
        )


@router.post(
    "/chat/stream",
    summary="Streaming chat endpoint",
    description="Chat with AI assistant using Server-Sent Events (SSE) streaming",
    responses={
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def chat_stream(
    request: ChatRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Streaming chat endpoint using SSE.
    
    Returns:
        StreamingResponse with Server-Sent Events
    """
    try:
        session_id = request.session_id or str(uuid4())
        
        logger.info(f"Streaming chat request from user={user_id}, session={session_id}")
        
        # Create user-isolated agent
        agent, _, _, _ = create_agent(
            user_id=user_id,
            session_id=session_id,
            config=CONFIG
        )
        
        async def event_generator():
            """Generate SSE events."""
            chunks = []
            
            def collect_chunk(chunk: str):
                chunks.append(chunk)
            
            # Execute agent (synchronous)
            agent.handle_user_input_stream(request.message, collect_chunk)
            
            # Stream collected chunks as SSE
            for chunk in chunks:
                if chunk.strip():
                    yield f"data: {chunk}\n\n"
            
            # Send completion event
            yield f"event: done\ndata: {session_id}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
        
    except Exception as e:
        logger.exception(f"Streaming chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stream chat response: {str(e)}"
        )


@router.get(
    "/sessions",
    summary="List user sessions",
    description="Get all chat sessions for the authenticated user"
)
async def list_sessions(user_id: str = Depends(get_current_user)):
    """
    List all sessions for the current user.
    
    Returns:
        List of session metadata (session_id, last_activity)
    """
    try:
        from core.memory import MemoryManager
        
        # Create temporary memory manager to list sessions
        memory = MemoryManager(user_id=user_id, session_id="temp")
        sessions = memory.list_user_sessions()
        
        return {
            "user_id": user_id,
            "sessions": sessions,
            "total": len(sessions)
        }
        
    except Exception as e:
        logger.exception(f"List sessions error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list sessions: {str(e)}"
        )


@router.post(
    "/sessions",
    summary="Create new session",
    description="Create a new chat session for the authenticated user"
)
async def create_session(user_id: str = Depends(get_current_user)):
    """
    Create a new session for the current user.
    
    Returns:
        New session_id
    """
    try:
        from core.memory import MemoryManager
        
        memory = MemoryManager(user_id=user_id, session_id="temp")
        new_session_id = memory.create_session()
        
        return {
            "user_id": user_id,
            "session_id": new_session_id,
            "message": "Session created successfully"
        }
        
    except Exception as e:
        logger.exception(f"Create session error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create session: {str(e)}"
        )
