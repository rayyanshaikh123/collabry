"""
Summarization endpoint for text content.

Handles:
- Text summarization using LLM
- Configurable summary styles
- Length control
"""
from fastapi import APIRouter, Depends, HTTPException
from server.deps import get_current_user
from server.schemas import SummarizeRequest, SummarizeResponse, ErrorResponse
from core.agent import create_agent
from config import CONFIG
import logging
from datetime import datetime
from uuid import uuid4

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["summarize"])


@router.post(
    "/summarize",
    response_model=SummarizeResponse,
    responses={
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Summarize text",
    description="Generate summary of provided text using AI"
)
async def summarize_text(
    request: SummarizeRequest,
    user_id: str = Depends(get_current_user)
) -> SummarizeResponse:
    """
    Summarize text content.
    
    - Extracts user_id from JWT token
    - Generates summary with configurable style
    - Returns summary with length statistics
    """
    try:
        logger.info(f"Summarization request from user={user_id}, style={request.style}")
        
        # Create agent for summarization (no session needed for stateless operation)
        agent, _, _, _ = create_agent(
            user_id=user_id,
            session_id=str(uuid4()),  # Temporary session for stateless operation
            config=CONFIG
        )
        
        # Build summarization prompt based on style
        style_instructions = {
            "concise": "Provide a concise 2-3 sentence summary.",
            "detailed": "Provide a detailed summary covering main points (3-5 paragraphs).",
            "bullet": "Provide a bullet-point summary of key points."
        }
        
        instruction = style_instructions.get(request.style, style_instructions["concise"])
        
        # Add length constraint if specified
        if request.max_length:
            instruction += f" Keep summary under {request.max_length} words."
        
        # Build prompt
        prompt = f"""Summarize the following text.

Instructions: {instruction}

Text to summarize:
{request.text}

Summary:"""
        
        # Collect response
        response_chunks = []
        
        def collect_chunk(chunk: str):
            response_chunks.append(chunk)
        
        # Execute agent
        agent.handle_user_input_stream(prompt, collect_chunk)
        
        summary = "".join(response_chunks).strip()
        
        logger.info(f"Summary generated: {len(summary)} chars from {len(request.text)} chars")
        
        return SummarizeResponse(
            summary=summary,
            original_length=len(request.text),
            summary_length=len(summary),
            user_id=user_id,
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.exception(f"Summarization error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )
