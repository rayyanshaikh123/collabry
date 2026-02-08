"""
Search Sources Tool - RAG retrieval from user's documents.

This tool searches the user's uploaded documents and notes
for relevant information to answer their questions.
"""

from typing import Optional
from langchain_core.tools import tool
from rag.retriever import get_retriever
from langchain_core.documents import Document


def format_sources(docs: list[Document]) -> str:
    """Format retrieved documents with source citations."""
    if not docs:
        return "No relevant information found in your documents."
    
    formatted = "Here's what I found in your documents:\n\n"
    
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "Unknown source")
        chunk_idx = doc.metadata.get("chunk_index", "")
        
        formatted += f"**Source {i}** ({source}):\n"
        formatted += f"{doc.page_content}\n\n"
    
    return formatted.strip()


@tool
def search_sources(query: str, user_id: str, notebook_id: Optional[str] = None) -> str:
    """
    Search user's uploaded documents and notes for relevant information.
    
    Use this tool when the user asks about their notes, study materials,
    uploaded PDFs, or previously studied content.
    
    Examples of when to use:
    - "What did I learn about photosynthesis?"
    - "Find information about the French Revolution in my notes"
    - "What does my biology textbook say about DNA?"
    
    Args:
        query: The search query
        user_id: User identifier (injected by agent)
        notebook_id: Optional notebook to search within
    
    Returns:
        Relevant text excerpts with source citations
    """
    try:
        # Get retriever with user and notebook filtering
        retriever = get_retriever(
            user_id=user_id,
            notebook_id=notebook_id,
            k=4
        )
        
        # Retrieve relevant documents
        docs = retriever.get_relevant_documents(query)
        
        # Format and return
        return format_sources(docs)
    
    except Exception as e:
        return f"Error searching documents: {str(e)}"
