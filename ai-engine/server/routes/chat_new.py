"""
Chat Route - Unified chat endpoint using new agent architecture.

This replaces the old complex chat/qa/summarize endpoints with a single
endpoint where the LLM decides what to do via tool calling.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
from server.deps import get_current_user
from core.agent_new import run_agent, chat as agent_chat
import json


router = APIRouter(prefix="/ai", tags=["chat"])


class ChatRequest(BaseModel):
    """Chat request schema."""
    message: str = Field(..., description="User message")
    session_id: str = Field(..., description="Conversation session ID")
    notebook_id: Optional[str] = Field(None, description="Optional notebook context")
    stream: bool = Field(True, description="Enable streaming response")


class ChatResponse(BaseModel):
    """Chat response schema (non-streaming)."""
    response: str
    session_id: str
    notebook_id: Optional[str] = None


@router.post("/chat")
async def unified_chat(
    request: ChatRequest,
    user: dict = Depends(get_current_user)
):
    """
    Unified chat endpoint - LLM decides actions via tool calling.
    
    This endpoint handles:
    - General Q&A
    - Document search (via search_sources tool)
    - Summarization (via summarize_notes tool)
    - Quiz generation (via generate_quiz tool)
    - Flashcard generation (via generate_flashcards tool)
    
    The LLM automatically chooses the appropriate action based on the user's message.
    No need for separate /summarize or /quiz endpoints.
    
    Request body:
    ```json
    {
        "message": "Summarize my biology notes",
        "session_id": "session_123",
        "notebook_id": "bio_101",
        "stream": true
    }
    ```
    
    Response: Streaming text/event-stream or JSON
    """
    try:
        user_id = user.get("user_id") or user.get("id")
        
        if request.stream:
            # Streaming response
            async def generate():
                try:
                    async for chunk in run_agent(
                        user_id=user_id,
                        session_id=request.session_id,
                        message=request.message,
                        notebook_id=request.notebook_id,
                        stream=True
                    ):
                        # Send as SSE format
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                    
                    # Send done signal
                    yield f"data: {json.dumps({'done': True})}\n\n"
                
                except Exception as e:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        
        else:
            # Non-streaming response
            response = await agent_chat(
                user_id=user_id,
                session_id=request.session_id,
                message=request.message,
                notebook_id=request.notebook_id
            )
            
            return ChatResponse(
                response=response,
                session_id=request.session_id,
                notebook_id=request.notebook_id
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def list_sessions(
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """
    List user's conversation sessions.
    
    Returns list of sessions with metadata.
    """
    from core.conversation import get_conversation_manager
    
    try:
        user_id = user.get("user_id") or user.get("id")
        conv_manager = get_conversation_manager()
        
        sessions = conv_manager.list_sessions(user_id, limit)
        
        return {
            "sessions": sessions,
            "total": len(sessions)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a conversation session."""
    from core.conversation import get_conversation_manager
    
    try:
        user_id = user.get("user_id") or user.get("id")
        conv_manager = get_conversation_manager()
        
        success = conv_manager.delete_session(user_id, session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"success": True, "message": "Session deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/history")
async def get_session_history(
    session_id: str,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get conversation history for a session."""
    from core.conversation import get_conversation_manager
    
    try:
        user_id = user.get("user_id") or user.get("id")
        conv_manager = get_conversation_manager()
        
        history = conv_manager.get_history(user_id, session_id, limit)
        
        return {
            "session_id": session_id,
            "messages": history,
            "count": len(history)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
