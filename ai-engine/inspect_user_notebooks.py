import sys
import os
import json
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

def inspect_user_all_notebooks():
    index_path = "./data/faiss_index"
    embeddings = OpenAIEmbeddings()
    store = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
    docstore = store.docstore._dict
    
    target_user = "695bd8df4a0c5f919b4fa98a"
    
    print(f"Chunks for user {target_user}:")
    for doc in docstore.values():
        m = doc.metadata
        if str(m.get('user_id')) == target_user:
            print(f"  Notebook ID: {m.get('notebook_id')} | Source: {m.get('source')}")

if __name__ == "__main__":
    inspect_user_all_notebooks()
