from pymongo import MongoClient
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

def check_notebook_sources():
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB", "collabry")
    
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    recent_session = db["chat_sessions"].find_one(sort=[("updated_at", -1)])
    if not recent_session:
        print("No sessions found.")
        return
        
    notebook_id = recent_session.get('notebook_id')
    if not notebook_id:
        print("Recent session has no notebook_id.")
        return
        
    notebook = db["notebooks"].find_one({"_id": ObjectId(notebook_id)})
    if not notebook:
        print(f"Notebook {notebook_id} not found in DB.")
        return
        
    print(f"Notebook: {notebook['title']}")
    print(f"Sources count: {len(notebook.get('sources', []))}")
    for i, s in enumerate(notebook.get('sources', [])):
        print(f"  [{i+1}] {s.get('name')} (ID: {s.get('_id')})")

if __name__ == "__main__":
    check_notebook_sources()
