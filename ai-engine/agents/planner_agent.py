"""
Planner Agent - Main Orchestration Agent.

This agent is responsible for:
- Deciding whether to use tools or respond directly
- Executing tool loops (max 5 iterations)
- Maintaining reasoning state across iterations
- Streaming final responses to users

The planner uses structured JSON output to make decisions, ensuring
reliable execution and avoiding natural language parsing errors.
"""

from typing import Optional, Iterator, Dict, Any, List
from agents.base_agent import BaseAgent
from llm.base_provider import BaseLLMProvider, Message
from core.schemas import AgentAction
from tools.registry import tool_registry
from core.memory import MemoryManager
import json
import logging

logger = logging.getLogger(__name__)


class PlannerAgent(BaseAgent):
    """
    Main orchestration agent with tool execution loop.

    Flow:
    1. User message → Build context
    2. LLM decision (structured JSON)
    3. If use_tool → Execute → Add to context → Loop (max 5 iterations)
    4. If respond → Stream final answer → Save to memory → Done

    The planner ensures that:
    - Tools are called when needed (RAG search, artifact generation)
    - Responses use appropriate context
    - Execution doesn't loop infinitely
    - Final responses are streamed token-by-token
    """

    MAX_ITERATIONS = 5  # Maximum tool execution loops

    def __init__(
        self,
        llm_provider: BaseLLMProvider,
        memory: Optional[MemoryManager] = None,
        rag_retriever=None,
        notebook_service=None
    ):
        """
        Initialize planner agent.

        Args:
            llm_provider: LLM provider for generation
            memory: Optional memory manager
            rag_retriever: RAG retriever for document search
            notebook_service: Service for notebook/source operations
        """
        super().__init__(llm_provider, memory)
        self.rag_retriever = rag_retriever
        self.notebook_service = notebook_service

        # Initialize tools with dependencies
        self._initialize_tools()

    def _initialize_tools(self):
        """
        Initialize and register tools with dependencies.

        This is called during agent initialization to set up the tool registry
        with all required dependencies injected.

        NOTE: Artifact generation is handled by IntentRouter, not PlannerAgent.
        """
        try:
            from tools.rag_search import get_tool as get_rag_tool
            from tools.get_sources import get_tool as get_sources_tool

            # Register conversational tools only (no artifact generation)
            if self.rag_retriever:
                tool_registry.register(get_rag_tool(self.rag_retriever))
                logger.info("Registered RAG search tool")

            if self.notebook_service:
                tool_registry.register(get_sources_tool(self.notebook_service))
                logger.info("Registered get sources tool")

            logger.info(f"Tool registry initialized with {len(tool_registry.get_all_tools())} tools")

        except Exception as e:
            logger.error(f"Failed to initialize tools: {e}")
            # Continue without tools rather than failing

    def _get_default_system_prompt(self) -> str:
        """Return system prompt for planner agent."""
        return """You are COLLABRY, an AI study assistant.

Your task is to help students learn effectively by:
- Answering questions about their study materials
- Searching through their uploaded documents
- Providing pedagogical guidance
- Explaining concepts clearly and thoroughly

CRITICAL: You must respond with ONLY valid JSON in this exact format:

{
  "action": "respond" or "use_tool",
  "tool_name": "tool_name" or null,
  "tool_input": {"arg": "value"} or null,
  "response": "your response text" or null,
  "reasoning": "internal reasoning (optional)"
}

Rules for decision-making:
- If user asks about their uploaded documents/PDFs/notes, use "rag_search" tool first
- If user asks what files they have, use "get_sources" tool
- If you have enough context to answer, use "respond" action directly
- Never output natural language outside the JSON structure
- Always include reasoning to explain your decision

NOTE: Artifact generation (quizzes, flashcards, mindmaps) is handled separately.
Do not attempt to generate artifacts - focus on conversational help.

Available tools will be provided in function definitions."""

    def execute(
        self,
        user_input: str,
        source_ids: Optional[List[str]] = None,
        session_id: Optional[str] = None
    ) -> str:
        """
        Execute planner agent (non-streaming).

        Args:
            user_input: User message
            source_ids: Optional source IDs to filter RAG search
            session_id: Optional session ID for context

        Returns:
            Final response as string
        """
        response_parts = []
        for chunk in self.execute_stream(user_input, source_ids, session_id):
            response_parts.append(chunk)
        return "".join(response_parts)

    def execute_stream(
        self,
        user_input: str,
        source_ids: Optional[List[str]] = None,
        session_id: Optional[str] = None
    ) -> Iterator[str]:
        """
        Execute planner agent with streaming final response.

        This is the main agent loop. It:
        1. Builds initial messages with conversation history
        2. Enters decision loop (max MAX_ITERATIONS)
        3. Gets LLM decision in structured JSON format
        4. Executes tools if needed, adding results to context
        5. Streams final response when ready
        6. Saves conversation to memory

        Args:
            user_input: User message
            source_ids: Optional source IDs for RAG filtering
            session_id: Optional session ID

        Yields:
            Response tokens as they are generated
        """
        # Initialize conversation context
        tool_results = []
        messages = self._build_messages(user_input)

        # Agent decision loop
        for iteration in range(self.MAX_ITERATIONS):
            logger.info(f"Planner iteration {iteration + 1}/{self.MAX_ITERATIONS}")

            # Add tool results to context if any exist
            if tool_results:
                tool_context = self._format_tool_results(tool_results)
                messages.append(Message(
                    role="system",
                    content=f"Tool execution results:\n{tool_context}"
                ))

            # Get tool definitions for LLM
            tool_definitions = tool_registry.get_tool_definitions()

            # Call LLM with structured output (JSON mode)
            try:
                response = self.llm_provider.generate(
                    messages=messages,
                    tools=tool_definitions,
                    response_format={"type": "json_object"}
                )

                # Parse structured output
                action = self._parse_agent_action(response.content)
                action.validate_consistency()

                logger.info(f"Agent decision: {action.action}, tool: {action.tool_name}")

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.error(f"LLM response was: {response.content[:500]}")
                yield f"I encountered an error understanding my own decision. Please try rephrasing your question."
                return

            except Exception as e:
                logger.exception("Agent decision failed")
                yield f"I encountered an error processing your request: {str(e)}"
                return

            # Handle action
            if action.action == "use_tool":
                # Execute tool
                logger.info(f"Executing tool: {action.tool_name}")

                result = tool_registry.execute(
                    action.tool_name,
                    **action.tool_input
                )

                tool_results.append({
                    "tool": action.tool_name,
                    "input": action.tool_input,
                    "result": result
                })

                # Check if tool failed
                if not result.get("success"):
                    error_msg = result.get("error", "Unknown error")
                    logger.warning(f"Tool {action.tool_name} failed: {error_msg}")
                    # Continue loop to let agent handle the error

                # Continue loop with tool result
                continue

            elif action.action == "respond":
                # Final response - stream it with the actual response text
                logger.info("Generating final response")

                # Use the response from the action directly
                final_response = action.response

                # Stream the response
                for char in final_response:
                    yield char

                # Save to memory
                self._save_to_memory(user_input, final_response)

                logger.info("Planner execution complete")
                return

        # Max iterations reached
        logger.warning(f"Reached max iterations ({self.MAX_ITERATIONS})")
        yield "I've reached my processing limit. Could you rephrase your request more simply?"

    def _parse_agent_action(self, json_content: str) -> AgentAction:
        """
        Parse LLM JSON output into AgentAction.

        Args:
            json_content: JSON string from LLM

        Returns:
            AgentAction object

        Raises:
            json.JSONDecodeError: If JSON is invalid
            ValueError: If JSON doesn't match schema
        """
        try:
            data = json.loads(json_content)
            return AgentAction(**data)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON from LLM: {json_content[:200]}")
            raise
        except Exception as e:
            logger.error(f"Failed to parse AgentAction: {e}")
            raise ValueError(f"Invalid agent action format: {e}")

    def _format_tool_results(self, tool_results: List[Dict]) -> str:
        """
        Format tool execution results for context.

        Args:
            tool_results: List of tool execution results

        Returns:
            Formatted string for context injection
        """
        formatted = []
        for tr in tool_results:
            result_str = json.dumps(tr["result"], indent=2)
            formatted.append(
                f"Tool: {tr['tool']}\n"
                f"Input: {json.dumps(tr['input'])}\n"
                f"Result: {result_str}\n"
            )
        return "\n---\n".join(formatted)
