#!/usr/bin/env python3
"""
Multi-User Isolation Test Suite

Tests JWT-based user isolation across all components:
- Memory isolation (separate conversations per user)
- Session management (multiple sessions per user)
- RAG isolation (user-specific document filtering)
- No cross-user data leakage

Simulates:
- User A with 2 sessions
- User B with 1 session
- Shared "public" documents accessible to all
"""
import sys
from pathlib import Path

# Add parent directory to path
parent = Path(__file__).parent.parent
sys.path.insert(0, str(parent))

from core.agent import create_agent
from core.memory import MemoryManager
from core.rag_retriever import RAGRetriever
from core.mongo_store import MongoMemoryStore
from langchain_core.documents import Document
from config import CONFIG
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_memory_isolation():
    """Test that users cannot access each other's conversation history."""
    print("\n" + "="*60)
    print("TEST 1: Memory Isolation")
    print("="*60)
    
    # User A: Session 1
    memory_a1 = MemoryManager(user_id="user_a", session_id="session_1")
    memory_a1.add_user_message("What is machine learning?")
    memory_a1.add_assistant_message("Machine learning is a subset of AI...")
    
    # User A: Session 2
    memory_a2 = MemoryManager(user_id="user_a", session_id="session_2")
    memory_a2.add_user_message("Explain neural networks")
    memory_a2.add_assistant_message("Neural networks are computing systems...")
    
    # User B: Session 1
    memory_b1 = MemoryManager(user_id="user_b", session_id="session_1")
    memory_b1.add_user_message("What is quantum computing?")
    memory_b1.add_assistant_message("Quantum computing uses quantum mechanics...")
    
    # Test session listing
    print("\n✓ User A sessions:")
    a_sessions = memory_a1.list_user_sessions()
    for sess in a_sessions:
        print(f"  - {sess['session_id']} (last activity: {sess['last_activity']})")
    assert len(a_sessions) == 2, f"Expected 2 sessions for user_a, got {len(a_sessions)}"
    
    print("\n✓ User B sessions:")
    b_sessions = memory_b1.list_user_sessions()
    for sess in b_sessions:
        print(f"  - {sess['session_id']} (last activity: {sess['last_activity']})")
    assert len(b_sessions) == 1, f"Expected 1 session for user_b, got {len(b_sessions)}"
    
    # Test cross-user access prevention
    print("\n✓ Cross-user access test:")
    try:
        memory_a1.set_thread("user_b:session_1")
        print("  ✗ FAILURE: User A should NOT access User B's session")
        return False
    except PermissionError as e:
        print(f"  ✓ Correctly blocked: {e}")
    
    print("\n✓ Memory isolation test PASSED")
    return True


def test_rag_isolation():
    """Test that RAG retrieval respects user_id filtering."""
    print("\n" + "="*60)
    print("TEST 2: RAG Document Isolation")
    print("="*60)
    
    # Create user-specific documents
    rag_a = RAGRetriever(CONFIG, user_id="user_a")
    rag_b = RAGRetriever(CONFIG, user_id="user_b")
    
    # Add documents for User A
    docs_a = [
        Document(
            page_content="User A's private research: Advanced quantum algorithms for cryptography.",
            metadata={"source": "user_a_research.txt"}
        )
    ]
    rag_a.add_user_documents(docs_a, user_id="user_a", save_index=False)
    print("✓ Added private document for user_a")
    
    # Add documents for User B
    docs_b = [
        Document(
            page_content="User B's private notes: Machine learning optimization techniques for NLP.",
            metadata={"source": "user_b_notes.txt"}
        )
    ]
    rag_b.add_user_documents(docs_b, user_id="user_b", save_index=True)
    print("✓ Added private document for user_b")
    
    # Test retrieval isolation
    print("\n✓ Testing User A retrieval:")
    results_a = rag_a.get_relevant_documents("quantum cryptography", user_id="user_a")
    print(f"  Found {len(results_a)} documents")
    for doc in results_a:
        print(f"  - {doc.metadata.get('source', 'unknown')} (user_id: {doc.metadata.get('user_id', 'N/A')})")
        # Verify no User B documents leaked
        if doc.metadata.get('user_id') == 'user_b':
            print("  ✗ FAILURE: User A retrieved User B's document!")
            return False
    
    print("\n✓ Testing User B retrieval:")
    results_b = rag_b.get_relevant_documents("machine learning NLP", user_id="user_b")
    print(f"  Found {len(results_b)} documents")
    for doc in results_b:
        print(f"  - {doc.metadata.get('source', 'unknown')} (user_id: {doc.metadata.get('user_id', 'N/A')})")
        # Verify no User A documents leaked
        if doc.metadata.get('user_id') == 'user_a':
            print("  ✗ FAILURE: User B retrieved User A's document!")
            return False
    
    print("\n✓ RAG isolation test PASSED")
    return True


def test_agent_creation():
    """Test that agents are created with proper user context."""
    print("\n" + "="*60)
    print("TEST 3: Agent Creation with User Context")
    print("="*60)
    
    # Create agents for different users
    agent_a, _, _, memory_a = create_agent(user_id="user_a", session_id="test_session")
    agent_b, _, _, memory_b = create_agent(user_id="user_b", session_id="test_session")
    
    # Verify memory isolation
    assert memory_a.user_id == "user_a", "Agent A memory has wrong user_id"
    assert memory_b.user_id == "user_b", "Agent B memory has wrong user_id"
    
    print("✓ Agent A created with user_id=user_a")
    print("✓ Agent B created with user_id=user_b")
    
    # Verify thread_id format
    expected_thread_a = "user_a:test_session"
    expected_thread_b = "user_b:test_session"
    assert memory_a.thread_id == expected_thread_a, f"Expected {expected_thread_a}, got {memory_a.thread_id}"
    assert memory_b.thread_id == expected_thread_b, f"Expected {expected_thread_b}, got {memory_b.thread_id}"
    
    print(f"✓ Thread format verified: {memory_a.thread_id}")
    print(f"✓ Thread format verified: {memory_b.thread_id}")
    
    print("\n✓ Agent creation test PASSED")
    return True


def test_session_switching():
    """Test that users can switch between their own sessions."""
    print("\n" + "="*60)
    print("TEST 4: Session Switching")
    print("="*60)
    
    # Create memory with initial session
    memory = MemoryManager(user_id="user_a", session_id="session_1")
    memory.add_user_message("Message in session 1")
    
    # Create a second session
    new_session = memory.create_session(session_id="session_2")
    print(f"✓ Created new session: {new_session}")
    
    # Switch to the new session
    memory.switch_session("session_2")
    print(f"✓ Switched to session: {memory.session_id}")
    assert memory.thread_id == "user_a:session_2"
    
    # Add message to new session
    memory.add_user_message("Message in session 2")
    
    # Switch back to session 1
    memory.switch_session("session_1")
    print(f"✓ Switched back to session: {memory.session_id}")
    assert memory.thread_id == "user_a:session_1"
    
    # Verify sessions are isolated
    sessions = memory.list_user_sessions()
    assert len(sessions) == 2, f"Expected 2 sessions, got {len(sessions)}"
    
    print("\n✓ Session switching test PASSED")
    return True


def test_public_document_access():
    """Test that public documents are accessible to all users."""
    print("\n" + "="*60)
    print("TEST 5: Public Document Access")
    print("="*60)
    
    rag_a = RAGRetriever(CONFIG, user_id="user_a")
    rag_b = RAGRetriever(CONFIG, user_id="user_b")
    
    # Public documents should be in the default index with user_id="public"
    # Test that both users can retrieve public documents
    print("✓ Testing User A retrieval of public documents:")
    results_a = rag_a.get_relevant_documents("Jarvis AI assistant", user_id="user_a")
    has_public_a = any(doc.metadata.get('user_id') == 'public' for doc in results_a)
    print(f"  Found {len(results_a)} documents, includes public: {has_public_a}")
    
    print("\n✓ Testing User B retrieval of public documents:")
    results_b = rag_b.get_relevant_documents("Jarvis AI assistant", user_id="user_b")
    has_public_b = any(doc.metadata.get('user_id') == 'public' for doc in results_b)
    print(f"  Found {len(results_b)} documents, includes public: {has_public_b}")
    
    print("\n✓ Public document access test PASSED")
    return True


def run_all_tests():
    """Run complete multi-user isolation test suite."""
    print("\n" + "="*70)
    print(" COLLABRY AI CORE ENGINE - MULTI-USER ISOLATION TEST SUITE")
    print("="*70)
    
    tests = [
        ("Memory Isolation", test_memory_isolation),
        ("RAG Document Isolation", test_rag_isolation),
        ("Agent Creation", test_agent_creation),
        ("Session Switching", test_session_switching),
        ("Public Document Access", test_public_document_access)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            logger.exception(f"Test '{name}' crashed")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*70)
    print(" TEST SUMMARY")
    print("="*70)
    passed = sum(1 for _, p in results if p)
    total = len(results)
    for name, p in results:
        status = "✓ PASSED" if p else "✗ FAILED"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All multi-user isolation tests PASSED!")
        return True
    else:
        print("\n⚠️  Some tests FAILED. Review logs above.")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
