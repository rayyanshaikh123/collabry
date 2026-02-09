"""
Tool Registry - LangChain tools for the study assistant.

All tools follow the LangChain @tool decorator pattern.
Tools are automatically discovered and registered with the agent.
"""

from tools.search_sources import search_sources
from tools.summarize import summarize_notes
from tools.generate_quiz import generate_quiz
from tools.generate_flashcards import generate_flashcards

# Optional tools (may not be needed for core functionality)
# from tools.web_search import web_search


# All tools available to the agent
ALL_TOOLS = [
    search_sources,
    summarize_notes,
    generate_quiz,
    generate_flashcards,
]


def get_tools(user_id: str, notebook_id: str = None):
    """
    Get tools with context injection.
    
    Args:
        user_id: User identifier to inject into tool context
        notebook_id: Optional notebook identifier
    
    Returns:
        List of tools with context bound
    """
    # For now, return tools as-is
    # Context injection will be handled in agent.py
    return ALL_TOOLS


__all__ = [
    'ALL_TOOLS',
    'get_tools',
    'search_sources',
    'summarize_notes',
    'generate_quiz',
    'generate_flashcards',
]
