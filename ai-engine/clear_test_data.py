"""
Clear test and simulated usage data from the database.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymongo import MongoClient
from config import CONFIG

print("\n🧹 Clearing Test Usage Data")
print("=" * 60)

try:
    client = MongoClient(CONFIG["mongo_uri"])
    db = client[CONFIG["mongo_db"]]
    
    # Clear test user logs (test_user, user_001-999, etc.)
    result1 = db["usage_logs"].delete_many({
        "$or": [
            {"user_id": {"$regex": "^test_user"}},
            {"user_id": {"$regex": "^user_[0-9]{3}"}},
            {"metadata.simulated": True}
        ]
    })
    print(f"   ✓ Deleted {result1.deleted_count} test usage log entries")
    
    # Clear test user daily stats
    result2 = db["daily_stats"].delete_many({
        "$or": [
            {"user_id": {"$regex": "^test_user"}},
            {"user_id": {"$regex": "^user_[0-9]{3}"}},
            {"user_id": "global"}  # Clear global stats too
        ]
    })
    print(f"   ✓ Deleted {result2.deleted_count} test daily stat entries")
    
    # Show remaining real data
    real_logs = db["usage_logs"].count_documents({})
    print(f"\n📊 Remaining real usage logs: {real_logs}")
    
    if real_logs > 0:
        # Show breakdown
        from datetime import datetime, timedelta
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent = db["usage_logs"].count_documents({"timestamp": {"$gte": one_hour_ago}})
        print(f"   • Last hour: {recent} operations")
        
        unique_users = db["usage_logs"].distinct("user_id")
        print(f"   • Unique users: {len(unique_users)}")
    
    client.close()
    
    print("\n✅ Test data cleared successfully!")
    print("\n💡 The dashboard will now show only real usage data.")
    print("   Refresh your admin page to see the updated statistics.")
    
except Exception as e:
    print(f"\n❌ Error clearing data: {e}")
    import traceback
    traceback.print_exc()
