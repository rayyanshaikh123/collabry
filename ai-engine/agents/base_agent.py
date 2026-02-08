"""
Base Agent Class.

This module defines the abstract base class that all agents must inherit from,
providing common functionality for LLM interaction, memory management, and
message building.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from llm.base_provider import BaseLLMProvider, Message
from core.memory import MemoryManager
import logging

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Abstract base class for all agents.

    Each agent has:
    - LLM provider for text generation
    - Optional memory manager for conversation history
    - System prompt defining agent behavior
    - Common utilities for message building

    Subclasses must implement:
    - _get_default_system_prompt(): Return the agent's system prompt
    - execute(): Main agent logic

    Example:
        class MyAgent(BaseAgent):
            def _get_default_system_prompt(self) -> str:
                return "You are a helpful assistant."

            def execute(self, user_input: str, **kwargs) -> str:
                messages = self._build_messages(user_input)
                response = self.llm_provider.generate(messages)
                return response.content
    """

    def __init__(
        self,
        llm_provider: BaseLLMProvider,
        memory: Optional[MemoryManager] = None,
        system_prompt: Optional[str] = None
    ):
        """
        Initialize base agent.

        Args:
            llm_provider: LLM provider for generation
            memory: Optional memory manager for conversation history
            system_prompt: Optional custom system prompt (uses default if not provided)
        """
        self.llm_provider = llm_provider
        self.memory = memory
        self.system_prompt = system_prompt or self._get_default_system_prompt()

        logger.info(f"Initialized {self.__class__.__name__}")

    @abstractmethod
    def _get_default_system_prompt(self) -> str:
        """
        Return default system prompt for this agent.

        This defines the agent's behavior, personality, and capabilities.

        Returns:
            System prompt string
        """
        pass

    @abstractmethod
    def execute(self, user_input: str, **kwargs) -> str:
        """
        Execute agent logic.

        This is the main entry point for agent execution. Subclasses
        must implement their specific logic here.

        Args:
            user_input: User message to process
            **kwargs: Agent-specific parameters

        Returns:
            Agent response as string
        """
        pass

    def _build_messages(
        self,
        user_input: str,
        context: Optional[str] = None
    ) -> List[Message]:
        """
        Build message list for LLM from conversation history.

        Format:
        1. System prompt
        2. Conversation history from memory (if available)
        3. Optional context (RAG results, tool output, etc.)
        4. Current user input

        Args:
            user_input: Current user message
            context: Optional additional context to inject

        Returns:
            List of Message objects ready for LLM
        """
        messages = [Message(role="system", content=self.system_prompt)]

        # Add conversation history from memory
        if self.memory:
            try:
                history = self.memory.load_memory_variables({})
                if history and "history" in history:
                    history_messages = self._parse_history(history["history"])
                    messages.extend(history_messages)
                    logger.debug(f"Loaded {len(history_messages)} messages from memory")
            except Exception as e:
                logger.warning(f"Failed to load memory: {e}")
                # Continue without memory rather than failing

        # Add context if provided (tool results, RAG documents, etc.)
        if context:
            messages.append(Message(
                role="system",
                content=f"Context information:\n{context}"
            ))

        # Add current user input
        messages.append(Message(role="user", content=user_input))

        logger.debug(f"Built {len(messages)} messages for LLM")
        return messages

    def _parse_history(self, history: List[Dict]) -> List[Message]:
        """
        Convert memory history to Message list.

        Memory format:
        [
            {"user": "...", "assistant": "..."},
            {"user": "...", "assistant": "..."},
            ...
        ]

        Converts to:
        [
            Message(role="user", content="..."),
            Message(role="assistant", content="..."),
            ...
        ]

        Args:
            history: List of conversation turns from memory

        Returns:
            List of Message objects
        """
        messages = []

        for turn in history:
            if isinstance(turn, dict):
                if "user" in turn and turn["user"]:
                    messages.append(Message(role="user", content=turn["user"]))
                if "assistant" in turn and turn["assistant"]:
                    messages.append(Message(role="assistant", content=turn["assistant"]))

        return messages

    def _save_to_memory(self, user_input: str, assistant_response: str):
        """
        Save conversation turn to memory.

        Args:
            user_input: User message
            assistant_response: Assistant response
        """
        if self.memory:
            try:
                self.memory.save_context(
                    {"user": user_input},
                    {"assistant": assistant_response}
                )
                logger.debug("Saved conversation turn to memory")
            except Exception as e:
                logger.error(f"Failed to save to memory: {e}")
                # Don't fail the entire agent execution if memory save fails

    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"<{self.__class__.__name__}("
            f"provider={self.llm_provider.__class__.__name__}, "
            f"memory={'yes' if self.memory else 'no'})>"
        )
