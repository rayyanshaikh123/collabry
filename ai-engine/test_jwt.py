"""Test JWT token decoding"""
import jwt
from config import CONFIG

# This is a sample token - replace with actual token from browser console
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3N2IyZWFhZjViYjhjMjI3MzRmZDljNyIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzM2MTEzMDcwLCJleHAiOjE3MzYxMTM5NzB9"

print("=" * 60)
print("🔐 JWT Token Decoder Test")
print("=" * 60)
print(f"\n📋 Config:")
print(f"  Secret: {CONFIG['jwt_secret_key']}")
print(f"  Algorithm: {CONFIG['jwt_algorithm']}")

print(f"\n🔑 Token (first 50 chars): {token[:50]}...")

try:
    # Try to decode without verification first to see payload
    print("\n📦 Decoding without verification...")
    unverified = jwt.decode(token, options={"verify_signature": False})
    print(f"  Payload: {unverified}")
    
    # Now try with verification
    print("\n✅ Decoding with verification...")
    verified = jwt.decode(
        token,
        CONFIG["jwt_secret_key"],
        algorithms=[CONFIG["jwt_algorithm"]]
    )
    print(f"  Verified Payload: {verified}")
    
    # Check for user_id
    user_id = verified.get("sub") or verified.get("id")
    if user_id:
        print(f"\n👤 User ID: {user_id}")
    else:
        print(f"\n❌ No user ID found in token!")
        
except jwt.ExpiredSignatureError:
    print("\n❌ Token expired!")
except jwt.InvalidSignatureError:
    print("\n❌ Invalid signature - secret key mismatch!")
except Exception as e:
    print(f"\n❌ Error: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
