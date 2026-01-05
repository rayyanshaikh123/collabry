"""
Simple Direct Test of FastAPI Routes

Quick test to see actual responses.
"""
import requests
import json
from datetime import datetime, timedelta, timezone
from jose import jwt
from config import CONFIG

BASE_URL = "http://localhost:8000"
TEST_USER_ID = "quick_test_user"
JWT_SECRET = CONFIG["jwt_secret_key"]
JWT_ALGORITHM = CONFIG["jwt_algorithm"]


def create_jwt():
    payload = {
        "sub": TEST_USER_ID,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


print("=" * 80)
print("QUICK FASTAPI TEST")
print("=" * 80)

# Test 1: Simple chat
print("\n1. Testing chat endpoint...")
token = create_jwt()
headers = {"Authorization": f"Bearer {token}"}

payload = {
    "message": "What is 2+2?",
    "stream": False
}

print(f"   Sending: {payload['message']}")
response = requests.post(f"{BASE_URL}/ai/chat", headers=headers, json=payload, timeout=30)

print(f"   Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    response_text = data.get('response', '')
    print(f"   Response length: {len(response_text)} characters")
    print(f"   Response preview: {response_text[:200] if response_text else '(EMPTY)'}")
    
    if response_text:
        print("   ✓ Chat working")
    else:
        print("   ✗ Empty response")
        print(f"   Full data: {json.dumps(data, indent=2)}")
else:
    print(f"   ✗ Error: {response.text}")

# Test 2: Summarize
print("\n2. Testing summarize endpoint...")
payload = {
    "text": "The quick brown fox jumps over the lazy dog. This is a simple test sentence.",
    "style": "concise",
    "max_length": 20
}

print(f"   Sending: {len(payload['text'])} characters")
response = requests.post(f"{BASE_URL}/ai/summarize", headers=headers, json=payload, timeout=30)

print(f"   Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    summary = data.get('summary', '')
    print(f"   Summary length: {len(summary)} characters")
    print(f"   Summary: {summary if summary else '(EMPTY)'}")
    
    if summary:
        print("   ✓ Summarize working")
    else:
        print("   ✗ Empty summary")
        print(f"   Full data: {json.dumps(data, indent=2)}")
else:
    print(f"   ✗ Error: {response.text}")

print("\n" + "=" * 80)
print("Test complete")
print("=" * 80)
