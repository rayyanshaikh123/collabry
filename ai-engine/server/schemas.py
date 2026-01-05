"""
Pydantic schemas for FastAPI request/response models.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============================================================================
# Chat Schemas
# ============================================================================

class ChatRequest(BaseModel):
    """Request for chat endpoint."""
    message: str = Field(..., description="User message", min_length=1)
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")
    stream: bool = Field(False, description="Enable streaming response")


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    response: str = Field(..., description="AI response")
    session_id: str = Field(..., description="Session ID for this conversation")
    user_id: str = Field(..., description="User ID from JWT")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tool_used: Optional[str] = Field(None, description="Tool invoked if any")


# ============================================================================
# Document Upload/Ingest Schemas
# ============================================================================

class UploadRequest(BaseModel):
    """Request for document upload/ingest."""
    content: str = Field(..., description="Document text content", min_length=1)
    filename: str = Field(..., description="Original filename")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class UploadResponse(BaseModel):
    """Response from upload endpoint."""
    task_id: str = Field(..., description="Background task ID for tracking")
    status: str = Field("processing", description="Processing status")
    filename: str
    user_id: str
    message: str = Field(default="Document upload initiated")


class IngestStatusResponse(BaseModel):
    """Status response for document ingestion."""
    task_id: str
    status: str = Field(..., description="Status: processing, completed, failed")
    chunks_processed: Optional[int] = None
    error: Optional[str] = None


# ============================================================================
# Summarization Schemas
# ============================================================================

class SummarizeRequest(BaseModel):
    """Request for text summarization."""
    text: str = Field(..., description="Text to summarize", min_length=10)
    max_length: Optional[int] = Field(None, description="Maximum summary length in words")
    style: Optional[str] = Field("concise", description="Summary style: concise, detailed, bullet")


class SummarizeResponse(BaseModel):
    """Response from summarization."""
    summary: str = Field(..., description="Generated summary")
    original_length: int = Field(..., description="Original text length in characters")
    summary_length: int = Field(..., description="Summary length in characters")
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Question Answering Schemas
# ============================================================================

class QARequest(BaseModel):
    """Request for question answering over user documents."""
    question: str = Field(..., description="Question to answer", min_length=1)
    context: Optional[str] = Field(None, description="Additional context if not using RAG")
    use_rag: bool = Field(True, description="Use RAG retrieval from user documents")
    top_k: int = Field(3, description="Number of documents to retrieve", ge=1, le=10)


class QAResponse(BaseModel):
    """Response from question answering."""
    question: str
    answer: str = Field(..., description="Generated answer")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Source documents used")
    confidence: Optional[float] = Field(None, description="Answer confidence score")
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Mind Map Schemas
# ============================================================================

class MindMapRequest(BaseModel):
    """Request for mind map generation."""
    topic: str = Field(..., description="Central topic for mind map", min_length=1)
    depth: int = Field(2, description="Mind map depth level", ge=1, le=4)
    use_documents: bool = Field(True, description="Use user documents for context")


class MindMapNode(BaseModel):
    """Node in mind map structure."""
    id: str
    label: str
    level: int
    children: List['MindMapNode'] = Field(default_factory=list)


MindMapNode.model_rebuild()  # Rebuild for self-referencing


class MindMapResponse(BaseModel):
    """Response with mind map structure."""
    topic: str
    root: MindMapNode
    total_nodes: int
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Session Management Schemas
# ============================================================================

class SessionResponse(BaseModel):
    """Response for session listing."""
    session_id: str
    last_activity: datetime
    message_count: Optional[int] = None


class SessionListResponse(BaseModel):
    """Response for session list."""
    user_id: str
    sessions: List[SessionResponse]
    total: int


# ============================================================================
# Error Schemas
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    code: Optional[str] = Field(None, description="Error code")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Health Check Schema
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field("healthy", description="Service status")
    version: str = Field("1.0.0", description="API version")
    components: Dict[str, str] = Field(default_factory=dict, description="Component statuses")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
