"""
Embedding Provider - SentenceTransformers Wrapper.

This module provides embedding generation using SentenceTransformers
without LangChain dependencies.
"""

from typing import List
from sentence_transformers import SentenceTransformer
import logging

logger = logging.getLogger(__name__)


class EmbeddingProvider:
    """
    Embedding provider using SentenceTransformers.

    This replaces LangChain's HuggingFaceEmbeddings with a simple,
    direct wrapper around SentenceTransformers.

    Features:
    - Fast local embedding generation
    - No external API calls
    - Consistent embedding dimensions
    - Batch processing support
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize embedding provider.

        Args:
            model_name: Name of SentenceTransformers model
                       Default: "all-MiniLM-L6-v2" (384 dimensions)

        Popular models:
        - all-MiniLM-L6-v2: 384 dims, fast, good for general use
        - all-mpnet-base-v2: 768 dims, slower, better quality
        - paraphrase-multilingual: 768 dims, supports multiple languages
        """
        self.model_name = model_name

        try:
            self.model = SentenceTransformer(model_name)
            logger.info(f"Loaded embedding model: {model_name}")
            logger.info(f"Embedding dimension: {self.get_dimension()}")

        except Exception as e:
            logger.exception(f"Failed to load embedding model: {model_name}")
            raise

    def embed_query(self, text: str) -> List[float]:
        """
        Embed a single query text.

        Args:
            text: Query text to embed

        Returns:
            List of embedding values (floats)
        """
        try:
            embedding = self.model.encode(
                text,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            return embedding.tolist()

        except Exception as e:
            logger.exception("Failed to embed query")
            raise

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed multiple documents in batch.

        This is more efficient than calling embed_query repeatedly.

        Args:
            texts: List of document texts to embed

        Returns:
            List of embeddings (each embedding is a list of floats)
        """
        if not texts:
            return []

        try:
            embeddings = self.model.encode(
                texts,
                convert_to_numpy=True,
                show_progress_bar=len(texts) > 100,  # Show progress for large batches
                batch_size=32  # Process in batches for efficiency
            )
            return embeddings.tolist()

        except Exception as e:
            logger.exception(f"Failed to embed {len(texts)} documents")
            raise

    def get_dimension(self) -> int:
        """
        Get embedding dimension for this model.

        Returns:
            Embedding dimension (e.g., 384 for all-MiniLM-L6-v2)
        """
        return self.model.get_sentence_embedding_dimension()

    def __repr__(self) -> str:
        """String representation for debugging."""
        return f"<EmbeddingProvider(model='{self.model_name}', dim={self.get_dimension()})>"
