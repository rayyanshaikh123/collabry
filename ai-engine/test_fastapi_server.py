"""
FastAPI Server Integration Tests

Tests all endpoints with JWT authentication.

Prerequisites:
- MongoDB running at mongodb://localhost:27017
- Ollama running at http://localhost:11434
- JWT_SECRET_KEY configured in .env

Usage:
    python test_fastapi_server.py
"""
import requests
import json
from datetime import datetime, timedelta
from jose import jwt
from config import CONFIG

# Server configuration
BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test_user_123"
JWT_SECRET = CONFIG["jwt_secret_key"]
JWT_ALGORITHM = CONFIG["jwt_algorithm"]


def create_test_jwt(user_id: str = TEST_USER_ID, exp_minutes: int = 60) -> str:
    """Create a test JWT token."""
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=exp_minutes),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def test_health_check():
    """Test health check endpoint (no auth required)."""
    print("\n" + "=" * 60)
    print("TEST: Health Check")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    assert response.json()["status"] in ["healthy", "degraded"]
    print("✓ Health check passed")


def test_root_endpoint():
    """Test root endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Root Endpoint")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    assert "message" in response.json()
    print("✓ Root endpoint passed")


def test_chat_endpoint():
    """Test chat endpoint with JWT authentication."""
    print("\n" + "=" * 60)
    print("TEST: Chat Endpoint")
    print("=" * 60)
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "message": "What is the capital of France?",
        "stream": False
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/ai/chat", json=payload, headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {data['response'][:200]}...")
        print(f"Session ID: {data['session_id']}")
        print(f"User ID: {data['user_id']}")
        assert data["user_id"] == TEST_USER_ID
        print("✓ Chat endpoint passed")
    else:
        print(f"Error: {response.text}")
        raise AssertionError(f"Chat endpoint failed: {response.status_code}")


def test_session_management():
    """Test session listing and creation."""
    print("\n" + "=" * 60)
    print("TEST: Session Management")
    print("=" * 60)
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    
    # List sessions
    print("Listing sessions...")
    response = requests.get(f"{BASE_URL}/ai/sessions", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Sessions: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    
    # Create new session
    print("\nCreating new session...")
    response = requests.post(f"{BASE_URL}/ai/sessions", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    assert "session_id" in response.json()
    print("✓ Session management passed")


def test_summarize_endpoint():
    """Test summarization endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Summarization Endpoint")
    print("=" * 60)
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "text": "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals.",
        "style": "concise",
        "max_length": 50
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/ai/summarize", json=payload, headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Summary: {data['summary']}")
        print(f"Original length: {data['original_length']}")
        print(f"Summary length: {data['summary_length']}")
        print("✓ Summarization passed")
    else:
        print(f"Error: {response.text}")
        raise AssertionError(f"Summarization failed: {response.status_code}")


def test_document_upload():
    """Test document upload endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Document Upload")
    print("=" * 60)
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "content": "Python is a high-level, interpreted programming language. It emphasizes code readability and supports multiple programming paradigms.",
        "filename": "python_intro.txt",
        "metadata": {"category": "programming", "language": "en"}
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/ai/upload", json=payload, headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Task ID: {data['task_id']}")
        print(f"Status: {data['status']}")
        print(f"Message: {data['message']}")
        
        # Check upload status
        task_id = data['task_id']
        print(f"\nChecking upload status for task: {task_id}")
        import time
        time.sleep(2)  # Wait for background processing
        
        status_response = requests.get(
            f"{BASE_URL}/ai/upload/status/{task_id}",
            headers=headers
        )
        print(f"Status check: {json.dumps(status_response.json(), indent=2)}")
        print("✓ Document upload passed")
    else:
        print(f"Error: {response.text}")
        raise AssertionError(f"Upload failed: {response.status_code}")


def test_qa_endpoint():
    """Test question answering endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Question Answering")
    print("=" * 60)
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "question": "What is Python used for?",
        "use_rag": False,  # Use without RAG for testing
        "context": "Python is used for web development, data science, automation, and AI applications."
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/ai/qa", json=payload, headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Question: {data['question']}")
        print(f"Answer: {data['answer']}")
        print(f"Sources: {len(data['sources'])}")
        print("✓ Q&A passed")
    else:
        print(f"Error: {response.text}")
        raise AssertionError(f"Q&A failed: {response.status_code}")


def test_mindmap_endpoint():
    """Test mind map generation endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Mind Map Generation")
    print("=" * 60)
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "topic": "Machine Learning",
        "depth": 2,
        "use_documents": False
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/ai/mindmap", json=payload, headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Topic: {data['topic']}")
        print(f"Total nodes: {data['total_nodes']}")
        print(f"Root node: {data['root']['label']}")
        print(f"Children: {len(data['root']['children'])}")
        print("✓ Mind map passed")
    else:
        print(f"Error: {response.text}")
        raise AssertionError(f"Mind map failed: {response.status_code}")


def test_unauthorized_access():
    """Test that endpoints require authentication."""
    print("\n" + "=" * 60)
    print("TEST: Unauthorized Access")
    print("=" * 60)
    
    # Try to access chat without token
    payload = {"message": "Hello"}
    response = requests.post(f"{BASE_URL}/ai/chat", json=payload)
    
    print(f"Status (no auth): {response.status_code}")
    assert response.status_code == 403 or response.status_code == 401
    print("✓ Unauthorized access correctly blocked")


def run_all_tests():
    """Run all FastAPI integration tests."""
    print("\n" + "=" * 80)
    print("FastAPI Server Integration Tests")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_USER_ID}")
    print("=" * 80)
    
    tests = [
        ("Health Check", test_health_check),
        ("Root Endpoint", test_root_endpoint),
        ("Unauthorized Access", test_unauthorized_access),
        ("Chat Endpoint", test_chat_endpoint),
        ("Session Management", test_session_management),
        ("Summarization", test_summarize_endpoint),
        ("Document Upload", test_document_upload),
        ("Question Answering", test_qa_endpoint),
        ("Mind Map Generation", test_mindmap_endpoint),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            print(f"\n✗ {name} FAILED: {e}")
            failed += 1
    
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total: {len(tests)}")
    print(f"Passed: {passed} ✓")
    print(f"Failed: {failed} ✗")
    print("=" * 80)
    
    if failed == 0:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {failed} test(s) failed")


if __name__ == "__main__":
    try:
        run_all_tests()
    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Cannot connect to server")
        print(f"Make sure FastAPI server is running at {BASE_URL}")
        print("Start server with: python run_server.py")
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
