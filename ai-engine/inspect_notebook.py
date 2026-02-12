import sys
import os
import json
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

def inspect_notebook_specific():
    index_path = "./data/faiss_index"
    embeddings = OpenAIEmbeddings()
    store = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
    docstore = store.docstore._dict
    
    target_notebook = "698dc37bd212e2aad53a877a"
    target_user = "695bd8df4a0c5f919b4fa98a"
    
    found_notebook = 0
    found_user = 0
    found_both = 0
    
    for doc in docstore.values():
        m = doc.metadata
        uid = str(m.get('user_id'))
        nid = str(m.get('notebook_id'))
        
        if uid == target_user: found_user += 1
        if nid == target_notebook: found_notebook += 1
        if uid == target_user and nid == target_notebook: found_both += 1
        
    print(f"Total chunks: {len(docstore)}")
    print(f"Chunks matching user '{target_user}': {found_user}")
    print(f"Chunks matching notebook '{target_notebook}': {found_notebook}")
    print(f"Chunks matching both: {found_both}")
    
    if found_both > 0:
        print("\nSample content for target notebook:")
        for doc in docstore.values():
            m = doc.metadata
            if str(m.get('user_id')) == target_user and str(m.get('notebook_id')) == target_notebook:
                print(f"- {doc.page_content[:100]}...")
                break

if __name__ == "__main__":
    inspect_notebook_specific()
