"""
Artifact Job Model - Schema and Status Definitions.

Defines the structure and lifecycle of artifact generation jobs.
"""

from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ArtifactJobStatus(str, Enum):
    """Job lifecycle states."""
    PENDING = "pending"         # Job created, waiting for worker
    PLANNING = "planning"       # Phase 1: Planning structure
    GENERATING = "generating"   # Phase 2: Generating content
    VALIDATING = "validating"   # Phase 3: Validation
    COMPLETED = "completed"     # Success
    FAILED = "failed"           # Error occurred


class ArtifactJobCreate(BaseModel):
    """Request to create new artifact job."""
    notebook_id: str = Field(..., description="Notebook/session context")
    artifact_type: Literal["quiz", "flashcards", "mindmap"] = Field(..., description="Type of artifact")
    content: str = Field(..., description="Content to generate artifact from")
    source_ids: Optional[list] = Field(None, description="Specific source IDs to use")
    options: Dict[str, Any] = Field(default_factory=dict, description="Type-specific options")


class ArtifactJob(BaseModel):
    """Complete artifact job document."""
    id: str = Field(..., description="Unique job identifier")
    user_id: str = Field(..., description="User who created job")
    notebook_id: str = Field(..., description="Notebook/session context")
    artifact_type: Literal["quiz", "flashcards", "mindmap"] = Field(..., description="Type of artifact")

    # Job state
    status: ArtifactJobStatus = Field(default=ArtifactJobStatus.PENDING, description="Current status")
    progress: int = Field(default=0, ge=0, le=100, description="Completion percentage")

    # Input/output
    content: str = Field(..., description="Content to generate from")
    source_ids: Optional[list] = Field(None, description="Source IDs used")
    options: Dict[str, Any] = Field(default_factory=dict, description="Generation options")
    result: Optional[Dict[str, Any]] = Field(None, description="Generated artifact (when completed)")

    # Multi-phase pipeline fields
    retrieval_snapshot: Optional[Dict[str, Any]] = Field(None, description="RAG chunks captured at job creation")
    request_fingerprint: Optional[str] = Field(None, description="Hash for idempotency checking")
    plan: Optional[Dict[str, Any]] = Field(None, description="Plan structure from phase 1")

    # Worker coordination
    worker_id: Optional[str] = Field(None, description="Worker instance that claimed this job")

    # Token budget tracking
    token_budget: int = Field(default=12000, description="Maximum tokens allowed for this job")
    tokens_used: int = Field(default=0, description="Tokens consumed so far")

    # Error tracking
    error: Optional[str] = Field(None, description="Error message if failed")
    retry_count: int = Field(default=0, description="Number of retry attempts")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Job creation time")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update time")
    started_at: Optional[datetime] = Field(None, description="Execution start time")
    completed_at: Optional[datetime] = Field(None, description="Completion time")

    class Config:
        """Pydantic config."""
        use_enum_values = True


class ArtifactJobResponse(BaseModel):
    """API response for job status."""
    job_id: str
    status: ArtifactJobStatus
    progress: int
    artifact_type: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic config."""
        use_enum_values = True


class ArtifactJobCreateResponse(BaseModel):
    """API response when job is created."""
    job_id: str
    status: ArtifactJobStatus
    message: str = "Artifact generation started"

    class Config:
        """Pydantic config."""
        use_enum_values = True
