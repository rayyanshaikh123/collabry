"""
Safety Wrappers for Operational Reliability.

Provides timeout enforcement and token budget tracking for LLM calls
without modifying the provider interface.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Iterator
from llm.base_provider import BaseLLMProvider, Message, ToolDefinition, LLMResponse
from jobs.artifact_job_service import ArtifactJobService

logger = logging.getLogger(__name__)


class LLMTimeoutWrapper:
    """
    Wraps LLM provider to enforce timeouts on all calls.

    Prevents hanging workers by enforcing strict time limits per phase:
    - Planning: 45s
    - Generation: 90s
    - Validation: 45s
    - Repair: 60s
    """

    def __init__(
        self,
        provider: BaseLLMProvider,
        default_timeout: float = 60.0
    ):
        """
        Initialize timeout wrapper.

        Args:
            provider: Underlying LLM provider
            default_timeout: Default timeout in seconds
        """
        self.provider = provider
        self.default_timeout = default_timeout

    async def generate_with_timeout(
        self,
        messages: List[Message],
        tools: Optional[List[ToolDefinition]] = None,
        response_format: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ) -> LLMResponse:
        """
        Generate with timeout enforcement.

        Args:
            messages: Conversation messages
            tools: Available tools
            response_format: Response format (e.g., JSON mode)
            timeout: Timeout in seconds (uses default if None)

        Returns:
            LLMResponse

        Raises:
            asyncio.TimeoutError: If generation exceeds timeout
        """
        timeout_seconds = timeout or self.default_timeout

        try:
            # Run generation with timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.provider.generate,
                    messages=messages,
                    tools=tools,
                    response_format=response_format
                ),
                timeout=timeout_seconds
            )

            logger.debug(f"LLM call completed within {timeout_seconds}s")
            return response

        except asyncio.TimeoutError:
            logger.error(f"LLM call timed out after {timeout_seconds}s")
            raise


class TokenBudgetGuard:
    """
    Tracks token usage and enforces budget limits.

    Wraps LLM calls to automatically deduct tokens from job budget
    and fail jobs that exceed their allocation.
    """

    PHASE_TIMEOUTS = {
        "planning": 45.0,
        "generation": 90.0,
        "validation": 45.0,
        "repair": 60.0
    }

    def __init__(
        self,
        provider: BaseLLMProvider,
        job_service: ArtifactJobService,
        job_id: str
    ):
        """
        Initialize token budget guard.

        Args:
            provider: LLM provider
            job_service: Job service for tracking tokens
            job_id: Job identifier
        """
        self.provider = provider
        self.job_service = job_service
        self.job_id = job_id
        self.timeout_wrapper = LLMTimeoutWrapper(provider)

    async def generate_with_budget(
        self,
        messages: List[Message],
        tools: Optional[List[ToolDefinition]] = None,
        response_format: Optional[Dict[str, Any]] = None,
        phase: str = "default"
    ) -> LLMResponse:
        """
        Generate with token budget enforcement.

        Args:
            messages: Conversation messages
            tools: Available tools
            response_format: Response format
            phase: Pipeline phase (for timeout selection)

        Returns:
            LLMResponse

        Raises:
            ValueError: If budget exceeded
            asyncio.TimeoutError: If timeout exceeded
        """
        # Get timeout for this phase
        timeout = self.PHASE_TIMEOUTS.get(phase, 60.0)

        # Estimate input tokens
        input_text = " ".join([msg.content for msg in messages])
        estimated_input_tokens = self.provider.count_tokens(input_text)

        # Rough estimate: assume output will be similar to input
        estimated_total_tokens = estimated_input_tokens * 2

        # Check if within budget
        within_budget = self.job_service.increment_tokens_used(
            self.job_id,
            estimated_total_tokens
        )

        if not within_budget:
            logger.error(f"Job {self.job_id} exceeded token budget")
            raise ValueError("budget_exceeded")

        # Call LLM with timeout
        try:
            response = await self.timeout_wrapper.generate_with_timeout(
                messages=messages,
                tools=tools,
                response_format=response_format,
                timeout=timeout
            )

            # Update with actual token usage
            actual_tokens = response.usage.get("total_tokens")
            if actual_tokens:
                # Correct the estimate
                correction = actual_tokens - estimated_total_tokens
                if correction != 0:
                    self.job_service.increment_tokens_used(self.job_id, correction)

            logger.info(
                f"Job {self.job_id} used ~{actual_tokens or estimated_total_tokens} tokens "
                f"(phase={phase})"
            )

            return response

        except asyncio.TimeoutError:
            logger.error(f"Job {self.job_id} timed out in {phase} phase after {timeout}s")
            raise


def create_guarded_provider(
    provider: BaseLLMProvider,
    job_service: ArtifactJobService,
    job_id: str
) -> TokenBudgetGuard:
    """
    Factory function to create guarded provider.

    Args:
        provider: Underlying LLM provider
        job_service: Job service
        job_id: Job identifier

    Returns:
        TokenBudgetGuard wrapping the provider
    """
    return TokenBudgetGuard(provider, job_service, job_id)
