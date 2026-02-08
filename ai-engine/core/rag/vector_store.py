"""
FAISS Vector Store - LangChain-Free Implementation.

This module provides vector storage and similarity search using FAISS
without any LangChain dependencies. It maintains user isolation through
metadata filtering.
"""

from typing import List, Dict, Any, Optional
import faiss
import numpy as np
import pickle
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class Document:
    """
    Simple document class (replaces LangChain Document).

    Attributes:
        page_content: Text content of the document
        metadata: Dictionary of metadata (user_id, source_id, page, etc.)
    """

    def __init__(self, page_content: str, metadata: Dict[str, Any] = None):
        self.page_content = page_content
        self.metadata = metadata or {}

    def __repr__(self) -> str:
        return f"<Document(content_length={len(self.page_content)}, metadata={self.metadata})>"


class FAISSVectorStore:
    """
    FAISS-based vector store without LangChain.

    Features:
    - User isolation via metadata filtering
    - Session-based filtering
    - Source ID filtering
    - Persistent storage (save/load)
    - Efficient similarity search

    This implementation maintains compatibility with the existing RAG system
    while removing LangChain dependency.
    """

    def __init__(self, embedding_provider, dimension: int = 384):
        """
        Initialize FAISS vector store.

        Args:
            embedding_provider: Provider for generating embeddings
            dimension: Embedding dimension (default: 384 for all-MiniLM-L6-v2)
        """
        self.embedding_provider = embedding_provider
        self.dimension = dimension
        self.index = faiss.IndexFlatL2(dimension)
        self.documents: List[Document] = []

        logger.info(f"Initialized FAISS vector store (dimension={dimension})")

    def add_documents(self, documents: List[Document]):
        """
        Add documents to vector store.

        Args:
            documents: List of Document objects to add
        """
        if not documents:
            logger.warning("No documents to add")
            return

        # Generate embeddings for all documents
        texts = [doc.page_content for doc in documents]
        embeddings = self.embedding_provider.embed_documents(texts)

        # Add to FAISS index
        embeddings_np = np.array(embeddings).astype('float32')
        self.index.add(embeddings_np)

        # Store documents
        self.documents.extend(documents)

        logger.info(f"Added {len(documents)} documents (total: {len(self.documents)})")

    def similarity_search(
        self,
        query: str,
        k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        """
        Search for similar documents.

        Args:
            query: Search query string
            k: Number of results to return
            filter_metadata: Metadata filters to apply:
                - user_id: Filter by user
                - session_id: Filter by session
                - source_ids: Filter by list of source IDs

        Returns:
            List of relevant Document objects
        """
        if len(self.documents) == 0:
            logger.warning("Vector store is empty")
            return []

        # Embed query
        query_embedding = self.embedding_provider.embed_query(query)
        query_np = np.array([query_embedding]).astype('float32')

        # Search with over-retrieval (for filtering)
        search_k = min(k * 50, len(self.documents))
        distances, indices = self.index.search(query_np, search_k)

        # Get documents and apply filters
        results = []
        for idx in indices[0]:
            if idx < len(self.documents):
                doc = self.documents[idx]

                # Apply metadata filters
                if filter_metadata and not self._matches_filter(doc, filter_metadata):
                    continue

                results.append(doc)

                if len(results) >= k:
                    break

        logger.info(f"Similarity search returned {len(results)} results (requested {k})")
        return results

    def _matches_filter(self, doc: Document, filters: Dict[str, Any]) -> bool:
        """
        Check if document matches metadata filters.

        Args:
            doc: Document to check
            filters: Filter conditions

        Returns:
            True if document matches all filters
        """
        for key, value in filters.items():
            if key == "source_ids":
                # Special handling for source ID list
                if "source_id" not in doc.metadata:
                    return False
                if doc.metadata["source_id"] not in value:
                    return False
            else:
                # Exact match for other fields
                if doc.metadata.get(key) != value:
                    return False

        return True

    def save(self, filepath: str):
        """
        Save index and documents to disk.

        Creates two files:
        - {filepath}.index: FAISS index
        - {filepath}.docs: Pickled documents

        Args:
            filepath: Base path for saving (without extension)
        """
        try:
            # Ensure directory exists
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)

            # Save FAISS index
            faiss.write_index(self.index, f"{filepath}.index")

            # Save documents
            with open(f"{filepath}.docs", 'wb') as f:
                pickle.dump(self.documents, f)

            logger.info(f"Saved vector store to {filepath}")

        except Exception as e:
            logger.exception("Failed to save vector store")
            raise

    @classmethod
    def load(cls, filepath: str, embedding_provider):
        """
        Load index and documents from disk.

        Args:
            filepath: Base path for loading (without extension)
            embedding_provider: Provider for embeddings

        Returns:
            FAISSVectorStore instance with loaded data
        """
        try:
            # Load FAISS index
            index = faiss.read_index(f"{filepath}.index")

            # Load documents
            with open(f"{filepath}.docs", 'rb') as f:
                documents = pickle.load(f)

            # Create store and populate
            dimension = index.d
            store = cls(embedding_provider, dimension)
            store.index = index
            store.documents = documents

            logger.info(f"Loaded vector store from {filepath} ({len(documents)} docs)")
            return store

        except FileNotFoundError:
            logger.warning(f"Vector store files not found at {filepath}, creating new")
            return cls(embedding_provider)

        except Exception as e:
            logger.exception("Failed to load vector store")
            raise

    def delete_by_metadata(self, filter_metadata: Dict[str, Any]) -> int:
        """
        Delete documents matching metadata filters.

        Note: This requires rebuilding the FAISS index.

        Args:
            filter_metadata: Metadata filters for deletion

        Returns:
            Number of documents deleted
        """
        # Find documents to keep
        docs_to_keep = [
            doc for doc in self.documents
            if not self._matches_filter(doc, filter_metadata)
        ]

        deleted_count = len(self.documents) - len(docs_to_keep)

        if deleted_count == 0:
            logger.info("No documents matched deletion filter")
            return 0

        # Rebuild index with remaining documents
        logger.info(f"Rebuilding index after deleting {deleted_count} documents")

        self.documents = docs_to_keep
        self.index = faiss.IndexFlatL2(self.dimension)

        if self.documents:
            texts = [doc.page_content for doc in self.documents]
            embeddings = self.embedding_provider.embed_documents(texts)
            embeddings_np = np.array(embeddings).astype('float32')
            self.index.add(embeddings_np)

        logger.info(f"Deleted {deleted_count} documents (remaining: {len(self.documents)})")
        return deleted_count

    def __len__(self) -> int:
        """Return number of documents in store."""
        return len(self.documents)

    def __repr__(self) -> str:
        """String representation for debugging."""
        return f"<FAISSVectorStore(docs={len(self.documents)}, dim={self.dimension})>"
