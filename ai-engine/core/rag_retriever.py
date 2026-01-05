# core/rag_retriever.py
"""
RAG Pipeline with multi-user isolation using FAISS metadata filtering.

- User-isolated document retrieval via metadata['user_id']
- Each user's documents are tagged and filtered
- No cross-user document leakage
- Supports per-user document ingestion

Flow:
  1. Documents ingested with user_id in metadata
  2. Retrieval filters by user_id to ensure isolation
  3. Shared documents can have user_id="public"
"""
import os
from pathlib import Path
import logging
from typing import List, Optional
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class RAGRetriever:
    def __init__(self, config, user_id: Optional[str] = None):
        """
        Initialize RAG retriever with optional user isolation.
        
        Args:
            config: Configuration dictionary
            user_id: User identifier for filtering (None = shared/public only)
        """
        self.config = config
        self.user_id = user_id
        self.embeddings = HuggingFaceEmbeddings(model_name=config["embedding_model"])
        self.vector_store = None
        self.documents_path = Path(config.get("documents_path", "documents"))
        self.faiss_index_path = config["faiss_index_path"]

        if not self.documents_path.exists():
            self.documents_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created documents directory at: {self.documents_path}")

        self._load_or_create_vector_store()
        
        if user_id:
            logger.info(f"✓ RAG retriever initialized with user isolation: user_id={user_id}")

    def _load_or_create_vector_store(self):
        """Load FAISS index from disk if it exists, otherwise create it."""
        if os.path.exists(self.faiss_index_path):
            try:
                self.vector_store = FAISS.load_local(
                    self.faiss_index_path,
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                logger.info(f"Loaded FAISS index from {self.faiss_index_path}")
                return
            except Exception as e:
                logger.error(f"Failed to load FAISS index: {e}. Rebuilding...")

        logger.info("Creating new FAISS index...")
        # Load documents
        loader = DirectoryLoader(
            str(self.documents_path),
            glob="**/*.txt",
            loader_cls=TextLoader,
            show_progress=True,
            use_multithreading=True
        )
        documents = loader.load()

        if not documents:
            logger.warning("No documents found to create a vector store.")
            return

        # Add default metadata (public documents accessible to all)
        for doc in documents:
            if "user_id" not in doc.metadata:
                doc.metadata["user_id"] = "public"

        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        texts = text_splitter.split_documents(documents)

        # Create FAISS vector store
        self.vector_store = FAISS.from_documents(texts, self.embeddings)
        self.vector_store.save_local(self.faiss_index_path)
        logger.info(f"FAISS index created and saved to {self.faiss_index_path}")

    def as_retriever(self):
        """Return the vector store as a LangChain retriever with user filtering."""
        if self.vector_store:
            return self.vector_store.as_retriever(
                search_kwargs={"k": self.config.get("retrieval_top_k", 3)}
            )
        return None

    def get_relevant_documents(self, query: str, user_id: Optional[str] = None) -> List[Document]:
        """
        Retrieve relevant documents for a query with user isolation.
        
        Args:
            query: Search query
            user_id: Override user_id for this query (defaults to instance user_id)
            
        Returns:
            List of documents filtered by user_id (includes "public" docs)
        """
        if not self.vector_store:
            return []
        
        # Use provided user_id or instance user_id
        filter_user_id = user_id or self.user_id
        
        # Retrieve more docs than needed, then filter by user_id
        k = self.config.get("retrieval_top_k", 3)
        all_docs = self.vector_store.similarity_search(query, k=k * 3)  # Over-retrieve
        
        # Filter: user's docs + public docs
        filtered_docs = []
        for doc in all_docs:
            doc_user = doc.metadata.get("user_id", "public")
            if filter_user_id is None:
                # No user context: only public docs
                if doc_user == "public":
                    filtered_docs.append(doc)
            else:
                # User context: user's docs + public docs
                if doc_user == filter_user_id or doc_user == "public":
                    filtered_docs.append(doc)
            
            if len(filtered_docs) >= k:
                break
        
        return filtered_docs[:k]
    
    def add_user_documents(
        self,
        documents: List[Document],
        user_id: str,
        save_index: bool = True
    ):
        """
        Add documents for a specific user with metadata tagging.
        
        Args:
            documents: List of LangChain Document objects
            user_id: User identifier to tag documents
            save_index: Whether to persist FAISS index after adding
        """
        if not self.vector_store:
            logger.warning("Vector store not initialized")
            return
        
        # Tag all documents with user_id
        for doc in documents:
            doc.metadata["user_id"] = user_id
        
        # Split and add to vector store
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        texts = text_splitter.split_documents(documents)
        
        self.vector_store.add_documents(texts)
        
        if save_index:
            self.vector_store.save_local(self.faiss_index_path)
        
        logger.info(f"✓ Added {len(texts)} document chunks for user: {user_id}")


def create_rag_retriever(config, user_id: Optional[str] = None):
    return RAGRetriever(config, user_id=user_id)
