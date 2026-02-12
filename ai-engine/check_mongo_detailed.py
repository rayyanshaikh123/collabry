from pymongo import MongoClient
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

def check_mongo_detailed():
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB", "collabry")
    
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    recent_session = db["chat_sessions"].find_one(sort=[("updated_at", -1)])
    if not recent_session:
        print("No sessions found.")
        return
        
    print(f"RECENT SESSION DETAILS:")
    print(f"  Session ID: {recent_session['_id']}")
    print(f"  User ID: {recent_session['user_id']}")
    print(f"  Notebook ID: {recent_session.get('notebook_id')}")
    print(f"  Title: {recent_session.get('title')}")
    
    # Get the notebook itself
    nid = recent_session.get('notebook_id')
    if nid:
        notebook = db["notebooks"].find_one({"_id": ObjectId(nid)})
        if notebook:
            print(f"NOTEBOOK DETAILS:")
            print(f"  Notebook ID: {notebook['_id']}")
            print(f"  Notebook Title: {notebook.get('title')}")
            print(f"  AI Session ID: {notebook.get('aiSessionId')}")
            print(f"  Sources: {[s.get('name') for s in notebook.get('sources', [])]}")
        else:
            print(f"Notebook {nid} not found in collection!")

if __name__ == "__main__":
    check_mongo_detailed()
