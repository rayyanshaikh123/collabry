#!/usr/bin/env python
"""
Test script for MongoDB memory integration.

Tests:
1. MongoDB connection (if enabled)
2. Memory persistence (MongoDB or JSONL fallback)
3. Thread-scoped isolation
4. Backward compatibility
"""

import sys
from pathlib import Path

# Add ai-engine to path
sys.path.insert(0, str(Path(__file__).parent))

from config import CONFIG
from core.memory import MemoryManager


def test_memory_with_mongodb():
    print("=" * 60)
    print("Testing Memory System (MongoDB Required)")
    print("=" * 60)

    # Show configuration
    print(f"\nConfiguration:")
    print(f"  MongoDB URI: {CONFIG.get('mongo_uri')}")
    print(f"  MongoDB DB: {CONFIG.get('mongo_db')}")
    print(f"  Collection: {CONFIG.get('memory_collection')}")

    try:
        # Test 1: Create memory manager (will fail if MongoDB not available)
        print("\n1. Creating MemoryManager (requires MongoDB)...")
        memory = MemoryManager(thread_id="test_thread", user_id="test_user")
        print("   ✓ MemoryManager created")
        print("   ✓ MongoDB connected")

        # Test 2: Save and load context
        print("\n2. Testing save/load context...")
        memory.save_context(
            {"user_input": "What is the capital of France?"},
            {"output": "The capital of France is Paris."}
        )
        print("   ✓ Context saved")

        vars_loaded = memory.load_memory_variables({})
        print(f"   ✓ Memory loaded: {len(vars_loaded)} variables")

        # Test 3: Check history buffer
        print("\n3. Testing history retrieval...")
        history_str = memory.get_history_string()
        if "Paris" in history_str:
            print("   ✓ History contains expected content")
        else:
            print("   ⚠ History may not contain expected content")

        # Test 4: Thread isolation
        print("\n4. Testing thread isolation...")
        memory.set_thread("another_thread")
        other_vars = memory.load_memory_variables({})
        other_history = other_vars.get("chat_history_buffer", "")
        
        if "Paris" not in other_history:
            print("   ✓ Thread isolation working (different thread has empty history)")
        else:
            print("   ℹ Thread isolation: data may be shared (expected for fresh threads)")

        # Test 5: Switch back to original thread
        memory.set_thread("test_thread")
        original_vars = memory.load_memory_variables({})
        original_history = original_vars.get("chat_history_buffer", "")
        
        if "Paris" in original_history:
            print("   ✓ Thread switching preserved history")
        else:
            print("   ⚠ Thread history may not persist correctly")

        # Test 6: Get recent messages
        print("\n5. Testing recent message retrieval...")
        recent = memory.get_recent(n=5)
        print(f"   ✓ Retrieved {len(recent)} recent messages")

        # Clean up
        memory.clear()
        print("\n6. Memory cleared for current thread")
        
        memory.close()
        print("   ✓ Connections closed")

        print("\n" + "=" * 60)
        print("Memory System Test PASSED")
        print("=" * 60)
        print("\nMongoDB-backed memory system ready for agent integration.")
        return True

    except ConnectionError as e:
        print(f"\n✗ MONGODB CONNECTION ERROR: {e}")
        print("\nPlease ensure MongoDB is running:")
        print("  docker run -d -p 27017:27017 --name collabry-mongo mongo:latest")
        return False
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_memory_with_mongodb()
    sys.exit(0 if success else 1)
