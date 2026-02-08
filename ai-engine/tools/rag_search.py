"""
RAG Search Tool.

This tool enables the agent to search through uploaded user documents
using Retrieval Augmented Generation (RAG) with semantic similarity search.
"""

from tools.base_tool import BaseTool
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)


class RAGSearchTool(BaseTool):
    """
    Search user's uploaded documents using RAG retrieval.

    This tool performs semantic similarity search over the user's document
    collection. It's essential for answering questions about uploaded content,
    PDFs, notes, and websites.

    The tool:
    1. Embeds the search query
    2. Performs vector similarity search
    3. Filters by user_id, session_id, and optional source_ids
    4. Returns the most relevant document chunks

    Usage by LLM:
        When user asks: "What does my PDF say about photosynthesis?"
        Agent should call: rag_search(query="photosynthesis", top_k=3)
    """

    def __init__(self, rag_retriever=None):
        """
        Initialize RAG search tool.

        Args:
            rag_retriever: RAGRetriever instance (from core.rag_retriever)
                          If None, tool will not function (but can be registered)
        """
        self.name = "rag_search"
        self.description = (
            "Search through user's uploaded documents (PDFs, notes, websites) "
            "to find relevant information. Use this when the user asks about "
            "content from their sources or needs context from their materials. "
            "Returns relevant document chunks based on semantic similarity."
        )
        self.parameters_schema = {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query to find relevant document chunks"
                },
                "top_k": {
                    "type": "integer",
                    "description": "Number of results to return (default: 3, max: 10)",
                    "default": 3,
                    "minimum": 1,
                    "maximum": 10
                },
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: Filter by specific source IDs (document IDs)"
                }
            },
            "required": ["query"]
        }

        self.rag_retriever = rag_retriever

    def execute(
        self,
        query: str,
        top_k: int = 3,
        source_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Execute RAG search.

        Args:
            query: Search query string
            top_k: Number of results to return (1-10)
            source_ids: Optional list of source IDs to filter by

        Returns:
            {
                "success": bool,
                "data": {
                    "documents": [
                        {
                            "content": str,
                            "metadata": dict,
                            "source": str
                        },
                        ...
                    ],
                    "count": int
                },
                "error": None or str
            }
        """
        if not self.rag_retriever:
            logger.error("RAG search tool called but rag_retriever not initialized")
            return {
                "success": False,
                "data": None,
                "error": "RAG retriever not available - tool not properly initialized"
            }

        # Validate top_k
        top_k = max(1, min(10, top_k))

        try:
            logger.info(f"Executing RAG search: query='{query[:50]}...', top_k={top_k}")

            # Perform retrieval
            documents = self.rag_retriever.get_relevant_documents(
                query=query,
                source_ids=source_ids,
                k=top_k
            )

            # Format results
            results = []
            for doc in documents:
                doc_data = {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "source": doc.metadata.get("source", "unknown")
                }
                results.append(doc_data)

            logger.info(f"RAG search found {len(results)} relevant documents")

            return {
                "success": True,
                "data": {
                    "documents": results,
                    "count": len(results),
                    "query": query
                },
                "error": None,
                "metadata": {
                    "top_k_requested": top_k,
                    "source_ids_filtered": source_ids is not None
                }
            }

        except Exception as e:
            logger.exception("RAG search failed")
            return {
                "success": False,
                "data": None,
                "error": f"RAG search failed: {str(e)}",
                "metadata": {"exception_type": type(e).__name__}
            }


def get_tool(rag_retriever=None):
    """
    Factory function for tool discovery.

    This function is called by the ToolRegistry to create the tool instance.

    Args:
        rag_retriever: RAGRetriever instance with dependencies injected

    Returns:
        RAGSearchTool instance
    """
    return RAGSearchTool(rag_retriever)
