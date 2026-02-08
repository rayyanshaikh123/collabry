"""
Event Types - Domain Events for Artifact Jobs.

Defines event payloads for artifact lifecycle.
"""

from typing import Dict, Any
from datetime import datetime
from pydantic import BaseModel


class ArtifactEvent(BaseModel):
    """Base class for artifact events."""
    job_id: str
    user_id: str
    artifact_type: str
    notebook_id: str
    timestamp: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ArtifactCompletedEvent(ArtifactEvent):
    """Event emitted when artifact job completes successfully."""
    event_type: str = "artifact.completed"
    result: Dict[str, Any]


class ArtifactFailedEvent(ArtifactEvent):
    """Event emitted when artifact job fails."""
    event_type: str = "artifact.failed"
    error: str
    retry_count: int
