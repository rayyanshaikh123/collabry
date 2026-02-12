from rag.vectorstore import similarity_search
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO)

def test_retrieval_fallback():
    # Target IDs that we know exist in DB but not necessarily in FAISS (for this specific combo)
    user_id = "695bd8df4a0c5f919b4fa98a"
    notebook_id = "698dc37bd212e2aad53a877a"
    
    print(f"Testing RAG retrieval for user={user_id}, notebook={notebook_id}")
    
    # This should trigger the fallback since we know notebook_id has 0 chunks but user_id has 6.
    docs = similarity_search(
        query="Arrays in Programming",
        user_id=user_id,
        notebook_id=notebook_id,
        k=5
    )
    
    print(f"\nRetrieved {len(docs)} documents.")
    for i, doc in enumerate(docs):
        print(f"  [{i+1}] Source: {doc.metadata.get('source')} | Notebook: {doc.metadata.get('notebook_id')}")

if __name__ == "__main__":
    test_retrieval_fallback()
