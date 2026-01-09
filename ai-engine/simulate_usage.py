"""
Simulate real AI operations for usage tracking demonstration.

This script simulates various AI operations to populate the dashboard with realistic data.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.usage_tracker import usage_tracker
from datetime import datetime, timedelta
import random
import time


def simulate_operations(num_users=5, operations_per_user=10):
    """Simulate AI operations from multiple users."""
    
    print("🎬 Simulating AI Operations")
    print("=" * 60)
    
    # Operation types with realistic token ranges
    operation_types = [
        ("chat", (300, 800)),
        ("chat_stream", (500, 1200)),
        ("summarize", (800, 1500)),
        ("qa", (600, 1000)),
        ("mindmap", (1500, 3000)),
        ("upload", (50, 200)),
    ]
    
    # Simulate users
    users = [f"user_{i:03d}" for i in range(1, num_users + 1)]
    
    total_operations = 0
    
    for user_id in users:
        print(f"\n👤 Simulating operations for {user_id}")
        
        for i in range(operations_per_user):
            # Pick random operation
            op_type, (min_tokens, max_tokens) = random.choice(operation_types)
            tokens = random.randint(min_tokens, max_tokens)
            
            # Random success rate (90%)
            success = random.random() < 0.9
            
            # Random response time (200ms - 3000ms)
            response_time = random.uniform(200, 3000)
            
            # Log the operation
            usage_tracker.log_operation(
                user_id=user_id,
                endpoint=f"/ai/{op_type.replace('_', '/')}",
                operation_type=op_type,
                tokens_used=tokens,
                success=success,
                response_time_ms=response_time,
                metadata={
                    "simulated": True,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            total_operations += 1
            
            # Show progress
            if (i + 1) % 5 == 0:
                print(f"   ✓ {i + 1}/{operations_per_user} operations logged")
            
            # Small delay to spread timestamps
            time.sleep(0.1)
    
    print("\n" + "=" * 60)
    print(f"✅ Simulation Complete!")
    print(f"   Total operations: {total_operations}")
    print(f"   Users: {num_users}")
    print(f"   Operations per user: {operations_per_user}")
    
    # Show current stats
    print("\n📊 Current Statistics:")
    realtime = usage_tracker.get_realtime_stats()
    if "error" not in realtime:
        print(f"   Last hour: {realtime['last_hour']['total_operations']} operations")
        print(f"   Active users: {realtime['last_hour']['active_users']}")
        print(f"   Total tokens: {realtime['last_hour']['total_tokens']:,}")
        print(f"   Success rate: {realtime['last_hour']['success_rate']}%")
    
    print("\n💡 Tip: Refresh your admin dashboard to see the updated data!")
    print("   The dashboard auto-refreshes every 30 seconds.")


def clear_test_data():
    """Clear all test data from the database."""
    print("\n🧹 Clearing Test Data")
    print("=" * 60)
    
    try:
        from pymongo import MongoClient
        from config import CONFIG
        
        client = MongoClient(CONFIG["mongo_uri"])
        db = client[CONFIG["mongo_db"]]
        
        # Clear usage logs
        result1 = db["usage_logs"].delete_many({"user_id": {"$regex": "^(test_user|user_)"}})
        print(f"   ✓ Deleted {result1.deleted_count} usage log entries")
        
        # Clear daily stats
        result2 = db["daily_stats"].delete_many({"user_id": {"$regex": "^(test_user|user_)"}})
        print(f"   ✓ Deleted {result2.deleted_count} daily stat entries")
        
        client.close()
        
        print("\n✅ Test data cleared successfully!")
        
    except Exception as e:
        print(f"\n❌ Error clearing data: {e}")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("USAGE TRACKING - OPERATION SIMULATOR")
    print("=" * 60)
    
    print("\nWhat would you like to do?")
    print("  1. Simulate operations (realistic data)")
    print("  2. Clear all test data")
    print("  3. Both (clear then simulate)")
    print("  4. Exit")
    
    choice = input("\nEnter choice (1-4): ").strip()
    
    if choice == "1":
        num_users = int(input("Number of users (default 5): ") or "5")
        ops_per_user = int(input("Operations per user (default 10): ") or "10")
        simulate_operations(num_users, ops_per_user)
        
    elif choice == "2":
        confirm = input("Are you sure you want to clear all test data? (yes/no): ")
        if confirm.lower() == "yes":
            clear_test_data()
        else:
            print("Cancelled.")
            
    elif choice == "3":
        clear_test_data()
        time.sleep(1)
        simulate_operations(5, 10)
        
    else:
        print("Goodbye!")
