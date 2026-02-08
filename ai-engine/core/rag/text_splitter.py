"""
Text Splitter - Simple Chunking Implementation.

This module provides text splitting functionality without LangChain,
using recursive splitting on common delimiters for clean chunk boundaries.
"""

from typing import List
import re
import logging

logger = logging.getLogger(__name__)


class TextSplitter:
    """
    Simple yet effective text splitter.

    Replaces LangChain's RecursiveCharacterTextSplitter with a clean
    implementation that splits on natural boundaries.

    Features:
    - Recursive splitting on common delimiters
    - Configurable chunk size and overlap
    - Maintains context across chunks
    - Clean chunk boundaries (no mid-sentence splits)

    Splitting hierarchy:
    1. Double newline (paragraphs)
    2. Single newline (lines)
    3. Period + space (sentences)
    4. Space (words)
    5. Character (last resort)
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: List[str] = None
    ):
        """
        Initialize text splitter.

        Args:
            chunk_size: Maximum characters per chunk
            chunk_overlap: Overlap between chunks for context
            separators: List of separators (uses default if None)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

        logger.info(
            f"Initialized TextSplitter "
            f"(chunk_size={chunk_size}, overlap={chunk_overlap})"
        )

    def split_text(self, text: str) -> List[str]:
        """
        Split text into chunks.

        Args:
            text: Text to split

        Returns:
            List of text chunks
        """
        if not text:
            return []

        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        current_chunk = ""

        # Split text recursively
        splits = self._split_text_recursive(text, self.separators)

        for split in splits:
            # Check if adding this split exceeds chunk size
            if len(current_chunk) + len(split) <= self.chunk_size:
                current_chunk += split
            else:
                # Save current chunk
                if current_chunk:
                    chunks.append(current_chunk.strip())

                # Start new chunk with overlap from previous
                if self.chunk_overlap > 0 and chunks:
                    overlap_text = chunks[-1][-self.chunk_overlap:]
                    current_chunk = overlap_text + split
                else:
                    current_chunk = split

                # Handle case where single split exceeds chunk size
                while len(current_chunk) > self.chunk_size:
                    chunks.append(current_chunk[:self.chunk_size].strip())
                    current_chunk = current_chunk[self.chunk_size - self.chunk_overlap:]

        # Add final chunk
        if current_chunk:
            chunks.append(current_chunk.strip())

        # Filter out empty chunks
        chunks = [chunk for chunk in chunks if chunk]

        logger.debug(f"Split text into {len(chunks)} chunks")
        return chunks

    def _split_text_recursive(
        self,
        text: str,
        separators: List[str]
    ) -> List[str]:
        """
        Recursively split text on separators.

        Args:
            text: Text to split
            separators: List of separators to try

        Returns:
            List of text splits
        """
        if not separators:
            return [text]

        separator = separators[0]
        remaining_separators = separators[1:]

        if separator == "":
            # Last resort: split into characters
            return list(text)

        # Split on current separator
        if separator in text:
            splits = text.split(separator)

            # Recursively split large pieces
            result = []
            for i, split in enumerate(splits):
                if split:  # Skip empty splits
                    # Add separator back (except for last split)
                    if i < len(splits) - 1:
                        split_text = split + separator
                    else:
                        split_text = split

                    # Recursively split if still too large
                    if len(split_text) > self.chunk_size and remaining_separators:
                        result.extend(
                            self._split_text_recursive(split_text, remaining_separators)
                        )
                    else:
                        result.append(split_text)

            return result

        # Separator not found, try next one
        return self._split_text_recursive(text, remaining_separators)

    def split_documents(self, documents: List) -> List:
        """
        Split multiple documents into chunks.

        Args:
            documents: List of Document objects with page_content attribute

        Returns:
            List of Document objects (chunks)
        """
        from core.rag.vector_store import Document

        chunked_docs = []

        for doc in documents:
            text_chunks = self.split_text(doc.page_content)

            for i, chunk in enumerate(text_chunks):
                # Create new document with chunk metadata
                chunk_metadata = doc.metadata.copy()
                chunk_metadata["chunk"] = i
                chunk_metadata["chunk_count"] = len(text_chunks)

                chunked_docs.append(
                    Document(page_content=chunk, metadata=chunk_metadata)
                )

        logger.info(f"Split {len(documents)} documents into {len(chunked_docs)} chunks")
        return chunked_docs

    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"<TextSplitter(chunk_size={self.chunk_size}, "
            f"overlap={self.chunk_overlap})>"
        )
