"""
Agent System - Orchestration and Execution Layer.

This package provides specialized agents for different tasks:
- BaseAgent: Abstract base class for all agents
- PlannerAgent: Main orchestration agent with tool loop
- ConversationAgent: Direct conversational responses
- ArtifactAgent: Learning artifact generation

Usage:
    from agents import PlannerAgent
    from llm import create_llm_provider
    from config import CONFIG

    llm = create_llm_provider(
        provider_type=CONFIG["llm_provider"],
        model=CONFIG["llm_model"]
    )
    agent = PlannerAgent(llm)

    response = agent.execute("What is photosynthesis?")
"""

from agents.base_agent import BaseAgent

__all__ = [
    "BaseAgent"
]

__version__ = "1.0.0"
