"""
Document Loader - PDF and Text File Loading.

This module provides document loading functionality without LangChain,
supporting PDFs and text files.
"""

from typing import List
from core.rag.vector_store import Document
import PyPDF2
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class DocumentLoader:
    """
    Load documents from various file formats.

    Replaces LangChain's document loaders with simple, direct implementations.

    Supported formats:
    - PDF (.pdf)
    - Text (.txt, .md)
    """

    @staticmethod
    def load_pdf(filepath: str, metadata: dict = None) -> List[Document]:
        """
        Load PDF file and extract text.

        Args:
            filepath: Path to PDF file
            metadata: Additional metadata to attach to documents

        Returns:
            List of Document objects (one per page)

        Raises:
            FileNotFoundError: If file doesn't exist
            Exception: If PDF reading fails
        """
        filepath = Path(filepath)

        if not filepath.exists():
            raise FileNotFoundError(f"PDF file not found: {filepath}")

        documents = []

        try:
            with open(filepath, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                total_pages = len(pdf_reader.pages)

                logger.info(f"Loading PDF: {filepath.name} ({total_pages} pages)")

                for page_num, page in enumerate(pdf_reader.pages, start=1):
                    # Extract text from page
                    text = page.extract_text()

                    # Skip empty pages
                    if not text.strip():
                        logger.debug(f"Skipping empty page {page_num}")
                        continue

                    # Create document metadata
                    doc_metadata = {
                        "source": str(filepath),
                        "page": page_num,
                        "total_pages": total_pages,
                        "type": "pdf",
                        "filename": filepath.name
                    }

                    # Merge with additional metadata
                    if metadata:
                        doc_metadata.update(metadata)

                    # Create document
                    documents.append(
                        Document(page_content=text, metadata=doc_metadata)
                    )

                logger.info(
                    f"Loaded {len(documents)} pages from PDF: {filepath.name}"
                )

        except Exception as e:
            logger.exception(f"Failed to load PDF: {filepath}")
            raise Exception(f"PDF loading failed: {str(e)}")

        return documents

    @staticmethod
    def load_text(filepath: str, metadata: dict = None) -> List[Document]:
        """
        Load text file.

        Args:
            filepath: Path to text file
            metadata: Additional metadata to attach to document

        Returns:
            List containing single Document object

        Raises:
            FileNotFoundError: If file doesn't exist
            Exception: If file reading fails
        """
        filepath = Path(filepath)

        if not filepath.exists():
            raise FileNotFoundError(f"Text file not found: {filepath}")

        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()

            # Create document metadata
            doc_metadata = {
                "source": str(filepath),
                "type": "text",
                "filename": filepath.name,
                "extension": filepath.suffix
            }

            # Merge with additional metadata
            if metadata:
                doc_metadata.update(metadata)

            # Create document
            documents = [Document(page_content=text, metadata=doc_metadata)]

            logger.info(f"Loaded text file: {filepath.name} ({len(text)} chars)")
            return documents

        except Exception as e:
            logger.exception(f"Failed to load text file: {filepath}")
            raise Exception(f"Text file loading failed: {str(e)}")

    @staticmethod
    def load_from_string(
        text: str,
        source_name: str = "string",
        metadata: dict = None
    ) -> List[Document]:
        """
        Create document from string content.

        Useful for user-provided text, scraped web content, etc.

        Args:
            text: Text content
            source_name: Name to identify source
            metadata: Additional metadata

        Returns:
            List containing single Document object
        """
        doc_metadata = {
            "source": source_name,
            "type": "string",
            "length": len(text)
        }

        if metadata:
            doc_metadata.update(metadata)

        documents = [Document(page_content=text, metadata=doc_metadata)]

        logger.info(f"Created document from string: {source_name} ({len(text)} chars)")
        return documents

    @staticmethod
    def load(filepath: str, metadata: dict = None) -> List[Document]:
        """
        Auto-detect file type and load appropriately.

        Args:
            filepath: Path to file
            metadata: Additional metadata

        Returns:
            List of Document objects

        Raises:
            ValueError: If file type is unsupported
        """
        filepath = Path(filepath)
        extension = filepath.suffix.lower()

        if extension == '.pdf':
            return DocumentLoader.load_pdf(filepath, metadata)
        elif extension in ['.txt', '.md', '.text']:
            return DocumentLoader.load_text(filepath, metadata)
        else:
            raise ValueError(
                f"Unsupported file type: {extension}. "
                f"Supported: .pdf, .txt, .md"
            )
