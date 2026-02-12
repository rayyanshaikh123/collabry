from pymongo import MongoClient
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

def check_mongo():
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB", "collabry")
    
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    # Get most recent session
    recent_session = db["chat_sessions"].find_one(sort=[("updated_at", -1)])
    if not recent_session:
        print("No sessions found in MongoDB.")
        return
        
    print(f"Most Recent Session:")
    print(f"  ID: {recent_session['_id']}")
    print(f"  User ID: {recent_session['user_id']}")
    print(f"  Notebook ID: {recent_session.get('notebook_id')}")
    print(f"  Title: {recent_session.get('title')}")
    
    # Check if this user has documents in FAISS (based on my previous inspection)
    faiss_users = ['698b7b76855206e0de7c69e0', '695bd8df4a0c5f919b4fa98a', '6960e662caaae380e65c8097']
    current_user = str(recent_session['user_id'])
    if current_user in faiss_users:
        print(f"✅ User {current_user} HAS documents in FAISS index.")
    else:
        print(f"❌ User {current_user} NOT FOUND in FAISS index.")
        
    # Check if the notebook_id matches any in FAISS
    notebook_id = str(recent_session.get('notebook_id'))
    faiss_notebooks = ['698d9fe61935b82ef238b772', '698db81d129401d365457260', '698ca48102f8f4f6b56423d5', '698d68f948b62ed04c7e3e6e', '698c73b62ccf1fde526faa96', '698b40aea0c215d06b32ebe3', '698d92bd07b1e8eb61e19b18', '698dc37bd212e2aad53a877a', '698d901007b1e8eb61e19b13', '698b40ae7b66ef40817114e1', '698cc8b9047d773c09a2cf33', '698d93ed07b1e8eb61e19b1b', '698d9f6e1935b82ef238b76e']
    if notebook_id in faiss_notebooks:
        print(f"✅ Notebook {notebook_id} HAS documents in FAISS index.")
    else:
        print(f"❌ Notebook {notebook_id} NOT FOUND in FAISS index.")

if __name__ == "__main__":
    check_mongo()
