"""
Test script for streaming summarization endpoint.
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
TOKEN = "your_jwt_token_here"  # Replace with actual token from login

def test_summarize_stream():
    """Test the streaming summarization endpoint."""
    
    # Sample text to summarize
    text = """
    Artificial Intelligence (AI) has become one of the most transformative technologies 
    of the 21st century. It encompasses machine learning, deep learning, natural language 
    processing, and computer vision. AI systems can now perform tasks that previously 
    required human intelligence, such as recognizing speech, making decisions, and 
    translating languages. The field has seen rapid advancement due to increased 
    computational power, availability of large datasets, and improved algorithms. 
    Major tech companies are investing heavily in AI research and development, leading 
    to breakthrough applications in healthcare, finance, autonomous vehicles, and more.
    """
    
    # Request payload
    payload = {
        "text": text,
        "style": "concise",
        "max_length": 50
    }
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    print("🚀 Testing streaming summarization endpoint...")
    print(f"📝 Text length: {len(text)} characters\n")
    
    try:
        # Make streaming request
        with requests.post(
            f"{BASE_URL}/ai/summarize/stream",
            json=payload,
            headers=headers,
            stream=True
        ) as response:
            
            if response.status_code != 200:
                print(f"❌ Error: {response.status_code}")
                print(response.text)
                return
            
            print("✅ Streaming response:\n")
            print("-" * 60)
            
            # Process SSE stream
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    
                    # Handle SSE format
                    if line.startswith('data: '):
                        content = line[6:]  # Remove 'data: ' prefix
                        if content:
                            print(content, end='', flush=True)
                    
                    elif line.startswith('event: done'):
                        print("\n" + "-" * 60)
                        print("✅ Stream completed!")
                        break
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")


def test_regular_summarize():
    """Test the regular (non-streaming) summarization endpoint."""
    
    text = """
    Machine learning is a subset of artificial intelligence that enables systems to 
    learn and improve from experience without being explicitly programmed. It focuses 
    on developing algorithms that can access data and use it to learn for themselves.
    """
    
    payload = {
        "text": text,
        "style": "bullet",
    }
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    print("\n\n🚀 Testing regular summarization endpoint...")
    print(f"📝 Text length: {len(text)} characters\n")
    
    try:
        response = requests.post(
            f"{BASE_URL}/ai/summarize",
            json=payload,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Response:\n")
            print("-" * 60)
            print(result['summary'])
            print("-" * 60)
            print(f"\n📊 Stats:")
            print(f"  Original: {result['original_length']} chars")
            print(f"  Summary: {result['summary_length']} chars")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("SUMMARIZATION ENDPOINTS TEST")
    print("=" * 60)
    print("\n⚠️  Make sure to:")
    print("  1. Start the AI engine server")
    print("  2. Update TOKEN variable with a valid JWT token")
    print("=" * 60)
    
    # Run tests
    test_summarize_stream()
    test_regular_summarize()
