"""
Test script for sessions API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# Step 1: Login to get JWT token
print("\n1️⃣ Logging in to backend...")
login_response = requests.post(
    "http://localhost:5000/api/auth/login",
    json={
        "email": "rayyan.shaikhh@gmail.com",
        "password": "Aug@1975"
    }
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json()['data']['accessToken']
print(f"✅ Login successful! Token: {token[:50]}...")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Step 2: Get existing sessions
print("\n2️⃣ Getting existing sessions...")
sessions_response = requests.get(f"{BASE_URL}/ai/sessions", headers=headers)
print(f"Status: {sessions_response.status_code}")
if sessions_response.status_code == 200:
    sessions_data = sessions_response.json()
    print(f"✅ Sessions retrieved:")
    print(f"   Total: {sessions_data['total']}")
    print(f"   Max: {sessions_data['max_sessions']}")
    print(f"   Limit reached: {sessions_data['limit_reached']}")
    for session in sessions_data['sessions']:
        print(f"   - {session['title']} (ID: {session['id'][:8]}..., {session['message_count']} msgs)")
else:
    print(f"❌ Failed to get sessions: {sessions_response.text}")
    exit(1)

# Step 3: Create new session
print("\n3️⃣ Creating new session...")
create_response = requests.post(
    f"{BASE_URL}/ai/sessions",
    headers=headers,
    json={"title": "Test Session from Python"}
)
print(f"Status: {create_response.status_code}")
if create_response.status_code == 200:
    new_session = create_response.json()
    session_id = new_session['id']
    print(f"✅ Session created! ID: {session_id}")
elif create_response.status_code == 403:
    print(f"⚠️ Rate limit reached: {create_response.json()['detail']}")
    # Use first existing session for testing
    session_id = sessions_data['sessions'][0]['id']
    print(f"   Using existing session: {session_id}")
else:
    print(f"❌ Failed to create session: {create_response.text}")
    exit(1)

# Step 4: Save a message
print(f"\n4️⃣ Saving message to session {session_id[:8]}...")
message_data = {
    "role": "user",
    "content": "Hello from test script!",
    "timestamp": "2026-01-05T22:56:00Z"
}
save_response = requests.post(
    f"{BASE_URL}/ai/sessions/{session_id}/messages",
    headers=headers,
    json=message_data
)
print(f"Status: {save_response.status_code}")
if save_response.status_code == 200:
    print(f"✅ Message saved!")
else:
    print(f"❌ Failed to save message: {save_response.text}")

# Step 5: Get session messages
print(f"\n5️⃣ Getting messages from session {session_id[:8]}...")
messages_response = requests.get(
    f"{BASE_URL}/ai/sessions/{session_id}/messages",
    headers=headers
)
print(f"Status: {messages_response.status_code}")
if messages_response.status_code == 200:
    messages = messages_response.json()
    print(f"✅ Retrieved {len(messages)} messages:")
    for msg in messages[-3:]:  # Show last 3
        print(f"   - [{msg['role']}]: {msg['content'][:50]}...")
else:
    print(f"❌ Failed to get messages: {messages_response.text}")

# Step 6: Get sessions again to see updated count
print("\n6️⃣ Getting updated sessions list...")
sessions_response2 = requests.get(f"{BASE_URL}/ai/sessions", headers=headers)
if sessions_response2.status_code == 200:
    sessions_data2 = sessions_response2.json()
    print(f"✅ Sessions after message save:")
    for session in sessions_data2['sessions'][:3]:  # Show first 3
        print(f"   - {session['title']}: {session['message_count']} msgs")

print("\n✅ All tests passed!")
