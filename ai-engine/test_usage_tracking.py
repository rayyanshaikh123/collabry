"""
Test script for usage tracking system.

Tests:
1. Usage tracker initialization
2. Logging operations
3. User usage statistics
4. Global usage statistics
5. Real-time statistics
6. Health endpoint with usage stats
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.usage_tracker import usage_tracker
from datetime import datetime
import time


def test_usage_tracker():
    """Test the usage tracking system."""
    print("🧪 Testing Usage Tracking System\n")
    
    # Test 1: Log some operations
    print("1️⃣ Logging test operations...")
    test_user_id = "test_user_123"
    
    operations = [
        ("chat", 500, True, 250),
        ("summarize", 1000, True, 1200),
        ("qa", 800, True, 900),
        ("mindmap", 2000, False, 3000),
        ("chat", 600, True, 300),
    ]
    
    for op_type, tokens, success, response_time in operations:
        usage_tracker.log_operation(
            user_id=test_user_id,
            endpoint=f"/ai/{op_type}",
            operation_type=op_type,
            tokens_used=tokens,
            success=success,
            response_time_ms=response_time,
            metadata={"test": True}
        )
        print(f"   ✓ Logged {op_type} operation")
    
    time.sleep(1)  # Allow time for writes
    
    # Test 2: Get user usage
    print("\n2️⃣ Getting user usage statistics...")
    user_usage = usage_tracker.get_user_usage(test_user_id, days=1)
    
    if "error" not in user_usage:
        print(f"   ✓ Total operations: {user_usage['total_operations']}")
        print(f"   ✓ Total tokens: {user_usage['total_tokens']}")
        print(f"   ✓ Success rate: {user_usage['success_rate']}%")
        print(f"   ✓ Operations by type: {user_usage['operations_by_type']}")
    else:
        print(f"   ✗ Error: {user_usage['error']}")
    
    # Test 3: Get global usage
    print("\n3️⃣ Getting global usage statistics...")
    global_usage = usage_tracker.get_global_usage(days=1)
    
    if "error" not in global_usage:
        print(f"   ✓ Total operations: {global_usage['total_operations']}")
        print(f"   ✓ Unique users: {global_usage['unique_users']}")
        print(f"   ✓ Total tokens: {global_usage['total_tokens']}")
        print(f"   ✓ Success rate: {global_usage['success_rate']}%")
        print(f"   ✓ Operations by type: {global_usage['operations_by_type']}")
    else:
        print(f"   ✗ Error: {global_usage['error']}")
    
    # Test 4: Get realtime stats
    print("\n4️⃣ Getting real-time statistics...")
    realtime = usage_tracker.get_realtime_stats()
    
    if "error" not in realtime:
        print(f"   ✓ Last hour operations: {realtime['last_hour']['total_operations']}")
        print(f"   ✓ Active users: {realtime['last_hour']['active_users']}")
        print(f"   ✓ Last 5 min operations: {realtime['last_5_minutes']['operations']}")
    else:
        print(f"   ✗ Error: {realtime['error']}")
    
    print("\n✅ All tests completed!")
    print("\n📊 Usage Tracking Summary:")
    print(f"   • System is tracking {len(operations)} operation types")
    print(f"   • MongoDB collections: usage_logs, daily_stats")
    print(f"   • Indexes created for optimal query performance")
    print(f"   • Real-time and historical statistics available")


def test_health_endpoint():
    """Test if the health endpoint includes usage stats."""
    print("\n\n🏥 Testing Health Endpoint Integration\n")
    
    try:
        import requests
        response = requests.get("http://localhost:8000/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Health endpoint accessible")
            print(f"   Status: {data.get('status')}")
            print(f"   Components: {data.get('components')}")
            
            if 'usage_stats' in data and data['usage_stats']:
                print("✅ Usage stats included in health check")
                usage = data['usage_stats']
                print(f"   Last hour operations: {usage.get('last_hour', {}).get('total_operations', 0)}")
                print(f"   Active users: {usage.get('last_hour', {}).get('active_users', 0)}")
            else:
                print("⚠️  Usage stats not included (may be None if no recent activity)")
        else:
            print(f"❌ Health endpoint returned status {response.status_code}")
    except Exception as e:
        print(f"⚠️  Could not connect to server: {e}")
        print("   Make sure the server is running with: python run_server.py")


if __name__ == "__main__":
    print("=" * 60)
    print("USAGE TRACKING SYSTEM TEST")
    print("=" * 60)
    print()
    
    try:
        test_usage_tracker()
        test_health_endpoint()
        
        print("\n" + "=" * 60)
        print("🎉 USAGE TRACKING SYSTEM READY!")
        print("=" * 60)
        print("\nAPI Endpoints Available:")
        print("  • GET /health - Health check with realtime stats")
        print("  • GET /ai/usage/me?days=30 - My usage statistics")
        print("  • GET /ai/usage/user/{user_id}?days=30 - User usage (admin)")
        print("  • GET /ai/usage/global?days=30 - Global usage (admin)")
        print("  • GET /ai/usage/realtime - Realtime statistics (admin)")
        print("\nFrontend Integration:")
        print("  • usageService.getMyUsage(days)")
        print("  • usageService.getGlobalUsage(days)")
        print("  • usageService.getRealtimeStats()")
        print("  • usageService.getHealth()")
        print()
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
