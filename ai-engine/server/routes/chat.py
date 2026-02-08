"""
Chat endpoint for conversational AI interactions.

Handles:
- Multi-user isolated conversations
- Session management
- TRUE streaming (token-by-token) for chat
- Intent-based routing (chat vs artifact job creation)

Artifact requests create async jobs instead of blocking.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from server.deps import get_current_user
from server.schemas import (
    ChatRequest,
    ChatResponse,
    ChatTextResponse,
    ArtifactJobCreatedResponse,
    ErrorResponse
)
from llm import create_llm_provider
from intent import IntentRouter
from core.memory import MemoryManager
from core.rag_retriever import RAGRetriever
from jobs import ArtifactJobService  # NEW: Async job system
from config import CONFIG
import logging
from uuid import uuid4
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["chat"])

# Initialize job service (singleton)
job_service = ArtifactJobService(
    mongo_uri=CONFIG.get("mongo_uri"),
    database=CONFIG.get("mongo_db", "collabry")
)


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
    Chat endpoint with user-isolated conversation memory and intent routing.

    - Extracts user_id from JWT token
    - Maintains conversation context via session_id
    - Automatically routes to chat or artifact mode based on intent
    - Supports tool invocation (RAG search, web search, etc.)
    """
    try:
        # Generate session_id if not provided
        session_id = request.session_id or str(uuid4())

        logger.info(f"Chat request from user={user_id}, session={session_id}")

        # Create LLM provider (Ollama or OpenAI based on config)
        llm_provider = create_llm_provider(
            provider_type=CONFIG.get("llm_provider", "ollama"),
            model=CONFIG.get("llm_model", "llama3.2:3b"),
            temperature=CONFIG.get("temperature", 0.7),
            max_tokens=CONFIG.get("max_tokens", 2000),
            base_url=CONFIG.get("ollama_base_url"),
            api_key=CONFIG.get("openai_api_key")
        )

        # Create memory manager for this session
        memory = MemoryManager(
            user_id=user_id,
            session_id=session_id
        )

        # Create RAG retriever for document search
        rag_retriever = RAGRetriever(
            config=CONFIG,
            user_id=user_id,
            session_id=session_id
        )

        # Create intent router with job service
        router_instance = IntentRouter(
            llm_provider=llm_provider,
            memory=memory,
            rag_retriever=rag_retriever,
            notebook_service=None,  # TODO: Wire up notebook service if needed
            job_service=job_service  # NEW: Pass job service for async artifacts
        )

        # Execute with intent routing (chat or artifact job creation)
        result = router_instance.execute(
            user_input=request.message,
            source_ids=getattr(request, 'source_ids', None),
            session_id=session_id,
            user_id=user_id,  # NEW: Pass user_id for job creation
            notebook_id=session_id  # Use session as notebook context
        )

        # Return standardized response based on mode
        if result["mode"] == "artifact":
            # Artifact mode: Return job creation response
            logger.info(
                f"Chat response: artifact job created (job_id={result.get('job_id')}, "
                f"type={result.get('artifact_type')})"
            )

            return ArtifactJobCreatedResponse(
                job_id=result["job_id"],
                artifact_type=result["artifact_type"],
                status=result.get("status", "pending"),
                session_id=session_id,
                user_id=user_id,
                timestamp=datetime.utcnow()
            )
        else:
            # Chat mode: Return conversational text response
            logger.info(f"Chat response: conversational text (length={len(result['response'])})")

            return ChatTextResponse(
                message=result["response"],
                session_id=session_id,
                user_id=user_id,
                timestamp=datetime.utcnow()
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
    description="Chat with AI assistant using Server-Sent Events (SSE) with TRUE token-by-token streaming",
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
    TRUE streaming chat endpoint using SSE with intent routing.

    This endpoint provides token-by-token streaming for chat mode.
    Artifact mode returns complete structured output.

    Returns:
        StreamingResponse with Server-Sent Events
    """
    try:
        session_id = request.session_id or str(uuid4())

        logger.info(f"Streaming chat request from user={user_id}, session={session_id}")

        # Create LLM provider
        llm_provider = create_llm_provider(
            provider_type=CONFIG.get("llm_provider", "ollama"),
            model=CONFIG.get("llm_model", "llama3.2:3b"),
            temperature=CONFIG.get("temperature", 0.7),
            max_tokens=CONFIG.get("max_tokens", 2000),
            base_url=CONFIG.get("ollama_base_url"),
            api_key=CONFIG.get("openai_api_key")
        )

        # Create memory manager
        memory = MemoryManager(
            user_id=user_id,
            session_id=session_id
        )

        # Create RAG retriever
        rag_retriever = RAGRetriever(
            config=CONFIG,
            user_id=user_id,
            session_id=session_id
        )

        # Create intent router with job service
        router_instance = IntentRouter(
            llm_provider=llm_provider,
            memory=memory,
            rag_retriever=rag_retriever,
            notebook_service=None,
            job_service=job_service  # NEW: Pass job service
        )

        async def event_generator():
            """
            Generate SSE events with TRUE streaming (chat) or job creation (artifact).

            For chat: Yields tokens immediately as they are generated by the LLM.
            For artifact: Yields single job creation event and closes immediately.
            """
            try:
                # First, check intent mode to determine streaming behavior
                # For artifacts: Send job event and close immediately
                # For chat: Stream tokens as they come

                # Execute with intent routing to determine mode
                result = router_instance.execute(
                    user_input=request.message,
                    source_ids=getattr(request, 'source_ids', None),
                    session_id=session_id,
                    user_id=user_id,
                    notebook_id=session_id
                )

                if result["mode"] == "artifact":
                    # Artifact mode: Send single event and close
                    logger.info(f"Streaming: artifact job created (job_id={result.get('job_id')})")

                    import json
                    job_data = {
                        "type": "artifact_job",
                        "job_id": result["job_id"],
                        "artifact_type": result["artifact_type"],
                        "status": result.get("status", "pending"),
                        "session_id": session_id,
                        "user_id": user_id
                    }

                    # Send artifact_job event and close immediately
                    yield f"event: artifact_job\n"
                    yield f"data: {json.dumps(job_data)}\n\n"
                    yield f"event: done\ndata: \n\n"

                else:
                    # Chat mode: TRUE token-by-token streaming
                    logger.info("Streaming: chat mode - starting token stream")

                    has_data = False
                    for token in router_instance.execute_stream(
                        user_input=request.message,
                        source_ids=getattr(request, 'source_ids', None),
                        session_id=session_id,
                        user_id=user_id,
                        notebook_id=session_id
                    ):
                        if token:
                            has_data = True
                            # Yield token immediately (no buffering)
                            yield f"data: {token}\n\n"

                    # Send completion event
                    if has_data:
                        yield f"event: done\ndata: \n\n"
                    else:
                        yield f"data: No response generated\n\n"
                        yield f"event: done\ndata: \n\n"

            except Exception as e:
                logger.exception(f"Streaming error: {e}")
                yield f"event: error\ndata: {str(e)}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable nginx buffering for true streaming
            }
        )

    except Exception as e:
        logger.exception(f"Streaming chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stream chat response: {str(e)}"
        )
