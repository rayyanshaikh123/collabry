"""
RAG Retriever - LangChain retriever with metadata filtering.

Creates retrievers filtered by user_id and notebook_id for secure multi-tenant RAG.
"""

from typing import Optional
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from rag.vectorstore import get_vectorstore, similarity_search


class FilteredRetriever(BaseRetriever):
    """Retriever with user and notebook filtering."""
    
    user_id: str
    notebook_id: Optional[str] = None
    k: int = 4
    
    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: Optional[CallbackManagerForRetrieverRun] = None
    ) -> list[Document]:
        """Get documents relevant to query with filtering."""
        return similarity_search(
            query=query,
            user_id=self.user_id,
            notebook_id=self.notebook_id,
            k=self.k
        )


def get_retriever(
    user_id: str,
    notebook_id: Optional[str] = None,
    k: int = 4
) -> BaseRetriever:
    """
    Get retriever filtered by user and notebook.
    
    Args:
        user_id: User identifier (required for security)
        notebook_id: Optional notebook filter
        k: Number of results to return
    
    Returns:
        LangChain retriever instance
        
    Example:
        >>> retriever = get_retriever(user_id="user123", notebook_id="bio101")
        >>> docs = retriever.get_relevant_documents("photosynthesis")
    """
    return FilteredRetriever(
        user_id=user_id,
        notebook_id=notebook_id,
        k=k
    )
