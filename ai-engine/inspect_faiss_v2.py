import sys
import os
import json
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

def inspect_index():
    index_path = "./data/faiss_index"
    index_file = os.path.join(index_path, "index.faiss")
    
    output_file = "faiss_inspect_utf8.txt"
    
    with open(output_file, "w", encoding="utf-8") as f:
        if not os.path.exists(index_path):
            f.write(f"Index path {index_path} not found.\n")
            return

        embeddings = OpenAIEmbeddings()
        try:
            if not os.path.exists(index_file):
                f.write(f"index.faiss NOT FOUND in {index_path}\n")
                return
                
            store = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
            f.write(f"Successfully loaded FAISS index from {index_path}\n")
        except Exception as e:
            f.write(f"Error loading index: {e}\n")
            return

        docstore = store.docstore._dict
        f.write(f"Total chunks in index: {len(docstore)}\n")
        
        users = set()
        notebooks = set()
        
        for doc in docstore.values():
            m = doc.metadata
            users.add(str(m.get('user_id')))
            notebooks.add(str(m.get('notebook_id')))
            
        f.write(f"\nUnique user_ids found: {list(users)}\n")
        f.write(f"Unique notebook_ids found: {list(notebooks)}\n")

        f.write("\nSample Chunk Metadata:\n")
        items = list(docstore.items())
        for i, (doc_id, doc) in enumerate(items[:10]):
            f.write(f"\n[{i+1}] Metadata: {json.dumps(doc.metadata)}\n")
            f.write(f"    Content preview: {doc.page_content[:150]}...\n")

    print(f"Results written to {output_file}")

if __name__ == "__main__":
    inspect_index()
