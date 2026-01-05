"""Complete test: Login to backend and use token with AI Engine"""
import requests
import json

print("\n" + "=" * 70)
print("🧪 Complete Authentication & Chat Test")
print("=" * 70)

# Step 1: Login to backend to get a valid token
print("\n📝 Step 1: Login to backend...")
backend_url = "http://localhost:5000/api/auth/login"
login_data = {
    "email": "rayyan.shaikhh@gmail.com",
  
    "password": "Aug@1975"
}

try:
    login_response = requests.post(backend_url, json=login_data, timeout=5)
    print(f"   Status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        login_result = login_response.json()
        print(f"   📦 Full response: {json.dumps(login_result, indent=6)}")
        
        # Backend returns: { data: { accessToken, refreshToken, user } }
        data = login_result.get('data', {})
        token = data.get('accessToken')
        user = data.get('user')
        
        if not token:
            print(f"   ❌ No token in response!")
            exit(1)
            
        print(f"   ✅ Login successful!")
        if user:
            print(f"   👤 User: {user.get('name', 'N/A')} ({user.get('email', 'N/A')})")
        print(f"   🔑 Token (first 30): {token[:30]}...")
        
    else:
        print(f"   ❌ Login failed: {login_response.text}")
        print("\n⚠️  Make sure backend is running on port 5000")
        exit(1)
        
except requests.exceptions.ConnectionError:
    print("   ❌ Cannot connect to backend on port 5000!")
    print("   Start backend with: cd backend && npm start")
    exit(1)
except Exception as e:
    print(f"   ❌ Error: {e}")
    exit(1)

# Step 2: Use token to chat with AI Engine
print("\n💬 Step 2: Chat with AI Engine...")
ai_url = "http://localhost:8000/ai/chat"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
chat_data = {
    "message": "hi, test message",
    "session_id": None,
    "stream": False
}

try:
    print(f"   📍 URL: {ai_url}")
    print(f"   📦 Payload: {json.dumps(chat_data, indent=6)}")
    
    chat_response = requests.post(ai_url, headers=headers, json=chat_data, timeout=30)
    print(f"\n   📊 Status: {chat_response.status_code}")
    
    if chat_response.status_code == 200:
        result = chat_response.json()
        print(f"   ✅ Chat successful!")
        print(f"\n   🤖 AI Response:")
        print(f"   {result.get('response', 'No response')}")
        print(f"\n   📋 Session ID: {result.get('session_id')}")
        print(f"   👤 User ID: {result.get('user_id')}")
        
    else:
        print(f"   ❌ Chat failed!")
        print(f"   Response: {chat_response.text}")
        
except requests.exceptions.ConnectionError:
    print("   ❌ Cannot connect to AI Engine on port 8000!")
    print("   Start AI Engine with: cd ai-engine && python run_server.py")
except requests.exceptions.Timeout:
    print("   ❌ Request timed out - AI Engine is taking too long")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "=" * 70)
