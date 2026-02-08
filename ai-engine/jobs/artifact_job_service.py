"""
Artifact Job Service - Business Logic Layer.

Handles CRUD operations for artifact jobs with MongoDB persistence.
Implements multi-phase pipeline and idempotency.
"""

from typing import Optional, List
from datetime import datetime
from uuid import uuid4
import hashlib
import json
import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from jobs.artifact_job_model import (
    ArtifactJob,
    ArtifactJobStatus,
    ArtifactJobCreate,
    ArtifactJobResponse
)

logger = logging.getLogger(__name__)


class ArtifactJobService:
    """
    Service layer for artifact job management.

    Responsibilities:
    - Create jobs
    - Update job status
    - Fetch jobs for workers
    - Query job status for clients
    - Persist to MongoDB
    """

    COLLECTION_NAME = "artifact_jobs"
    MAX_RETRIES = 1

    def __init__(self, mongo_uri: str, database: str, worker_id: Optional[str] = None):
        """
        Initialize job service with MongoDB connection.

        Args:
            mongo_uri: MongoDB connection string
            database: Database name
            worker_id: Optional worker instance identifier (for claiming jobs)
        """
        self.client = MongoClient(mongo_uri)
        self.db = self.client[database]
        self.collection: Collection = self.db[self.COLLECTION_NAME]
        self.worker_id = worker_id or f"worker-{uuid4().hex[:8]}"

        # Create indexes for efficient queries
        self._ensure_indexes()

    def _generate_fingerprint(
        self,
        user_id: str,
        notebook_id: str,
        artifact_type: str,
        source_ids: Optional[list],
        options: dict
    ) -> str:
        """
        Generate request fingerprint for idempotency.

        Args:
            user_id: User identifier
            notebook_id: Notebook identifier
            artifact_type: Artifact type
            source_ids: Source IDs
            options: Generation options

        Returns:
            SHA256 hash string
        """
        # Create deterministic string representation
        fingerprint_data = {
            "user_id": user_id,
            "notebook_id": notebook_id,
            "artifact_type": artifact_type,
            "source_ids": sorted(source_ids) if source_ids else [],
            "options": options
        }

        # Convert to JSON and hash
        fingerprint_str = json.dumps(fingerprint_data, sort_keys=True)
        return hashlib.sha256(fingerprint_str.encode()).hexdigest()

    def _find_active_job_by_fingerprint(self, fingerprint: str) -> Optional[ArtifactJob]:
        """
        Find active job with same fingerprint (idempotency check).

        Args:
            fingerprint: Request fingerprint

        Returns:
            ArtifactJob if active job exists, None otherwise
        """
        # Active = not failed or completed
        active_statuses = [
            ArtifactJobStatus.PENDING.value,
            ArtifactJobStatus.PLANNING.value,
            ArtifactJobStatus.GENERATING.value,
            ArtifactJobStatus.VALIDATING.value
        ]

        doc = self.collection.find_one({
            "request_fingerprint": fingerprint,
            "status": {"$in": active_statuses}
        })

        if not doc:
            return None

        doc.pop("_id", None)
        return ArtifactJob(**doc)

    def _ensure_indexes(self):
        """Create MongoDB indexes for job queries."""
        try:
            # Index for worker queries (fetch pending jobs)
            self.collection.create_index([
                ("status", ASCENDING),
                ("created_at", ASCENDING)
            ], name="worker_fetch_index")

            # Index for user queries (get user's jobs)
            self.collection.create_index([
                ("user_id", ASCENDING),
                ("created_at", DESCENDING)
            ], name="user_jobs_index")

            # Index for job_id lookups
            self.collection.create_index("id", unique=True, name="job_id_index")

            logger.info("Artifact job indexes ensured")

        except Exception as e:
            logger.warning(f"Failed to create indexes: {e}")

    def create_job(
        self,
        user_id: str,
        job_request: ArtifactJobCreate,
        retrieval_snapshot: Optional[dict] = None,
        embedding_model: str = "all-MiniLM-L6-v2",
        chunking_version: str = "v1"
    ) -> ArtifactJob:
        """
        Create new artifact generation job.

        Args:
            user_id: User identifier
            job_request: Job parameters
            retrieval_snapshot: RAG chunks captured at request time
            embedding_model: Embedding model used for RAG
            chunking_version: Chunking algorithm version

        Returns:
            Created ArtifactJob (existing if duplicate request)
        """
        # Generate fingerprint for idempotency
        fingerprint = self._generate_fingerprint(
            user_id=user_id,
            notebook_id=job_request.notebook_id,
            artifact_type=job_request.artifact_type,
            source_ids=job_request.source_ids,
            options=job_request.options
        )

        # Check for existing active job with same fingerprint
        existing_job = self._find_active_job_by_fingerprint(fingerprint)
        if existing_job:
            logger.info(
                f"Found existing active job {existing_job.id} with same fingerprint, "
                f"returning existing job (idempotency)"
            )
            return existing_job

        # Create new job
        job_id = str(uuid4())

        # Add versioning metadata to snapshot
        versioned_snapshot = retrieval_snapshot or {}
        if retrieval_snapshot:
            versioned_snapshot = {
                "chunks": retrieval_snapshot,
                "embedding_model": embedding_model,
                "chunking_version": chunking_version,
                "created_at": datetime.utcnow().isoformat()
            }

        job = ArtifactJob(
            id=job_id,
            user_id=user_id,
            notebook_id=job_request.notebook_id,
            artifact_type=job_request.artifact_type,
            content=job_request.content,
            source_ids=job_request.source_ids,
            options=job_request.options,
            status=ArtifactJobStatus.PENDING,
            progress=0,
            request_fingerprint=fingerprint,
            retrieval_snapshot=versioned_snapshot
        )

        # Insert to MongoDB
        self.collection.insert_one(job.dict())

        logger.info(f"Created artifact job: {job_id} (type={job.artifact_type}, user={user_id})")

        return job

    def get_job(self, job_id: str) -> Optional[ArtifactJob]:
        """
        Get job by ID.

        Args:
            job_id: Job identifier

        Returns:
            ArtifactJob if found, None otherwise
        """
        doc = self.collection.find_one({"id": job_id})

        if not doc:
            return None

        # Remove MongoDB _id field
        doc.pop("_id", None)

        return ArtifactJob(**doc)

    def get_user_jobs(
        self,
        user_id: str,
        limit: int = 50,
        status: Optional[ArtifactJobStatus] = None
    ) -> List[ArtifactJob]:
        """
        Get jobs for a specific user.

        Args:
            user_id: User identifier
            limit: Maximum number of jobs to return
            status: Optional status filter

        Returns:
            List of ArtifactJob objects
        """
        query = {"user_id": user_id}

        if status:
            query["status"] = status.value

        cursor = self.collection.find(query).sort("created_at", DESCENDING).limit(limit)

        jobs = []
        for doc in cursor:
            doc.pop("_id", None)
            jobs.append(ArtifactJob(**doc))

        return jobs

    def fetch_pending_job(self) -> Optional[ArtifactJob]:
        """
        Fetch next pending job and mark as planning (atomic operation).

        CRITICAL: This uses atomic findOneAndUpdate to prevent race conditions
        where multiple workers try to claim the same job.

        Returns:
            ArtifactJob if available, None if no pending jobs
        """
        # Atomic find and update with worker claiming
        doc = self.collection.find_one_and_update(
            {"status": ArtifactJobStatus.PENDING.value},
            {
                "$set": {
                    "status": ArtifactJobStatus.PLANNING.value,
                    "progress": 0,
                    "worker_id": self.worker_id,  # Claim job for this worker
                    "started_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            },
            sort=[("created_at", ASCENDING)],
            return_document=True
        )

        if not doc:
            return None

        doc.pop("_id", None)
        job = ArtifactJob(**doc)

        logger.info(f"Worker {self.worker_id} claimed job: {job.id} (type={job.artifact_type})")

        return job

    def update_progress(self, job_id: str, progress: int):
        """
        Update job progress.

        Args:
            job_id: Job identifier
            progress: Progress percentage (0-100)
        """
        self.collection.update_one(
            {"id": job_id},
            {
                "$set": {
                    "progress": max(0, min(100, progress)),
                    "updated_at": datetime.utcnow()
                }
            }
        )

    def store_plan(self, job_id: str, plan: dict):
        """
        Store plan from planning phase.

        Args:
            job_id: Job identifier
            plan: Plan structure
        """
        self.collection.update_one(
            {"id": job_id},
            {
                "$set": {
                    "plan": plan,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        logger.info(f"Stored plan for job {job_id}")

    def mark_generating(self, job_id: str):
        """
        Mark job as generating (phase 2).

        Args:
            job_id: Job identifier
        """
        self.collection.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": ArtifactJobStatus.GENERATING.value,
                    "progress": 20,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        logger.info(f"Job {job_id} marked as generating")

    def mark_validating(self, job_id: str):
        """
        Mark job as validating (phase 3).

        Args:
            job_id: Job identifier
        """
        self.collection.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": ArtifactJobStatus.VALIDATING.value,
                    "progress": 60,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        logger.info(f"Job {job_id} marked as validating")

    def mark_completed(self, job_id: str, result: dict):
        """
        Mark job as completed with result.

        Args:
            job_id: Job identifier
            result: Generated artifact data
        """
        self.collection.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": ArtifactJobStatus.COMPLETED.value,
                    "progress": 100,
                    "result": result,
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        logger.info(f"Job {job_id} marked as completed")

    def mark_failed(self, job_id: str, error: str):
        """
        Mark job as failed with error message.

        Args:
            job_id: Job identifier
            error: Error description
        """
        job = self.get_job(job_id)

        if not job:
            logger.error(f"Cannot mark failed - job not found: {job_id}")
            return

        # Increment retry count
        new_retry_count = job.retry_count + 1

        # Check if should retry
        should_retry = new_retry_count <= self.MAX_RETRIES

        if should_retry:
            # Reset to pending for retry
            self.collection.update_one(
                {"id": job_id},
                {
                    "$set": {
                        "status": ArtifactJobStatus.PENDING.value,
                        "error": error,
                        "retry_count": new_retry_count,
                        "updated_at": datetime.utcnow(),
                        "started_at": None  # Reset start time
                    }
                }
            )
            logger.warning(f"Job {job_id} failed, queued for retry {new_retry_count}/{self.MAX_RETRIES}")

        else:
            # Max retries reached, mark as permanently failed
            self.collection.update_one(
                {"id": job_id},
                {
                    "$set": {
                        "status": ArtifactJobStatus.FAILED.value,
                        "error": error,
                        "retry_count": new_retry_count,
                        "completed_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            logger.error(f"Job {job_id} permanently failed after {new_retry_count} attempts")

    def get_job_response(self, job_id: str) -> Optional[ArtifactJobResponse]:
        """
        Get job status in API response format.

        Args:
            job_id: Job identifier

        Returns:
            ArtifactJobResponse if job exists, None otherwise
        """
        job = self.get_job(job_id)

        if not job:
            return None

        return ArtifactJobResponse(
            job_id=job.id,
            status=job.status,
            progress=job.progress,
            artifact_type=job.artifact_type,
            result=job.result,
            error=job.error,
            created_at=job.created_at,
            updated_at=job.updated_at
        )

    def cleanup_old_jobs(self, days: int = 30):
        """
        Delete jobs older than specified days.

        Args:
            days: Age threshold in days
        """
        from datetime import timedelta

        cutoff = datetime.utcnow() - timedelta(days=days)

        result = self.collection.delete_many({
            "created_at": {"$lt": cutoff}
        })

        logger.info(f"Cleaned up {result.deleted_count} old jobs (older than {days} days)")

    def increment_tokens_used(self, job_id: str, tokens: int) -> bool:
        """
        Increment tokens used for job and check budget.

        Args:
            job_id: Job identifier
            tokens: Number of tokens to add

        Returns:
            True if within budget, False if budget exceeded
        """
        job = self.get_job(job_id)
        if not job:
            logger.error(f"Cannot increment tokens - job not found: {job_id}")
            return False

        new_total = job.tokens_used + tokens

        # Update tokens used
        self.collection.update_one(
            {"id": job_id},
            {
                "$set": {
                    "tokens_used": new_total,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Check if budget exceeded
        if new_total > job.token_budget:
            logger.warning(
                f"Job {job_id} exceeded token budget: "
                f"{new_total}/{job.token_budget} tokens"
            )
            return False

        return True

    def recover_stuck_jobs(self, timeout_minutes: int = 10):
        """
        Recover jobs that have been stuck in processing states.

        Called on worker startup to handle jobs that were interrupted
        by worker crashes or restarts.

        Args:
            timeout_minutes: Minutes before considering job stuck
        """
        from datetime import timedelta

        cutoff = datetime.utcnow() - timedelta(minutes=timeout_minutes)

        # Find stuck jobs (in processing state but started long ago)
        stuck_statuses = [
            ArtifactJobStatus.PLANNING.value,
            ArtifactJobStatus.GENERATING.value,
            ArtifactJobStatus.VALIDATING.value
        ]

        result = self.collection.update_many(
            {
                "status": {"$in": stuck_statuses},
                "started_at": {"$lt": cutoff}
            },
            {
                "$set": {
                    "status": ArtifactJobStatus.FAILED.value,
                    "error": "worker_restart - job was stuck in processing state",
                    "updated_at": datetime.utcnow(),
                    "completed_at": datetime.utcnow()
                }
            }
        )

        if result.modified_count > 0:
            logger.warning(
                f"Recovered {result.modified_count} stuck jobs "
                f"(older than {timeout_minutes} minutes)"
            )

        return result.modified_count

    def validate_snapshot_compatibility(
        self,
        job: ArtifactJob,
        current_embedding_model: str,
        current_chunking_version: str
    ) -> tuple[bool, str]:
        """
        Validate that job snapshot is compatible with current configuration.

        Args:
            job: Job to validate
            current_embedding_model: Current embedding model
            current_chunking_version: Current chunking version

        Returns:
            Tuple of (is_compatible, error_message)
        """
        if not job.retrieval_snapshot:
            return True, ""

        # Check if snapshot has versioning info (old jobs may not have it)
        if isinstance(job.retrieval_snapshot, dict):
            snapshot_model = job.retrieval_snapshot.get("embedding_model")
            snapshot_version = job.retrieval_snapshot.get("chunking_version")

            if snapshot_model and snapshot_model != current_embedding_model:
                return False, (
                    f"snapshot_incompatible: embedding model mismatch "
                    f"(snapshot={snapshot_model}, current={current_embedding_model})"
                )

            if snapshot_version and snapshot_version != current_chunking_version:
                return False, (
                    f"snapshot_incompatible: chunking version mismatch "
                    f"(snapshot={snapshot_version}, current={current_chunking_version})"
                )

        return True, ""
