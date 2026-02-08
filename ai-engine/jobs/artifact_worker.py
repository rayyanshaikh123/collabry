"""
Artifact Worker - Background Job Processor.

Continuously fetches and processes pending artifact generation jobs.
Includes contract-based validation with automatic repair.
Enhanced with operational safety: timeouts, token budgets, snapshot validation.
"""

import asyncio
import logging
from typing import Optional
from datetime import datetime
from agents.artifact_agent import ArtifactAgent
from llm.base_provider import BaseLLMProvider
from jobs.artifact_job_service import ArtifactJobService
from jobs.artifact_job_model import ArtifactJob
from jobs.safety_wrappers import create_guarded_provider
from artifacts.validators.structural_validator import StructuralValidator
from artifacts.validators.semantic_validator import SemanticValidator
from artifacts.validators.repair_chain import RepairChain
from events import get_event_bus
from config import CONFIG

logger = logging.getLogger(__name__)


class ArtifactWorker:
    """
    Background worker for artifact generation.

    Responsibilities:
    - Fetch pending jobs
    - Execute ArtifactAgent
    - Validate output
    - Update job status
    - Handle errors and retries
    """

    def __init__(
        self,
        job_service: ArtifactJobService,
        llm_provider: BaseLLMProvider,
        poll_interval: float = 2.0
    ):
        """
        Initialize artifact worker.

        Args:
            job_service: Job service for job management
            llm_provider: LLM provider for artifact generation
            poll_interval: Seconds between polls for new jobs
        """
        self.job_service = job_service
        self.llm_provider = llm_provider
        self.poll_interval = poll_interval
        self.running = False

        # Create artifact agent
        self.artifact_agent = ArtifactAgent(llm_provider=llm_provider)

        # Create validators
        self.structural_validator = StructuralValidator()
        self.semantic_validator = SemanticValidator(llm_provider=llm_provider)
        self.repair_chain = RepairChain(llm_provider=llm_provider)

        logger.info("Artifact worker initialized with contract-based validation")

    async def start(self):
        """
        Start worker loop.

        Continuously polls for pending jobs and processes them.
        Performs startup recovery to handle stuck jobs from previous runs.
        """
        self.running = True
        logger.info("🚀 Artifact worker starting...")

        # STARTUP RECOVERY: Mark stuck jobs as failed
        logger.info("🔄 Running startup recovery...")
        stuck_count = self.job_service.recover_stuck_jobs(timeout_minutes=10)
        if stuck_count > 0:
            logger.warning(f"Recovered {stuck_count} stuck jobs from previous runs")

        logger.info("✓ Worker ready to process jobs")

        while self.running:
            try:
                # Fetch next pending job
                job = self.job_service.fetch_pending_job()

                if job:
                    # Process job
                    await self._process_job(job)
                else:
                    # No jobs available, wait before next poll
                    await asyncio.sleep(self.poll_interval)

            except Exception as e:
                logger.exception(f"Worker loop error: {e}")
                await asyncio.sleep(self.poll_interval)

    async def stop(self):
        """Stop worker loop gracefully."""
        logger.info("Stopping artifact worker...")
        self.running = False

    async def _process_job(self, job: ArtifactJob):
        """
        Process artifact job through 3-phase pipeline.

        Phases:
        1. Planning (progress: 0 → 20)
        2. Generation (progress: 20 → 60)
        3. Validation (progress: 60 → 100)

        Args:
            job: Job to process
        """
        job_id = job.id
        logger.info(f"⚙️ Processing job {job_id} (type={job.artifact_type})")

        try:
            # ============ SNAPSHOT VALIDATION ============
            # Ensure snapshot is compatible with current configuration
            embedding_model = CONFIG.get("embedding_model", "all-MiniLM-L6-v2")
            chunking_version = CONFIG.get("chunking_version", "v1")

            is_compatible, error_msg = self.job_service.validate_snapshot_compatibility(
                job=job,
                current_embedding_model=embedding_model,
                current_chunking_version=chunking_version
            )

            if not is_compatible:
                logger.error(f"Job {job_id} snapshot incompatible: {error_msg}")
                self.job_service.mark_failed(job_id, error_msg)
                await self._publish_failed_event(job, error_msg)
                return

            # ============ CREATE GUARDED PROVIDER ============
            # Wrap provider with timeout and token budget enforcement
            guarded_provider = create_guarded_provider(
                provider=self.llm_provider,
                job_service=self.job_service,
                job_id=job_id
            )

            # ============ PHASE 1: PLANNING ============
            logger.info(f"📋 Phase 1: Planning {job.artifact_type} structure...")

            # Load retrieval snapshot (chunks captured at job creation)
            chunks = self._load_retrieval_snapshot(job)

            # Call ArtifactAgent.plan() with timeout and budget
            plan = await self._call_with_safety(
                guarded_provider,
                self.artifact_agent.plan,
                phase="planning",
                artifact_type=job.artifact_type,
                chunks=chunks
            )

            # Store plan
            self.job_service.store_plan(job_id, plan)
            self.job_service.update_progress(job_id, 20)

            logger.info(f"✓ Plan created: {plan}")

            # ============ PHASE 2: GENERATION ============
            self.job_service.mark_generating(job_id)
            logger.info(f"🔨 Phase 2: Generating {job.artifact_type} content...")

            # Call ArtifactAgent.generate_from_plan() with timeout and budget
            result = await self._call_with_safety(
                guarded_provider,
                self.artifact_agent.generate_from_plan,
                phase="generation",
                plan=plan,
                chunks=chunks,
                options=job.options
            )

            self.job_service.update_progress(job_id, 60)
            logger.info(f"✓ Generated artifact")

            # ============ PHASE 3: VALIDATION ============
            self.job_service.mark_validating(job_id)
            logger.info(f"✅ Phase 3: Validating {job.artifact_type}...")

            # Step 1: Structural validation
            logger.info("  → Step 1: Structural validation...")
            self.job_service.update_progress(job_id, 70)

            structural_result = self.structural_validator.validate(
                artifact_type=job.artifact_type,
                artifact=result
            )

            # Step 2: Semantic validation
            logger.info("  → Step 2: Semantic validation...")
            self.job_service.update_progress(job_id, 80)

            semantic_result = self.semantic_validator.validate(
                artifact_type=job.artifact_type,
                artifact=result,
                chunks=chunks
            )

            # Check if validation passed
            validation_passed = structural_result["valid"] and semantic_result["valid"]

            if not validation_passed:
                # Validation failed - attempt repair
                logger.warning(
                    f"Validation failed: "
                    f"{len(structural_result.get('violations', []))} structural violations, "
                    f"{len(semantic_result.get('issues', []))} semantic issues"
                )

                logger.info("  → Step 3: Attempting automatic repair...")
                self.job_service.update_progress(job_id, 85)

                # Attempt repair with validation loop
                repair_result = self.repair_chain.repair_and_validate(
                    artifact_type=job.artifact_type,
                    artifact=result,
                    plan=plan,
                    chunks=chunks,
                    initial_violations={
                        "structural": structural_result,
                        "semantic": semantic_result
                    }
                )

                if repair_result["success"]:
                    # Repair successful
                    logger.info(
                        f"✓ Repair successful after {repair_result['attempts']} attempt(s)"
                    )
                    result = repair_result["artifact"]
                else:
                    # Repair failed
                    error_msg = (
                        f"Validation failed after {repair_result['attempts']} repair attempts. "
                        f"Violations: {structural_result.get('violations', [])} "
                        f"Issues: {semantic_result.get('issues', [])}"
                    )
                    logger.error(f"Job {job_id} validation failed: {error_msg}")
                    self.job_service.mark_failed(job_id, error_msg)

                    # Publish failure event
                    await self._publish_failed_event(job, error_msg)
                    return

            # Mark as completed
            self.job_service.update_progress(job_id, 100)
            self.job_service.mark_completed(job_id, result)

            logger.info(f"✅ Job {job_id} completed successfully")

            # Publish completion event
            await self._publish_completed_event(job, result)

        except asyncio.TimeoutError:
            error_msg = "timeout - LLM call exceeded time limit"
            logger.error(f"Job {job_id} timed out")
            self.job_service.mark_failed(job_id, error_msg)
            await self._publish_failed_event(job, error_msg)

        except ValueError as e:
            if str(e) == "budget_exceeded":
                error_msg = "budget_exceeded - job exceeded token budget"
                logger.error(f"Job {job_id} exceeded budget")
                self.job_service.mark_failed(job_id, error_msg)
                await self._publish_failed_event(job, error_msg)
            else:
                error_msg = f"Job execution failed: {str(e)}"
                logger.exception(f"Job {job_id} failed: {error_msg}")
                self.job_service.mark_failed(job_id, error_msg)
                await self._publish_failed_event(job, error_msg)

        except Exception as e:
            error_msg = f"Job execution failed: {str(e)}"
            logger.exception(f"Job {job_id} failed: {error_msg}")
            self.job_service.mark_failed(job_id, error_msg)

            # Publish failure event
            await self._publish_failed_event(job, error_msg)

    async def _call_with_safety(
        self,
        guarded_provider,
        agent_method,
        phase: str,
        **kwargs
    ):
        """
        Call agent method with guarded provider that enforces timeouts and budget.

        This temporarily replaces the agent's provider with the guarded one
        for the duration of the call, then restores it.

        Args:
            guarded_provider: TokenBudgetGuard wrapping the provider
            agent_method: Agent method to call (plan or generate_from_plan)
            phase: Pipeline phase name for timeout selection
            **kwargs: Arguments to pass to agent method

        Returns:
            Result from agent method

        Raises:
            asyncio.TimeoutError: If LLM call times out
            ValueError: If token budget exceeded
        """
        # Temporarily replace provider
        original_provider = self.artifact_agent.llm_provider
        self.artifact_agent.llm_provider = guarded_provider.provider

        try:
            # Call agent method in thread (it's synchronous)
            result = await asyncio.to_thread(agent_method, **kwargs)
            return result
        finally:
            # Restore original provider
            self.artifact_agent.llm_provider = original_provider

    def _load_retrieval_snapshot(self, job: ArtifactJob) -> list:
        """
        Load retrieval snapshot from job.

        Worker must NEVER re-query vector DB.
        Uses only chunks captured at job creation time.

        Handles both versioned (new) and unversioned (legacy) snapshot formats.

        Args:
            job: Job with retrieval_snapshot

        Returns:
            List of chunk texts
        """
        if not job.retrieval_snapshot:
            # No RAG chunks, use job content directly
            return [job.content]

        snapshot = job.retrieval_snapshot

        # Check if this is a versioned snapshot (new format)
        if isinstance(snapshot, dict) and "chunks" in snapshot and isinstance(snapshot["chunks"], dict):
            # New format: snapshot = {chunks: {...}, embedding_model: ..., chunking_version: ...}
            chunks = snapshot["chunks"]
        elif isinstance(snapshot, dict) and "chunks" in snapshot:
            # Old direct format or mixed: snapshot = {chunks: [...]}
            chunks = snapshot["chunks"]
        else:
            # Legacy format: snapshot is the chunks directly
            chunks = snapshot

        if not chunks:
            return [job.content]

        # Return chunk texts
        if isinstance(chunks, list):
            return [chunk.get("text", "") for chunk in chunks if chunk.get("text")]
        else:
            # Fallback if structure is unexpected
            return [job.content]

    async def _publish_completed_event(self, job: ArtifactJob, result: dict):
        """
        Publish artifact.completed event.

        Args:
            job: Completed job
            result: Artifact result
        """
        try:
            event_bus = get_event_bus()
            await event_bus.publish(
                event_type="artifact.completed",
                event_data={
                    "job_id": job.id,
                    "user_id": job.user_id,
                    "artifact_type": job.artifact_type,
                    "notebook_id": job.notebook_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "result": result
                }
            )
            logger.debug(f"Published artifact.completed event for job {job.id}")
        except Exception as e:
            logger.error(f"Failed to publish completed event: {e}")

    async def _publish_failed_event(self, job: ArtifactJob, error: str):
        """
        Publish artifact.failed event.

        Args:
            job: Failed job
            error: Error message
        """
        try:
            event_bus = get_event_bus()
            await event_bus.publish(
                event_type="artifact.failed",
                event_data={
                    "job_id": job.id,
                    "user_id": job.user_id,
                    "artifact_type": job.artifact_type,
                    "notebook_id": job.notebook_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": error,
                    "retry_count": job.retry_count
                }
            )
            logger.debug(f"Published artifact.failed event for job {job.id}")
        except Exception as e:
            logger.error(f"Failed to publish failed event: {e}")


# Global worker instance (initialized by FastAPI startup)
_worker_instance: Optional[ArtifactWorker] = None


def get_worker() -> Optional[ArtifactWorker]:
    """Get global worker instance."""
    return _worker_instance


def set_worker(worker: ArtifactWorker):
    """Set global worker instance."""
    global _worker_instance
    _worker_instance = worker
