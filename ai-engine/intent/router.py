"""
Intent Router - Routes requests to appropriate agent based on classified intent.

Separates execution paths:
- CHAT mode → PlannerAgent (streaming, memory, tool loop)
- ARTIFACT mode → Job creation (async, no blocking)

This layer sits ABOVE agents and prevents mode mixing.
"""

from typing import Optional, Iterator, Dict, Any
from intent.intent_classifier import IntentClassifier, IntentResult
from agents.planner_agent import PlannerAgent
from llm.base_provider import BaseLLMProvider
from core.memory import MemoryManager
from core.rag_retriever import RAGRetriever
import logging

logger = logging.getLogger(__name__)


class IntentRouter:
    """
    Routes user requests to appropriate execution mode.

    Design:
    - Single responsibility: route based on intent
    - Chat mode: Execute via PlannerAgent
    - Artifact mode: Create job via ArtifactJobService
    - No direct artifact generation (async job system)
    """

    def __init__(
        self,
        llm_provider: BaseLLMProvider,
        memory: Optional[MemoryManager] = None,
        rag_retriever: Optional[RAGRetriever] = None,
        notebook_service: Optional[Any] = None,
        intent_classifier: Optional[IntentClassifier] = None,
        job_service: Optional[Any] = None  # ArtifactJobService
    ):
        """
        Initialize router with agent dependencies.

        Args:
            llm_provider: LLM provider for agents
            memory: Memory manager for chat mode
            rag_retriever: RAG retriever for chat mode
            notebook_service: Notebook service for chat mode
            intent_classifier: Optional custom classifier
            job_service: Artifact job service for async artifact generation
        """
        self.llm_provider = llm_provider

        # Create intent classifier (uses lightweight model)
        self.intent_classifier = intent_classifier or IntentClassifier()

        # Store planner agent (lazy initialization)
        self._planner_agent = None

        # Store dependencies for lazy agent creation
        self.memory = memory
        self.rag_retriever = rag_retriever
        self.notebook_service = notebook_service
        self.job_service = job_service

    def _get_planner_agent(self) -> PlannerAgent:
        """Lazy load planner agent."""
        if self._planner_agent is None:
            self._planner_agent = PlannerAgent(
                llm_provider=self.llm_provider,
                memory=self.memory,
                rag_retriever=self.rag_retriever,
                notebook_service=self.notebook_service
            )
        return self._planner_agent

    def execute(
        self,
        user_input: str,
        session_id: Optional[str] = None,
        source_ids: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute request with automatic intent routing (non-streaming).

        Args:
            user_input: User message
            session_id: Session ID for chat mode
            source_ids: Source IDs for RAG filtering
            **kwargs: Additional parameters

        Returns:
            {
                "mode": "chat" | "artifact",
                "response": str | dict,
                "artifact_type": optional
            }
        """
        # Classify intent
        intent = self.intent_classifier.classify(user_input)

        logger.info(f"🎯 Routing to {intent.mode} mode (artifact_type={intent.artifact_type})")

        # Route to appropriate agent
        if intent.mode == "artifact":
            return self._execute_artifact(user_input, intent, **kwargs)
        else:
            return self._execute_chat(user_input, session_id, source_ids, **kwargs)

    def execute_stream(
        self,
        user_input: str,
        session_id: Optional[str] = None,
        source_ids: Optional[list] = None,
        **kwargs
    ) -> Iterator[str]:
        """
        Execute request with streaming (chat mode only).

        Artifact mode returns job creation response (NOT streaming).

        Args:
            user_input: User message
            session_id: Session ID for chat mode
            source_ids: Source IDs for RAG filtering
            **kwargs: Additional parameters

        Yields:
            Response tokens (chat mode) or job creation message (artifact mode)
        """
        # Classify intent
        intent = self.intent_classifier.classify(user_input)

        logger.info(f"🎯 Streaming routing to {intent.mode} mode (artifact_type={intent.artifact_type})")

        # Artifact mode: create job and return job info (not streaming)
        if intent.mode == "artifact":
            result = self._execute_artifact(user_input, intent, **kwargs)
            # Yield job creation response as single message
            import json
            yield json.dumps({
                "type": "artifact_job_created",
                "job_id": result.get("job_id"),
                "status": result.get("status"),
                "artifact_type": result.get("artifact_type"),
                "message": result.get("message")
            })
            return

        # Chat mode: true streaming
        agent = self._get_planner_agent()

        for token in agent.execute_stream(
            user_input=user_input,
            source_ids=source_ids,
            session_id=session_id
        ):
            yield token

    def _execute_chat(
        self,
        user_input: str,
        session_id: Optional[str],
        source_ids: Optional[list],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute chat mode via PlannerAgent.

        Features:
        - Streaming capable
        - Memory persistence
        - Tool loop execution
        - RAG retrieval
        """
        agent = self._get_planner_agent()

        response = agent.execute(
            user_input=user_input,
            source_ids=source_ids,
            session_id=session_id
        )

        return {
            "mode": "chat",
            "response": response,
            "artifact_type": None
        }

    def _execute_artifact(
        self,
        user_input: str,
        intent: IntentResult,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create artifact generation job (async execution).

        Features:
        - Creates job in MongoDB
        - Returns immediately with job_id
        - Worker processes job asynchronously
        - No blocking execution
        """
        # Check if job service is available
        if not self.job_service:
            logger.error("Job service not configured, cannot create artifact job")
            return {
                "mode": "artifact",
                "error": "Artifact job system not configured",
                "artifact_type": intent.artifact_type
            }

        # Extract parameters from kwargs
        user_id = kwargs.get("user_id", "unknown")
        notebook_id = kwargs.get("notebook_id") or kwargs.get("session_id", "default")
        source_ids = kwargs.get("source_ids")
        options = kwargs.get("options", {})

        # If no artifact type detected, default to quiz
        artifact_type = intent.artifact_type or "quiz"

        # Create job request
        from jobs import ArtifactJobCreate

        job_request = ArtifactJobCreate(
            notebook_id=notebook_id,
            artifact_type=artifact_type,
            content=user_input,
            source_ids=source_ids,
            options=options
        )

        # Create job
        job = self.job_service.create_job(user_id=user_id, job_request=job_request)

        logger.info(f"Created artifact job {job.id} for user {user_id}")

        return {
            "mode": "artifact",
            "job_id": job.id,
            "status": job.status.value,
            "artifact_type": artifact_type,
            "message": f"Artifact generation job created. Job ID: {job.id}"
        }

    def classify_intent(self, user_input: str) -> IntentResult:
        """
        Expose intent classification for debugging/testing.

        Args:
            user_input: User message

        Returns:
            IntentResult with mode and artifact_type
        """
        return self.intent_classifier.classify(user_input)
