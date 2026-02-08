"""
Summarization endpoint for text content.

Handles:
- Text summarization using LLM
- Configurable summary styles
- Length control
- Streaming and non-streaming responses
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from server.deps import get_current_user
from server.schemas import SummarizeRequest, SummarizeResponse, ErrorResponse
from llm import create_llm_provider, Message
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

        # Create LLM provider for summarization
        llm_provider = create_llm_provider(
            provider_type=CONFIG.get("llm_provider", "ollama"),
            model=CONFIG.get("llm_model", "llama3.2:3b"),
            temperature=CONFIG.get("temperature", 0.7),
            max_tokens=CONFIG.get("max_tokens", 2000),
            base_url=CONFIG.get("ollama_base_url"),
            api_key=CONFIG.get("openai_api_key")
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

        # Generate summary
        messages = [Message(role="user", content=prompt)]
        response = llm_provider.generate(messages=messages)

        summary = response.content.strip()

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


@router.post(
    "/summarize/stream",
    summary="Streaming summarization endpoint",
    description="Summarize text using Server-Sent Events (SSE) streaming",
    responses={
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def summarize_stream(
    request: SummarizeRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Streaming summarization endpoint using SSE.
    
    Returns:
        StreamingResponse with Server-Sent Events
    """
    try:
        logger.info(f"Streaming summarization request from user={user_id}, style={request.style}")

        # Create LLM provider for summarization
        llm_provider = create_llm_provider(
            provider_type=CONFIG.get("llm_provider", "ollama"),
            model=CONFIG.get("llm_model", "llama3.2:3b"),
            temperature=CONFIG.get("temperature", 0.7),
            max_tokens=CONFIG.get("max_tokens", 2000),
            base_url=CONFIG.get("ollama_base_url"),
            api_key=CONFIG.get("openai_api_key")
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

        async def event_generator():
            """Generate SSE events that stream in real-time."""

            # Track if we've sent any data
            has_data = False

            try:
                # Stream tokens directly from LLM
                messages = [Message(role="user", content=prompt)]

                for token in llm_provider.stream(messages=messages):
                    if token:
                        has_data = True
                        yield f"data: {token}\n\n"

                # Send completion event
                if has_data:
                    yield f"event: done\ndata: \n\n"
                else:
                    yield f"data: No summary generated\n\n"
                    yield f"event: done\ndata: \n\n"

            except Exception as e:
                logger.exception(f"Stream generation error: {e}")
                yield f"event: error\ndata: {str(e)}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
        
    except Exception as e:
        logger.exception(f"Streaming summarization error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stream summary: {str(e)}"
        )
