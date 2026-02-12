"""
Vector Store Client - Provider-agnostic vector database.

Supports multiple vector databases:
- FAISS (local, simple)
- Chroma (local/cloud, open source)
- Pinecone (cloud, production)
- Qdrant (local/cloud, open source)

All vector stores support metadata filtering by user_id and notebook_id.
"""

import os
from typing import Optional, List, Dict, Any
from langchain_core.vectorstores import VectorStore
from langchain_core.documents import Document
from core.embeddings import get_embedding_client


class VectorStoreConfig:
    """Configuration for vector store."""
    
    def __init__(self):
        self.provider = os.getenv("VECTOR_STORE", "faiss").lower()
        
        # FAISS config
        self.faiss_index_path = os.getenv("FAISS_INDEX_PATH", "./data/faiss_index")
        
        # Chroma config
        self.chroma_host = os.getenv("CHROMA_HOST", "localhost")
        self.chroma_port = int(os.getenv("CHROMA_PORT", "8000"))
        self.chroma_persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")
        self.chroma_collection = os.getenv("CHROMA_COLLECTION", "documents")
        
        # Pinecone config
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_environment = os.getenv("PINECONE_ENVIRONMENT", "us-west-2")
        self.pinecone_index = os.getenv("PINECONE_INDEX", "study-assistant")
        
        # Qdrant config
        self.qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        self.qdrant_collection = os.getenv("QDRANT_COLLECTION", "documents")
    
    def __repr__(self):
        return f"VectorStoreConfig(provider={self.provider})"


def _create_faiss_store() -> VectorStore:
    """Create or load FAISS vector store."""
    from langchain_community.vectorstores import FAISS
    import os
    
    config = VectorStoreConfig()
    embeddings = get_embedding_client()
    
    # Check if index exists
    if os.path.exists(os.path.join(config.faiss_index_path, "index.faiss")):
        # Load existing index
        return FAISS.load_local(
            config.faiss_index_path,
            embeddings,
            allow_dangerous_deserialization=True
        )
    else:
        # Create new empty index
        # Initialize with a dummy document
        dummy_doc = Document(
            page_content="Initialization document",
            metadata={"user_id": "system", "notebook_id": "system"}
        )
        store = FAISS.from_documents([dummy_doc], embeddings)
        
        # Save to disk
        os.makedirs(config.faiss_index_path, exist_ok=True)
        store.save_local(config.faiss_index_path)
        
        return store


def _create_chroma_store() -> VectorStore:
    """Create or load Chroma vector store."""
    from langchain_community.vectorstores import Chroma
    
    config = VectorStoreConfig()
    embeddings = get_embedding_client()
    
    return Chroma(
        collection_name=config.chroma_collection,
        embedding_function=embeddings,
        persist_directory=config.chroma_persist_dir
    )


def _create_pinecone_store() -> VectorStore:
    """Create Pinecone vector store."""
    from langchain_pinecone import PineconeVectorStore
    from pinecone import Pinecone
    
    config = VectorStoreConfig()
    embeddings = get_embedding_client()
    
    # Initialize Pinecone
    pc = Pinecone(api_key=config.pinecone_api_key)
    
    # Check if index exists, create if not
    if config.pinecone_index not in pc.list_indexes().names():
        pc.create_index(
            name=config.pinecone_index,
            dimension=1536,  # Adjust based on embedding model
            metric="cosine"
        )
    
    return PineconeVectorStore(
        index_name=config.pinecone_index,
        embedding=embeddings
    )


def _create_qdrant_store() -> VectorStore:
    """Create Qdrant vector store."""
    from langchain_community.vectorstores import Qdrant
    from qdrant_client import QdrantClient
    
    config = VectorStoreConfig()
    embeddings = get_embedding_client()
    
    client = QdrantClient(
        url=config.qdrant_url,
        api_key=config.qdrant_api_key
    )
    
    return Qdrant(
        client=client,
        collection_name=config.qdrant_collection,
        embeddings=embeddings
    )


# Singleton instance
_vectorstore: Optional[VectorStore] = None


def get_vectorstore() -> VectorStore:
    """
    Get vector store client based on configuration.
    
    Returns:
        LangChain VectorStore instance
        
    Environment Variables:
        VECTOR_STORE: faiss | chroma | pinecone | qdrant
        
    Examples:
        # FAISS (local, simple)
        VECTOR_STORE=faiss
        FAISS_INDEX_PATH=./data/faiss_index
        
        # Chroma (local)
        VECTOR_STORE=chroma
        CHROMA_PERSIST_DIR=./data/chroma_db
        
        # Pinecone (cloud)
        VECTOR_STORE=pinecone
        PINECONE_API_KEY=...
        PINECONE_INDEX=study-assistant
        
        # Qdrant (cloud)
        VECTOR_STORE=qdrant
        QDRANT_URL=https://...
        QDRANT_API_KEY=...
    """
    global _vectorstore
    
    if _vectorstore is None:
        config = VectorStoreConfig()
        
        if config.provider == "faiss":
            _vectorstore = _create_faiss_store()
        
        elif config.provider == "chroma":
            _vectorstore = _create_chroma_store()
        
        elif config.provider == "pinecone":
            _vectorstore = _create_pinecone_store()
        
        elif config.provider == "qdrant":
            _vectorstore = _create_qdrant_store()
        
        else:
            raise ValueError(
                f"Unknown vector store provider: {config.provider}. "
                f"Supported: faiss, chroma, pinecone, qdrant"
            )
    
    return _vectorstore


def add_documents(
    documents: List[Document],
    user_id: str,
    notebook_id: str
) -> List[str]:
    """
    Add documents to vector store with user and notebook metadata.
    
    Args:
        documents: List of LangChain Document objects
        user_id: User identifier
        notebook_id: Notebook identifier
    
    Returns:
        List of document IDs
    """
    vectorstore = get_vectorstore()
    
    # Add metadata to all documents
    for doc in documents:
        doc.metadata["user_id"] = user_id
        doc.metadata["notebook_id"] = notebook_id
    
    # Add to vector store
    ids = vectorstore.add_documents(documents)
    
    # Save FAISS index if using FAISS
    config = VectorStoreConfig()
    if config.provider == "faiss":
        vectorstore.save_local(config.faiss_index_path)
    
    return ids


def similarity_search(
    query: str,
    user_id: str,
    notebook_id: Optional[str] = None,
    source_ids: Optional[List[str]] = None,
    k: int = 4
) -> List[Document]:
    """
    Search for similar documents with metadata filtering.
    
    Args:
        query: Search query
        user_id: User identifier (required for isolation)
        notebook_id: Optional notebook filter
        k: Number of results to return
    
    Returns:
        List of relevant documents
    """
    vectorstore = get_vectorstore()
    
    # Build metadata filter
    filter_dict = {"user_id": user_id}
    if notebook_id:
        filter_dict["notebook_id"] = notebook_id
    
    # Search with filter
    # Note: FAISS doesn't support native filtering, so we'll post-filter
    config = VectorStoreConfig()
    
    if config.provider == "faiss":
        # FAISS: search more results and filter in memory.
        # When filtering by source_ids, over-retrieve significantly.
        search_k = k * (100 if source_ids else 5)
        results = vectorstore.similarity_search(query, k=search_k)
        
        # Post-filter by metadata
        filtered = []
        for doc in results:
            if doc.metadata.get("user_id") != user_id:
                continue
            if notebook_id and doc.metadata.get("notebook_id") != notebook_id:
                continue
            
            # Source filtering: Match either source_id or filename (source)
            if source_ids:
                # Harden: Coerce both filter and metadata to strings to avoid type mismatch (int vs str)
                str_source_ids = [str(sid) for sid in source_ids]
                doc_source_id = str(doc.metadata.get("source_id")) if doc.metadata.get("source_id") is not None else None
                doc_filename = str(doc.metadata.get("source")) if doc.metadata.get("source") is not None else None
                
                if doc_source_id not in str_source_ids and doc_filename not in str_source_ids:
                    continue
            
            filtered.append(doc)
            if len(filtered) >= k:
                break
        
        return filtered
    
    else:
        # Other stores support native filtering for user/notebook isolation.
        search_k = k * 50 if source_ids else k
        results = vectorstore.similarity_search(query, k=search_k, filter=filter_dict)
        if not source_ids:
            return results[:k]
        
        # Standardize source filtering across providers by post-filtering the search results
        filtered = []
        for doc in results:
            doc_source_id = doc.metadata.get("source_id")
            doc_filename = doc.metadata.get("source")
            if doc_source_id in source_ids or doc_filename in source_ids:
                filtered.append(doc)
            if len(filtered) >= k:
                break
        return filtered


def reset_vectorstore():
    """Reset vector store singleton. Useful for testing."""
    global _vectorstore
    _vectorstore = None
