import sys
import os
import json
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

def inspect_index():
    index_path = "./data/faiss_index"
    if not os.path.exists(index_path):
        print(f"Index path {index_path} not found.")
        return

    embeddings = OpenAIEmbeddings()
    try:
        # Check if index.faiss exists
        if not os.path.exists(os.path.join(index_path, "index.faiss")):
            print(f"index.faiss NOT FOUND in {index_path}")
            return
            
        store = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
        print(f"Successfully loaded FAISS index from {index_path}")
    except Exception as e:
        print(f"Error loading index: {e}")
        return

    docstore = store.docstore._dict
    print(f"Total chunks in index: {len(docstore)}")
    
    # Analyze unique user_ids and notebook_ids
    users = set()
    notebooks = set()
    
    for doc in docstore.values():
        m = doc.metadata
        if 'user_id' in m: users.add(str(m['user_id']))
        if 'notebook_id' in m: notebooks.add(str(m['notebook_id']))
        
    print(f"\nUnique user_ids found: {list(users)}")
    print(f"Unique notebook_ids found: {list(notebooks)}")

    # Print a few samples
    print("\nSample Chunk Metadata:")
    items = list(docstore.items())
    for i, (doc_id, doc) in enumerate(items[:5]):
        print(f"\n[{i+1}] Metadata: {json.dumps(doc.metadata)}")
        print(f"    Content preview: {doc.page_content[:150]}...")

if __name__ == "__main__":
    inspect_index()
