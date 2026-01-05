# 🔧 Authentication Error Fix

## Problem
Frontend was getting "Could not validate credentials" error when trying to fetch sessions from MongoDB API.

## Root Cause
React Query hooks were attempting to fetch data before:
1. User authentication was fully complete
2. JWT token was available in localStorage
3. Component had verified user was logged in

## Solutions Implemented

### 1. Enhanced Auth Guards in React Query Hooks
**File**: `frontend/src/hooks/useSessions.ts`

Added `isAuthenticated` check alongside `user` check:
```typescript
export function useSessions() {
  const { user, isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: () => sessionsService.getSessions(),
    enabled: !!user && isAuthenticated, // ✅ Only fetch when authenticated
    // ...
  });
}
```

### 2. Retry Logic for Auth Errors
```typescript
retry: (failureCount, error: any) => {
  // Don't retry on authentication errors
  if (error?.message?.includes('credentials')) return false;
  return failureCount < 2;
}
```

### 3. Enhanced Logging in Sessions Service
**File**: `frontend/src/services/sessions.service.ts`

Added comprehensive console logging to debug auth flow:
```typescript
console.log('🔑 [Sessions Service] Auth storage:', authStorage ? 'Found' : 'Not found');
console.log('🔑 [Sessions Service] Token:', token ? `${token.substring(0, 20)}...` : 'None');
console.log('✅ [Sessions Service] Authorization header set');
console.log('📤 [Sessions Service] Request:', config.method?.toUpperCase(), config.url);
```

### 4. Component-Level Auth Guard
**File**: `frontend/views/StudyBuddyNew.tsx`

Added early return if user not logged in:
```typescript
if (!user) {
  return (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <Card className="max-w-md p-8 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Authentication Required</h2>
        <p className="text-slate-600">Please log in to use Study Buddy</p>
      </Card>
    </div>
  );
}
```

### 5. Debug Logging for User State
```typescript
useEffect(() => {
  console.log('👤 [StudyBuddy] User:', user ? user.email : 'Not logged in');
  console.log('📊 [StudyBuddy] Sessions data:', sessionsData);
  console.log('🔄 [StudyBuddy] Loading sessions:', isLoadingSessions);
}, [user, sessionsData, isLoadingSessions]);
```

## How It Works Now

### Authentication Flow
1. **User logs in** → `authStore` sets `isAuthenticated = true`
2. **StudyBuddyNew loads** → Checks `if (!user)` returns auth required message
3. **useSessions enabled** → Only when `user && isAuthenticated`
4. **Token extracted** → From `auth-storage` localStorage
5. **Request sent** → With `Authorization: Bearer {token}` header
6. **Sessions loaded** → Displayed in sidebar

### Request Interceptor Flow
```
localStorage.getItem('auth-storage')
  ↓
JSON.parse({ state: { accessToken, user } })
  ↓
Extract state.accessToken
  ↓
Set headers.Authorization = "Bearer {token}"
  ↓
Send request to AI Engine
```

### Error Handling
- **401 Unauthorized**: Don't retry, show error
- **No token**: Log warning, don't send request
- **Parse error**: Log error, continue without token
- **Network error**: Show "No response from server"

## Testing Checklist

### ✅ Before Login
- [ ] StudyBuddyNew shows "Authentication Required" message
- [ ] No API requests sent to `/ai/sessions`
- [ ] Console logs show "Not logged in"

### ✅ After Login
- [ ] StudyBuddyNew shows normal UI
- [ ] Sessions fetched automatically
- [ ] Console shows token being extracted
- [ ] Authorization header set correctly

### ✅ Console Logs to Verify
```
🔑 [Sessions Service] Auth storage: Found
🔑 [Sessions Service] Token: eyJhbGciOiJIUzI1NiIs...
✅ [Sessions Service] Authorization header set
📤 [Sessions Service] Request: GET /ai/sessions
✅ [Sessions Service] Response: 200 /ai/sessions
👤 [StudyBuddy] User: rayyan.shaikhh@gmail.com
📊 [StudyBuddy] Sessions data: { sessions: [...], total: 2, ... }
```

### ✅ API Requests
```
GET http://localhost:8000/ai/sessions
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
```

## Common Issues & Solutions

### Issue 1: "Could not validate credentials"
**Cause**: Token not in request headers
**Solution**: Check console logs for "Auth storage: Not found" or "Token: None"
**Fix**: Make sure user is logged in and auth-storage exists in localStorage

### Issue 2: Token expired
**Cause**: JWT has expired (15 min default)
**Solution**: Logout and login again
**Fix**: Implement token refresh mechanism (future enhancement)

### Issue 3: Wrong token format
**Cause**: Token not extracted correctly from Zustand persist
**Solution**: Check `auth-storage` structure in localStorage
**Expected**:
```json
{
  "state": {
    "user": {...},
    "accessToken": "eyJ...",
    "isAuthenticated": true
  },
  "version": 0
}
```

### Issue 4: AI Engine not running
**Cause**: Server on port 8000 not started
**Solution**: Start AI Engine: `cd ai-engine; python -m uvicorn server.main:app --port 8000`

### Issue 5: CORS errors
**Cause**: Frontend origin not allowed
**Solution**: Check AI Engine CORS config includes `http://localhost:3000`

## Debugging Commands

### Check localStorage
```javascript
// In browser console
const storage = localStorage.getItem('auth-storage');
console.log(JSON.parse(storage));
```

### Manual API Test
```bash
# Get token from localStorage, then:
curl -X GET http://localhost:8000/ai/sessions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Check AI Engine Logs
```bash
# Should see:
2026-01-05 23:00:00 - server.deps - INFO - ✅ Authenticated user: 695bd8df4a0c5f919b4fa98a
```

## Files Modified

1. ✅ `frontend/src/hooks/useSessions.ts`
   - Added `isAuthenticated` check
   - Added retry logic for auth errors
   - Applied to both `useSessions` and `useSessionMessages`

2. ✅ `frontend/src/services/sessions.service.ts`
   - Added comprehensive logging in interceptors
   - Logs token extraction, request, and response

3. ✅ `frontend/views/StudyBuddyNew.tsx`
   - Added early return for non-authenticated users
   - Added debug logging for user state
   - Shows "Authentication Required" message

## Next Steps

### Immediate
1. Test login flow in browser
2. Verify console logs show token extraction
3. Confirm sessions load after login

### Future Enhancements
1. **Token Refresh**: Auto-refresh expired tokens
2. **Error Boundaries**: Catch and display auth errors gracefully
3. **Loading States**: Better loading indicators during auth
4. **Offline Mode**: Cache sessions for offline access
5. **Session Timeout**: Warning before token expires
