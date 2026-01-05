"""Direct API test to AI Engine"""
import requests
import json

# Get token from your browser console (the actual token after "Bearer ")
token = input("Paste the JWT token from browser console: ").strip()

url = "http://localhost:8000/ai/chat"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
data = {
    "message": "hi",
    "session_id": None,
    "stream": False
}

print("\n" + "=" * 60)
print("🧪 Testing AI Engine Chat Endpoint")
print("=" * 60)
print(f"\n📍 URL: {url}")
print(f"🔑 Token (first 30 chars): {token[:30]}...")
print(f"📦 Payload: {json.dumps(data, indent=2)}")

try:
    print("\n⏳ Sending request...")
    response = requests.post(url, headers=headers, json=data, timeout=10)
    
    print(f"\n📊 Status Code: {response.status_code}")
    print(f"📄 Response Headers: {dict(response.headers)}")
    print(f"\n💬 Response Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
        
except requests.exceptions.ConnectionError:
    print("\n❌ Connection Error - AI Engine not running on port 8000!")
except requests.exceptions.Timeout:
    print("\n❌ Timeout - AI Engine took too long to respond!")
except Exception as e:
    print(f"\n❌ Error: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
