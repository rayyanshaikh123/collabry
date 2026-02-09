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
from core.agent import run_agent, chat as agent_chat
from config import CONFIG
import logging
from uuid import uuid4
from datetime import datetime
import json

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
        
        # Use new agent architecture
        response = await agent_chat(
            user_id=user_id,
            session_id=session_id,
            message=request.message,
            notebook_id=None  # Can be extended to support notebook context
        )
        
        logger.info(f"Chat response generated: {len(response)} chars")
        
        return ChatResponse(
            response=response,
            session_id=session_id,
            user_id=user_id,
            timestamp=datetime.utcnow(),
            tool_used=None  # New agent doesn't expose this directly
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
        
        async def event_generator():
            """Generate SSE events that stream in real-time from new agent."""
            has_data = False
            
            try:
                # Use new agent with streaming
                async for chunk in run_agent(
                    user_id=user_id,
                    session_id=session_id,
                    message=request.message,
                    notebook_id=None,
                    stream=True
                ):
                    if chunk:
                        has_data = True
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Send completion event
                if has_data:
                    yield f"data: {json.dumps({'done': True})}\n\n"
                else:
                    yield f"data: {json.dumps({'content': 'No response generated'})}\n\n"
                    yield f"data: {json.dumps({'done': True})}\n\n"
            
            except Exception as e:
                logger.error(f"Stream error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
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
