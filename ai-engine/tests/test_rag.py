"""
Integration tests for RAG pipeline.

Tests vector store, embeddings, text splitting, and document loading
without LangChain dependencies.
"""

import pytest
import os
import tempfile
from pathlib import Path
from core.rag.vector_store import FAISSVectorStore, Document
from core.rag.embeddings import EmbeddingProvider
from core.rag.text_splitter import TextSplitter
from core.rag.document_loader import DocumentLoader
from core.rag_retriever import RAGRetriever
from config import CONFIG


class TestEmbeddingProvider:
    """Test embedding provider."""

    @pytest.fixture
    def embeddings(self):
        """Create embedding provider."""
        return EmbeddingProvider(model_name="all-MiniLM-L6-v2")

    def test_embedding_initialization(self, embeddings):
        """Test embedding provider initializes."""
        assert embeddings is not None
        assert embeddings.model_name == "all-MiniLM-L6-v2"
        print("✓ EmbeddingProvider initialized")

    def test_embed_query(self, embeddings):
        """Test embedding a single query."""
        embedding = embeddings.embed_query("Hello world")

        assert isinstance(embedding, list)
        assert len(embedding) == 384  # MiniLM dimensions
        assert all(isinstance(x, float) for x in embedding)
        print(f"✓ Query embedding: {len(embedding)} dimensions")

    def test_embed_documents(self, embeddings):
        """Test embedding multiple documents."""
        texts = ["Hello world", "Goodbye world", "Test document"]

        embeddings_list = embeddings.embed_documents(texts)

        assert isinstance(embeddings_list, list)
        assert len(embeddings_list) == 3
        assert all(len(emb) == 384 for emb in embeddings_list)
        print(f"✓ Document embeddings: {len(embeddings_list)} documents")

    def test_get_dimension(self, embeddings):
        """Test getting embedding dimension."""
        dimension = embeddings.get_dimension()

        assert dimension == 384
        print(f"✓ Embedding dimension: {dimension}")


class TestTextSplitter:
    """Test text splitter."""

    def test_text_splitter_initialization(self):
        """Test text splitter initializes."""
        splitter = TextSplitter(chunk_size=100, chunk_overlap=20)

        assert splitter.chunk_size == 100
        assert splitter.chunk_overlap == 20
        print("✓ TextSplitter initialized")

    def test_split_short_text(self):
        """Test splitting text shorter than chunk size."""
        splitter = TextSplitter(chunk_size=100, chunk_overlap=20)
        text = "This is a short text."

        chunks = splitter.split_text(text)

        assert len(chunks) == 1
        assert chunks[0] == text
        print(f"✓ Short text: {len(chunks)} chunk")

    def test_split_long_text(self):
        """Test splitting long text."""
        splitter = TextSplitter(chunk_size=100, chunk_overlap=20)
        text = "This is a long text. " * 20  # ~420 characters

        chunks = splitter.split_text(text)

        assert len(chunks) > 1
        assert all(len(chunk) <= 120 for chunk in chunks)  # Allow some margin
        print(f"✓ Long text: {len(chunks)} chunks")

    def test_split_documents(self):
        """Test splitting multiple documents."""
        splitter = TextSplitter(chunk_size=100, chunk_overlap=20)

        documents = [
            Document(
                page_content="This is document 1. " * 10,
                metadata={"source": "doc1"}
            ),
            Document(
                page_content="This is document 2. " * 10,
                metadata={"source": "doc2"}
            )
        ]

        chunks = splitter.split_documents(documents)

        assert len(chunks) > 2
        assert all("chunk" in chunk.metadata for chunk in chunks)
        assert all("source" in chunk.metadata for chunk in chunks)
        print(f"✓ Split {len(documents)} documents into {len(chunks)} chunks")


class TestDocumentLoader:
    """Test document loader."""

    def test_load_text_file(self):
        """Test loading text file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is a test document.")
            filepath = f.name

        try:
            documents = DocumentLoader.load_text(filepath)

            assert len(documents) == 1
            assert documents[0].page_content == "This is a test document."
            assert documents[0].metadata["type"] == "text"
            assert documents[0].metadata["source"] == filepath
            print("✓ Text file loaded successfully")
        finally:
            os.unlink(filepath)

    def test_load_string(self):
        """Test creating document from string."""
        text = "This is test content"
        documents = DocumentLoader.load_from_string(
            text,
            source_name="test_source",
            metadata={"author": "test"}
        )

        assert len(documents) == 1
        assert documents[0].page_content == text
        assert documents[0].metadata["source"] == "test_source"
        assert documents[0].metadata["author"] == "test"
        print("✓ String document created successfully")

    def test_load_auto_detect(self):
        """Test auto-detecting file type."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("Auto-detect test")
            filepath = f.name

        try:
            documents = DocumentLoader.load(filepath)

            assert len(documents) == 1
            assert documents[0].page_content == "Auto-detect test"
            print("✓ Auto-detection works for .txt files")
        finally:
            os.unlink(filepath)


class TestFAISSVectorStore:
    """Test FAISS vector store."""

    @pytest.fixture
    def embeddings(self):
        """Create embedding provider."""
        return EmbeddingProvider(model_name="all-MiniLM-L6-v2")

    @pytest.fixture
    def vector_store(self, embeddings):
        """Create vector store."""
        return FAISSVectorStore(embeddings, dimension=384)

    def test_vector_store_initialization(self, vector_store):
        """Test vector store initializes."""
        assert vector_store is not None
        assert vector_store.dimension == 384
        print("✓ FAISSVectorStore initialized")

    def test_add_documents(self, vector_store):
        """Test adding documents to vector store."""
        documents = [
            Document(
                page_content="Python is a programming language",
                metadata={"source": "doc1", "user_id": "test_user"}
            ),
            Document(
                page_content="JavaScript is also a programming language",
                metadata={"source": "doc2", "user_id": "test_user"}
            )
        ]

        vector_store.add_documents(documents)

        assert vector_store.index.ntotal == 2
        print(f"✓ Added {len(documents)} documents to vector store")

    def test_similarity_search(self, vector_store):
        """Test similarity search."""
        documents = [
            Document(
                page_content="Python is great for data science",
                metadata={"user_id": "user1"}
            ),
            Document(
                page_content="JavaScript is great for web development",
                metadata={"user_id": "user1"}
            ),
            Document(
                page_content="Cats are cute animals",
                metadata={"user_id": "user1"}
            )
        ]

        vector_store.add_documents(documents)

        results = vector_store.similarity_search("programming languages", k=2)

        assert len(results) <= 2
        assert any("Python" in doc.page_content or "JavaScript" in doc.page_content
                  for doc in results)
        print(f"✓ Similarity search returned {len(results)} relevant results")

    def test_metadata_filtering(self, vector_store):
        """Test filtering by metadata."""
        documents = [
            Document(
                page_content="Document for user A",
                metadata={"user_id": "user_a"}
            ),
            Document(
                page_content="Document for user B",
                metadata={"user_id": "user_b"}
            )
        ]

        vector_store.add_documents(documents)

        # Search with user filter
        results = vector_store.similarity_search(
            "document",
            k=10,
            filter_metadata={"user_id": "user_a"}
        )

        assert len(results) >= 1
        assert all(doc.metadata.get("user_id") == "user_a" for doc in results)
        print("✓ Metadata filtering works correctly")

    def test_save_and_load(self, vector_store, embeddings):
        """Test saving and loading vector store."""
        documents = [
            Document(
                page_content="Test document for persistence",
                metadata={"user_id": "test"}
            )
        ]

        vector_store.add_documents(documents)

        # Save to temporary directory
        with tempfile.TemporaryDirectory() as tmpdir:
            save_path = os.path.join(tmpdir, "test_index")
            vector_store.save(save_path)

            # Load from disk
            loaded_store = FAISSVectorStore.load(save_path, embeddings)

            assert loaded_store.index.ntotal == vector_store.index.ntotal
            print("✓ Vector store persistence works")


class TestRAGRetriever:
    """Test RAG retriever."""

    def test_rag_retriever_initialization(self):
        """Test RAG retriever initializes."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_config = CONFIG.copy()
            test_config["faiss_index_path"] = tmpdir
            test_config["documents_path"] = tmpdir

            retriever = RAGRetriever(test_config, user_id="test_user")

            assert retriever is not None
            assert retriever.user_id == "test_user"
            print("✓ RAGRetriever initialized")

    def test_add_user_documents(self):
        """Test adding documents for a user."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_config = CONFIG.copy()
            test_config["faiss_index_path"] = tmpdir
            test_config["documents_path"] = tmpdir

            retriever = RAGRetriever(test_config, user_id="test_user")

            documents = [
                Document(
                    page_content="Machine learning is fascinating",
                    metadata={"source": "test_doc"}
                )
            ]

            retriever.add_user_documents(documents, user_id="test_user", save_index=False)

            # Verify documents were added
            results = retriever.get_relevant_documents("machine learning", k=1)
            assert len(results) > 0
            print("✓ User documents added successfully")

    def test_user_isolation(self):
        """Test that users can only access their own documents."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_config = CONFIG.copy()
            test_config["faiss_index_path"] = tmpdir
            test_config["documents_path"] = tmpdir

            retriever = RAGRetriever(test_config)

            # Add documents for user A
            user_a_docs = [
                Document(
                    page_content="User A's private document",
                    metadata={"source": "user_a_doc"}
                )
            ]
            retriever.add_user_documents(user_a_docs, user_id="user_a", save_index=False)

            # Add documents for user B
            user_b_docs = [
                Document(
                    page_content="User B's private document",
                    metadata={"source": "user_b_doc"}
                )
            ]
            retriever.add_user_documents(user_b_docs, user_id="user_b", save_index=False)

            # User A should only see their documents
            user_a_results = retriever.get_relevant_documents(
                "document",
                user_id="user_a",
                k=10
            )

            assert all(doc.metadata.get("user_id") == "user_a"
                      for doc in user_a_results if not doc.metadata.get("placeholder"))
            print("✓ User isolation works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
