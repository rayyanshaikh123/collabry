"""
FastAPI Client Examples

Demonstrates how to interact with the Collabry AI Core API.

Prerequisites:
- Server running: python run_server.py
- .env configured with JWT_SECRET_KEY

Examples:
1. Health check (no auth)
2. Create JWT token
3. Chat with AI
4. Upload document
5. Summarize text
6. Question answering
7. Generate mind map
8. Session management
"""
import requests
from jose import jwt
from datetime import datetime, timedelta
from config import CONFIG

# Server configuration
BASE_URL = "http://localhost:8000"


def create_jwt_token(user_id: str, exp_hours: int = 24) -> str:
    """
    Create a JWT token for testing.
    
    In production, your auth service creates this token.
    """
    payload = {
        "sub": user_id,  # User ID
        "exp": datetime.utcnow() + timedelta(hours=exp_hours),
        "iat": datetime.utcnow()
    }
    return jwt.encode(
        payload,
        CONFIG["jwt_secret_key"],
        algorithm=CONFIG["jwt_algorithm"]
    )


# ============================================================================
# Example 1: Health Check (No Auth)
# ============================================================================

def example_health_check():
    """Check server health status."""
    print("\n" + "=" * 60)
    print("EXAMPLE 1: Health Check")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/health")
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Overall status: {data['status']}")
    print(f"MongoDB: {data['components']['mongodb']}")
    print(f"Ollama: {data['components']['ollama']}")
    
    return response.status_code == 200


# ============================================================================
# Example 2: Chat with AI
# ============================================================================

def example_chat():
    """Chat with AI assistant."""
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Chat with AI")
    print("=" * 60)
    
    # Create JWT token
    user_id = "demo_user"
    token = create_jwt_token(user_id)
    
    # Prepare request
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "message": "What are the benefits of spaced repetition for learning?",
        "stream": False
    }
    
    print(f"User: {payload['message']}")
    print("\nSending request...")
    
    response = requests.post(
        f"{BASE_URL}/ai/chat",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nAI Response:\n{data['response']}")
        print(f"\nSession ID: {data['session_id']}")
        print(f"User ID: {data['user_id']}")
        if data.get('tool_used'):
            print(f"Tool used: {data['tool_used']}")
        return data['session_id']  # Return for session examples
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None


# ============================================================================
# Example 3: Streaming Chat
# ============================================================================

def example_streaming_chat(session_id: str = None):
    """Chat with streaming response."""
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Streaming Chat")
    print("=" * 60)
    
    user_id = "demo_user"
    token = create_jwt_token(user_id)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "message": "Explain active recall in 2 sentences.",
        "stream": True
    }
    
    if session_id:
        payload["session_id"] = session_id
        print(f"Using existing session: {session_id}")
    
    print(f"User: {payload['message']}")
    print("\nAI Response (streaming):")
    
    response = requests.post(
        f"{BASE_URL}/ai/chat/stream",
        json=payload,
        headers=headers,
        stream=True
    )
    
    if response.status_code == 200:
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    chunk = line_str[6:]  # Remove 'data: ' prefix
                    print(chunk, end='', flush=True)
                elif line_str.startswith('event: done'):
                    print("\n\n[Stream complete]")
    else:
        print(f"Error: {response.status_code} - {response.text}")


# ============================================================================
# Example 4: Upload Document
# ============================================================================

def example_upload_document():
    """Upload document for RAG."""
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Upload Document for RAG")
    print("=" * 60)
    
    user_id = "demo_user"
    token = create_jwt_token(user_id)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Sample document content
    document_content = """
    Spaced repetition is a learning technique that incorporates increasing intervals 
    of time between subsequent review of previously learned material in order to 
    exploit the psychological spacing effect. It is based on the principle that 
    information is more easily recalled if exposure to it is repeated over time.
    
    The optimal intervals can be determined by the Leitner system or SuperMemo algorithms. 
    Popular spaced repetition software includes Anki, SuperMemo, and Quizlet.
    """
    
    payload = {
        "content": document_content,
        "filename": "spaced_repetition_basics.txt",
        "metadata": {
            "category": "learning_science",
            "topic": "memory_techniques"
        }
    }
    
    print(f"Uploading document: {payload['filename']}")
    print(f"Content length: {len(payload['content'])} chars")
    
    response = requests.post(
        f"{BASE_URL}/ai/upload",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        task_id = data['task_id']
        print(f"\n✓ Upload initiated")
        print(f"Task ID: {task_id}")
        print(f"Status: {data['status']}")
        
        # Check status after a moment
        import time
        time.sleep(2)
        
        print("\nChecking upload status...")
        status_response = requests.get(
            f"{BASE_URL}/ai/upload/status/{task_id}",
            headers=headers
        )
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"Status: {status_data['status']}")
            if status_data.get('error'):
                print(f"Error: {status_data['error']}")
        
        return task_id
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None


# ============================================================================
# Example 5: Summarize Text
# ============================================================================

def example_summarize():
    """Summarize text."""
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Summarize Text")
    print("=" * 60)
    
    user_id = "demo_user"
    token = create_jwt_token(user_id)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    text_to_summarize = """
    Machine learning is a subset of artificial intelligence that provides systems 
    the ability to automatically learn and improve from experience without being 
    explicitly programmed. Machine learning focuses on the development of computer 
    programs that can access data and use it to learn for themselves. The process 
    of learning begins with observations or data, such as examples, direct experience, 
    or instruction, in order to look for patterns in data and make better decisions 
    in the future based on the examples that we provide.
    """
    
    payload = {
        "text": text_to_summarize,
        "style": "concise",
        "max_length": 50
    }
    
    print(f"Text length: {len(payload['text'])} chars")
    print(f"Style: {payload['style']}")
    
    response = requests.post(
        f"{BASE_URL}/ai/summarize",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nSummary:\n{data['summary']}")
        print(f"\nOriginal: {data['original_length']} chars")
        print(f"Summary: {data['summary_length']} chars")
        print(f"Compression: {100 - (data['summary_length'] / data['original_length'] * 100):.1f}%")
    else:
        print(f"Error: {response.status_code} - {response.text}")


# ============================================================================
# Example 6: Question Answering
# ============================================================================

def example_qa_with_rag():
    """Question answering with RAG."""
    print("\n" + "=" * 60)
    print("EXAMPLE 6: Question Answering with RAG")
    print("=" * 60)
    
    user_id = "demo_user"
    token = create_jwt_token(user_id)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "question": "What is spaced repetition and which software implements it?",
        "use_rag": True,  # Use previously uploaded documents
        "top_k": 3
    }
    
    print(f"Question: {payload['question']}")
    print(f"Using RAG: {payload['use_rag']}")
    
    response = requests.post(
        f"{BASE_URL}/ai/qa",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nAnswer:\n{data['answer']}")
        
        if data.get('sources'):
            print(f"\n📚 Sources ({len(data['sources'])}):")
            for i, source in enumerate(data['sources'], 1):
                print(f"\n{i}. {source['source']}")
                print(f"   {source['content'][:100]}...")
    else:
        print(f"Error: {response.status_code} - {response.text}")


# ============================================================================
# Example 7: Generate Mind Map
# ============================================================================

def example_mindmap():
    """Generate mind map."""
    print("\n" + "=" * 60)
    print("EXAMPLE 7: Generate Mind Map")
    print("=" * 60)
    
    user_id = "demo_user"
    token = create_jwt_token(user_id)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "topic": "Effective Study Techniques",
        "depth": 2,
        "use_documents": True
    }
    
    print(f"Topic: {payload['topic']}")
    print(f"Depth: {payload['depth']}")
    
    response = requests.post(
        f"{BASE_URL}/ai/mindmap",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n📊 Mind Map: {data['topic']}")
        print(f"Total nodes: {data['total_nodes']}")
        
        # Print tree structure
        def print_node(node, indent=0):
            print("  " * indent + f"- {node['label']}")
            for child in node.get('children', []):
                print_node(child, indent + 1)
        
        print_node(data['root'])
    else:
        print(f"Error: {response.status_code} - {response.text}")


# ============================================================================
# Example 8: Session Management
# ============================================================================

def example_session_management():
    """Manage user sessions."""
    print("\n" + "=" * 60)
    print("EXAMPLE 8: Session Management")
    print("=" * 60)
    
    user_id = "demo_user"
    token = create_jwt_token(user_id)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # List existing sessions
    print("Listing sessions...")
    response = requests.get(f"{BASE_URL}/ai/sessions", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nUser: {data['user_id']}")
        print(f"Total sessions: {data['total']}")
        
        if data['sessions']:
            for session in data['sessions'][:5]:  # Show first 5
                print(f"  - {session['session_id']}")
    
    # Create new session
    print("\nCreating new session...")
    response = requests.post(f"{BASE_URL}/ai/sessions", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Created session: {data['session_id']}")
        return data['session_id']
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None


# ============================================================================
# Run All Examples
# ============================================================================

def run_all_examples():
    """Run all example interactions."""
    print("=" * 60)
    print("Collabry AI Core - FastAPI Client Examples")
    print("=" * 60)
    print(f"Server: {BASE_URL}")
    
    try:
        # 1. Health check
        if not example_health_check():
            print("\n⚠️  Server health check failed. Is the server running?")
            print("Start with: python run_server.py")
            return
        
        # 2. Chat
        session_id = example_chat()
        
        # 3. Streaming chat (use same session if available)
        if session_id:
            example_streaming_chat(session_id)
        
        # 4. Upload document
        example_upload_document()
        
        # 5. Summarize
        example_summarize()
        
        # 6. Q&A with RAG
        example_qa_with_rag()
        
        # 7. Mind map
        example_mindmap()
        
        # 8. Session management
        example_session_management()
        
        print("\n" + "=" * 60)
        print("✓ All examples completed!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. View API docs: http://localhost:8000/docs")
        print("2. Try your own requests")
        print("3. Integrate with your frontend")
        
    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Cannot connect to server")
        print(f"Make sure server is running at {BASE_URL}")
        print("Start with: python run_server.py")
    except Exception as e:
        print(f"\n✗ ERROR: {e}")


if __name__ == "__main__":
    run_all_examples()
