"""
Conversation Agent - Direct Response Agent.

This agent provides direct conversational responses without tool execution.
It's used for educational conversations, explanations, and guidance.
"""

from typing import Optional, Iterator
from agents.base_agent import BaseAgent
from llm.base_provider import BaseLLMProvider, Message
from core.memory import MemoryManager
import logging

logger = logging.getLogger(__name__)


class ConversationAgent(BaseAgent):
    """
    Conversational response agent.

    Responsibilities:
    - Direct conversational responses (no tools)
    - Educational tone and pedagogical guidance
    - Clear explanations with examples
    - Encouraging and supportive

    This agent is used when:
    - User asks general questions (no RAG needed)
    - Planner decides a direct response is appropriate
    - No tool execution is required
    """

    def __init__(
        self,
        llm_provider: BaseLLMProvider,
        memory: Optional[MemoryManager] = None
    ):
        """
        Initialize conversation agent.

        Args:
            llm_provider: LLM provider for generation
            memory: Optional memory manager for conversation history
        """
        super().__init__(llm_provider, memory)

    def _get_default_system_prompt(self) -> str:
        """Return system prompt for conversation agent."""
        return """You are COLLABRY, a helpful AI study assistant.

Provide clear, educational responses that help students learn effectively.

Guidelines:
- Break down complex concepts into digestible parts
- Use examples and analogies when appropriate
- Encourage critical thinking with follow-up questions
- Be encouraging and supportive
- Keep responses concise but thorough
- Focus on teaching, not just answering

Your goal is to help students truly understand, not just memorize."""

    def execute(self, user_input: str, context: Optional[str] = None) -> str:
        """
        Generate conversational response (non-streaming).

        Args:
            user_input: User message
            context: Optional additional context (RAG results, etc.)

        Returns:
            Response string
        """
        response_parts = []
        for chunk in self.execute_stream(user_input, context):
            response_parts.append(chunk)
        return "".join(response_parts)

    def execute_stream(
        self,
        user_input: str,
        context: Optional[str] = None
    ) -> Iterator[str]:
        """
        Generate conversational response with streaming.

        Args:
            user_input: User message
            context: Optional additional context

        Yields:
            Response tokens as they are generated
        """
        logger.info("Generating conversational response")

        # Build messages with history and context
        messages = self._build_messages(user_input, context)

        # Stream response
        full_response = ""
        try:
            for token in self.llm_provider.stream(messages):
                full_response += token
                yield token

            # Save to memory
            self._save_to_memory(user_input, full_response)

            logger.info("Conversational response complete")

        except Exception as e:
            logger.exception("Conversation agent failed")
            error_msg = "I encountered an error generating a response. Please try again."
            yield error_msg
            self._save_to_memory(user_input, error_msg)
