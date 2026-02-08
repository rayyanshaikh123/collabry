"""
Get Sources Tool.

This tool enables the agent to retrieve metadata about the user's uploaded
sources (documents, PDFs, notes, websites). Useful when the user asks
"what files do I have?" or "show my sources".
"""

from tools.base_tool import BaseTool
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class GetSourcesTool(BaseTool):
    """
    Retrieve metadata about user's uploaded sources.

    This tool provides information about all documents the user has uploaded
    to their notebook/session, including:
    - Source IDs
    - Source types (PDF, text, website, note)
    - Source names/titles
    - Summary information

    This is helpful for:
    - Answering "what files do I have?"
    - Listing available sources for RAG search
    - Understanding what content is available

    Usage by LLM:
        When user asks: "What documents have I uploaded?"
        Agent should call: get_sources(session_id="session_id")
    """

    def __init__(self, notebook_service=None):
        """
        Initialize get sources tool.

        Args:
            notebook_service: Service for accessing notebook/source data
                             If None, tool will not function
        """
        self.name = "get_sources"
        self.description = (
            "Get information about user's uploaded sources (PDFs, notes, websites). "
            "Use when user asks 'what files do I have?', 'show my sources', or "
            "'list my documents'. Returns metadata about available sources."
        )
        self.parameters_schema = {
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "Session/notebook ID to get sources from"
                }
            },
            "required": ["session_id"]
        }

        self.notebook_service = notebook_service

    def execute(self, session_id: str) -> Dict[str, Any]:
        """
        Execute source retrieval.

        Args:
            session_id: Session/notebook ID to retrieve sources from

        Returns:
            {
                "success": bool,
                "data": {
                    "sources": [
                        {
                            "id": str,
                            "type": str,  # "pdf", "text", "website", "note"
                            "name": str,
                            "summary": str
                        },
                        ...
                    ],
                    "count": int
                },
                "error": None or str
            }
        """
        if not self.notebook_service:
            logger.error("Get sources tool called but notebook_service not initialized")
            return {
                "success": False,
                "data": None,
                "error": "Notebook service not available - tool not properly initialized"
            }

        try:
            logger.info(f"Retrieving sources for session: {session_id}")

            # Get sources from notebook service
            sources = self.notebook_service.get_sources(session_id)

            # Format sources for response
            formatted_sources = []
            for source in sources:
                source_data = {
                    "id": source.get("id") or source.get("_id"),
                    "type": source.get("type", "unknown"),
                    "name": source.get("name") or source.get("title", "Untitled"),
                    "summary": source.get("summary", "No summary available")
                }
                formatted_sources.append(source_data)

            logger.info(f"Found {len(formatted_sources)} sources for session {session_id}")

            return {
                "success": True,
                "data": {
                    "sources": formatted_sources,
                    "count": len(formatted_sources)
                },
                "error": None,
                "metadata": {
                    "session_id": session_id
                }
            }

        except Exception as e:
            logger.exception("Get sources failed")
            return {
                "success": False,
                "data": None,
                "error": f"Failed to retrieve sources: {str(e)}",
                "metadata": {"exception_type": type(e).__name__}
            }


def get_tool(notebook_service=None):
    """
    Factory function for tool discovery.

    Args:
        notebook_service: Service for accessing notebook data

    Returns:
        GetSourcesTool instance
    """
    return GetSourcesTool(notebook_service)
