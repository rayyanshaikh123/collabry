"""
Question Answering endpoint using RAG.

Handles:
- RAG-based question answering over user documents
- Configurable retrieval parameters
- Source document tracking
"""
from fastapi import APIRouter, Depends, HTTPException
from server.deps import get_current_user
from server.schemas import QARequest, QAResponse, ErrorResponse
from core.agent import create_agent
from core.rag_retriever import RAGRetriever
from config import CONFIG
import logging
from datetime import datetime
from uuid import uuid4

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["qa"])


@router.post(
    "/qa",
    response_model=QAResponse,
    responses={
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Question answering with RAG",
    description="Answer questions using user documents via Retrieval-Augmented Generation"
)
async def question_answering(
    request: QARequest,
    user_id: str = Depends(get_current_user)
) -> QAResponse:
    """
    Answer questions using RAG over user documents.
    
    - Extracts user_id from JWT token
    - Retrieves relevant documents from user's RAG index
    - Generates answer using retrieved context
    - Returns answer with source documents
    """
    try:
        logger.info(f"QA request from user={user_id}, question={request.question[:50]}...")
        
        sources = []
        context_text = ""
        
        # Retrieve relevant documents if RAG enabled
        if request.use_rag:
            rag = RAGRetriever(CONFIG, user_id=user_id)
            
            # Retrieve documents
            docs = rag.get_relevant_documents(
                request.question,
                user_id=user_id
            )
            
            # Build context from retrieved documents
            context_parts = []
            for i, doc in enumerate(docs[:request.top_k]):
                context_parts.append(f"[Document {i+1}]:\n{doc.page_content}")
                sources.append({
                    "source": doc.metadata.get("source", "unknown"),
                    "content": doc.page_content[:200] + "...",
                    "metadata": doc.metadata
                })
            
            context_text = "\n\n".join(context_parts)
            logger.info(f"Retrieved {len(docs)} documents for QA")
        
        # Use provided context if not using RAG
        elif request.context:
            context_text = request.context
        
        # Create agent for QA
        agent, _, _, _ = create_agent(
            user_id=user_id,
            session_id=str(uuid4()),  # Temporary session
            config=CONFIG
        )
        
        # Build QA prompt
        if context_text:
            prompt = f"""Answer the following question using the provided context.

Context:
{context_text}

Question: {request.question}

Answer (be specific and cite sources if available):"""
        else:
            prompt = f"""Answer the following question to the best of your knowledge.

Question: {request.question}

Answer:"""
        
        # Collect response
        response_chunks = []
        
        def collect_chunk(chunk: str):
            response_chunks.append(chunk)
        
        # Execute agent
        agent.handle_user_input_stream(prompt, collect_chunk)
        
        answer = "".join(response_chunks).strip()
        
        logger.info(f"QA answer generated: {len(answer)} chars, sources={len(sources)}")
        
        return QAResponse(
            question=request.question,
            answer=answer,
            sources=sources,
            user_id=user_id,
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.exception(f"QA error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to answer question: {str(e)}"
        )
