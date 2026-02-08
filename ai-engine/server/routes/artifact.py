"""
Artifact endpoints - Asynchronous artifact generation with job system.

Handles:
- Creating artifact generation jobs
- Polling job status
- Retrieving completed artifacts
- Realtime event notifications (SSE)

Artifacts are generated asynchronously by background workers.
"""
import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from server.deps import get_current_user
from server.schemas import ErrorResponse
from jobs import ArtifactJobService, ArtifactJobCreate, ArtifactJobCreateResponse, ArtifactJobResponse
from events import get_event_bus
from config import CONFIG
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai/artifact", tags=["artifacts"])

# Initialize job service
job_service = ArtifactJobService(
    mongo_uri=CONFIG.get("mongo_uri"),
    database=CONFIG.get("mongo_db", "collabry")
)


@router.post(
    "/generate",
    response_model=ArtifactJobCreateResponse,
    responses={
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Create artifact generation job",
    description="Submit an artifact generation request. Returns job_id for polling."
)
async def create_artifact_job(
    request: ArtifactJobCreate,
    user_id: str = Depends(get_current_user)
) -> ArtifactJobCreateResponse:
    """
    Create new artifact generation job.

    The artifact will be generated asynchronously by a background worker.
    Use the returned job_id to poll for status and retrieve the result.

    Args:
        request: Job parameters (artifact_type, content, options)
        user_id: User identifier from JWT

    Returns:
        Job ID and initial status
    """
    try:
        logger.info(
            f"Creating artifact job: type={request.artifact_type}, "
            f"user={user_id}, notebook={request.notebook_id}"
        )

        # Create job
        job = job_service.create_job(user_id=user_id, job_request=request)

        return ArtifactJobCreateResponse(
            job_id=job.id,
            status=job.status,
            message=f"{request.artifact_type.capitalize()} generation started. Poll /artifact/{job.id} for status."
        )

    except Exception as e:
        logger.exception(f"Failed to create artifact job: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create artifact job: {str(e)}"
        )


@router.get(
    "/status/{job_id}",
    response_model=ArtifactJobResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Get artifact job status",
    description="Poll job status and retrieve result when completed"
)
async def get_artifact_job_status(
    job_id: str,
    user_id: str = Depends(get_current_user)
) -> ArtifactJobResponse:
    """
    Get artifact job status and result.

    Poll this endpoint to check job progress.
    When status is "completed", the result field will contain the generated artifact.

    Status values: pending, planning, generating, validating, completed, failed

    Args:
        job_id: Job identifier
        user_id: User identifier from JWT

    Returns:
        Job status, progress, and result (if completed)
    """
    try:
        # Get job
        job_response = job_service.get_job_response(job_id)

        if not job_response:
            raise HTTPException(
                status_code=404,
                detail=f"Job not found: {job_id}"
            )

        # Verify ownership (security check)
        job = job_service.get_job(job_id)
        if job and job.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: not your job"
            )

        return job_response

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to get job {job_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve job status: {str(e)}"
        )


# Legacy path for backward compatibility
@router.get(
    "/{job_id}",
    response_model=ArtifactJobResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Get artifact job status (legacy)",
    description="Legacy endpoint - use /status/{job_id} instead",
    deprecated=True
)
async def get_artifact_job(
    job_id: str,
    user_id: str = Depends(get_current_user)
) -> ArtifactJobResponse:
    """
    DEPRECATED: Use /status/{job_id} instead.

    Legacy endpoint for backward compatibility.
    """
    return await get_artifact_job_status(job_id, user_id)


@router.get(
    "/user/jobs",
    response_model=list[ArtifactJobResponse],
    responses={
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Get user's artifact jobs",
    description="List all artifact jobs for current user"
)
async def get_user_jobs(
    user_id: str = Depends(get_current_user),
    limit: int = 50
) -> list[ArtifactJobResponse]:
    """
    Get all artifact jobs for current user.

    Args:
        user_id: User identifier from JWT
        limit: Maximum number of jobs to return

    Returns:
        List of job statuses
    """
    try:
        # Get user's jobs
        jobs = job_service.get_user_jobs(user_id=user_id, limit=limit)

        # Convert to response format
        return [
            ArtifactJobResponse(
                job_id=job.id,
                status=job.status,
                progress=job.progress,
                artifact_type=job.artifact_type,
                result=job.result,
                error=job.error,
                created_at=job.created_at,
                updated_at=job.updated_at
            )
            for job in jobs
        ]

    except Exception as e:
        logger.exception(f"Failed to get user jobs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve jobs: {str(e)}"
        )


@router.get(
    "/events/stream",
    responses={
        401: {"model": ErrorResponse}
    },
    summary="Subscribe to artifact events (SSE)",
    description="Server-Sent Events stream for realtime artifact job notifications"
)
async def stream_artifact_events(
    user_id: str = Depends(get_current_user)
):
    """
    Subscribe to realtime artifact job events.

    Returns Server-Sent Events (SSE) stream with notifications when:
    - Artifact jobs complete successfully
    - Artifact jobs fail

    Client should connect and listen for events matching their user_id.

    Args:
        user_id: User identifier from JWT

    Returns:
        SSE stream with event notifications
    """

    async def event_generator():
        """Generate SSE events from event bus."""
        # Create queue for this client
        queue = asyncio.Queue()

        # Event handler that filters by user_id
        async def handle_event(event_data: dict):
            # Only send events for this user
            if event_data.get("user_id") == user_id:
                await queue.put(event_data)

        # Subscribe to both event types
        event_bus = get_event_bus()
        event_bus.subscribe("artifact.completed", handle_event)
        event_bus.subscribe("artifact.failed", handle_event)

        try:
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connected', 'user_id': user_id})}\n\n"

            # Stream events from queue
            while True:
                # Wait for event with timeout (keepalive)
                try:
                    event_data = await asyncio.wait_for(queue.get(), timeout=30.0)

                    # Send event to client
                    event_json = json.dumps(event_data)
                    yield f"data: {event_json}\n\n"

                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield f": keepalive\n\n"

        except asyncio.CancelledError:
            # Client disconnected
            logger.info(f"Client {user_id} disconnected from event stream")
        finally:
            # Unsubscribe when client disconnects
            event_bus.unsubscribe("artifact.completed", handle_event)
            event_bus.unsubscribe("artifact.failed", handle_event)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )
