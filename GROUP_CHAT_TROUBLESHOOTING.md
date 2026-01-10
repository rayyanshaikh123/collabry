# Group Chat Troubleshooting Guide

## Quick Diagnostic Steps

### Step 1: Check Browser Console
Open your browser's Developer Tools (F12) and check the Console tab for these messages:

**Expected on page load:**
```
🔌 Initializing chat socket connection...
Group ID: [your-group-id]
User ID: [your-user-id]
User Email: [your-email]
✅ Connected to chat socket: [socket-id]
📥 Joining group room...
📥 Loading messages from: http://localhost:5000/api/chat/messages?...
✅ Loaded messages: [number]
```

**If you see errors:**
- ❌ `No token found` → You need to login
- ❌ `Connection Error` → Backend is not running
- ❌ `Failed to load messages` → API endpoint issue

### Step 2: Check Backend Terminal
Look for these logs in your backend terminal:

**Expected:**
```
✅ User connected: your@email.com (socket-id)
💬 Chat socket connected: your@email.com (socket-id)
✅ your@email.com joined group:[group-id]
```

**When sending a message:**
```
📤 Message send request from your@email.com: {...}
✅ Message created: [message-id]
📢 Broadcasting to room: group:[group-id]
✅ Message broadcasted to group:[group-id]
```

### Step 3: Verify Backend is Running
```powershell
# Check if Node.js processes are running
Get-Process node

# You should see at least one node process running on port 5000
```

### Step 4: Check MongoDB Connection
Look for this in backend terminal:
```
✅ MongoDB Connected
```

---

## Common Issues & Solutions

### Issue 1: "Cannot send message" (Send button does nothing)

**Symptoms:**
- Send button is disabled or nothing happens when clicked
- Console shows: "⚠️ Cannot send message"

**Solution:**
1. Check if you're logged in:
   ```javascript
   // In browser console:
   localStorage.getItem('token')  // Should return a JWT token
   localStorage.getItem('user')   // Should return user object
   ```

2. Check if socket is connected:
   - Look for green dot next to "Connected" in chat header
   - Console should show "✅ Connected to chat socket"

3. If not connected, refresh the page or restart backend

### Issue 2: "Messages not appearing in real-time"

**Symptoms:**
- You send a message but don't see it immediately
- Other users' messages don't appear without refresh

**Solutions:**

**A. Check if you joined the group room:**
   - Browser console should show: "📥 Joining group room..."
   - Backend should show: "✅ [email] joined group:[id]"

**B. Verify group ID is correct:**
   ```javascript
   // In browser console (on Groups page):
   const selectedGroup = [...document.querySelectorAll('[class*="bg-primary/10"]')]
   console.log('Selected group element found:', !!selectedGroup.length)
   ```

**C. Check Socket.IO connection:**
   ```javascript
   // In browser console:
   window.io = require('socket.io-client');
   // If this fails, socket.io-client is not loaded properly
   ```

### Issue 3: "Connection Error" or red dot

**Symptoms:**
- Red dot instead of green dot
- Console shows "❌ Socket connection error"

**Solutions:**

**A. Backend not running:**
```powershell
cd backend
npm start
```

**B. CORS issue - check backend `.env`:**
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

**C. Port conflict - backend might not be on port 5000:**
```powershell
# Check what's running on port 5000
netstat -ano | findstr :5000
```

**D. Frontend environment variable wrong:**
Check `frontend/.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

### Issue 4: "Failed to load messages"

**Symptoms:**
- Chat opens but shows no messages
- Console shows "❌ Failed to load messages"

**Solutions:**

**A. Check if you're a member of the group:**
   - You can only view messages for groups you've joined
   - Try leaving and rejoining the group

**B. Check backend logs for errors:**
   - Should show: "GET /api/chat/messages?conversationType=group&groupId=..."
   - If 401 error: Your token expired, login again
   - If 403 error: You're not a member of the group
   - If 500 error: Database issue

**C. Verify MongoDB is running:**
   ```powershell
   # Check MongoDB connection string in backend/.env
   MONGODB_URI=mongodb+srv://...
   ```

### Issue 5: "Authentication Error - Please login again"

**Symptoms:**
- Toast notification appears immediately
- Can't connect to chat

**Solution:**
```javascript
// Clear localStorage and login again
localStorage.clear()
// Then navigate to login page and sign in
```

### Issue 6: Messages send but don't appear

**Symptoms:**
- Console shows "📤 Sending message" but message doesn't appear
- No error messages

**Solutions:**

**A. Check backend response:**
   - Backend terminal should show "✅ Message created"
   - If shows "❌ Error sending message", check the error

**B. Check if message is being broadcasted:**
   - Backend should show "✅ Message broadcasted to group:[id]"
   - If not, the room name might be wrong

**C. Verify you're in the same room:**
   ```javascript
   // In browser console, check group ID:
   // It should match the group you selected
   ```

### Issue 7: Typing indicators not working

**Symptoms:**
- "User is typing..." never appears

**Solution:**
This is a known minor issue. Typing indicators work but require:
1. Both users connected to same group
2. Typing must pause for indicators to reset
3. Check console for "typing:start" and "typing:stop" events

---

## Testing Checklist

Use this checklist to verify everything works:

### Backend Tests
- [ ] Backend server starts without errors
- [ ] MongoDB connects successfully
- [ ] Socket.IO initializes: `initializeChatNamespace(io)`
- [ ] Chat namespace accessible at `/chat`

### Frontend Tests
- [ ] Can create a new group
- [ ] Can select a group from list
- [ ] Chat component loads
- [ ] Green dot appears (connected)
- [ ] Can load historical messages
- [ ] Can send a new message
- [ ] Message appears immediately
- [ ] Can edit own message
- [ ] Can delete own message

### Multi-User Tests (2 browsers)
- [ ] User A sends message → User B sees it immediately
- [ ] User B sends message → User A sees it immediately
- [ ] Both users see typing indicators
- [ ] Both users see edit updates
- [ ] Both users see delete updates

---

## Advanced Debugging

### Enable Verbose Socket.IO Logging

**Frontend (browser console):**
```javascript
localStorage.setItem('debug', 'socket.io-client:*');
// Refresh page to see detailed Socket.IO logs
```

**Backend (server.js):**
```javascript
const io = new Server(httpServer, {
  cors: { /* ... */ },
  // Add this:
  transports: ['websocket', 'polling'],
  logger: true,
  logLevel: 'debug'
});
```

### Check Socket Rooms

**Backend console:**
Add this temporarily to `chatNamespace.js`:
```javascript
socket.on('join:conversation', ({ conversationType, conversationId }) => {
  const roomName = `${conversationType}:${conversationId}`;
  socket.join(roomName);
  
  // Debug: Show all rooms this socket is in
  console.log(`Rooms for ${socket.userEmail}:`, Array.from(socket.rooms));
  
  // Debug: Show all sockets in this room
  const socketsInRoom = chatNamespace.adapter.rooms.get(roomName);
  console.log(`Sockets in ${roomName}:`, socketsInRoom?.size || 0);
});
```

### Monitor Network Traffic

1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Select the socket.io connection
4. Click "Messages" tab
5. Watch for:
   - `42["message:send",...]` when you send
   - `42["message:new",...]` when you receive

---

## Still Not Working?

If you've tried everything above:

1. **Restart Everything:**
   ```powershell
   # Kill all node processes
   taskkill /F /IM node.exe
   
   # Restart backend
   cd backend
   npm start
   
   # Restart frontend (new terminal)
   cd frontend
   npm run dev
   ```

2. **Clear All Caches:**
   ```javascript
   // In browser console:
   localStorage.clear();
   sessionStorage.clear();
   // Then hard refresh: Ctrl+Shift+R
   ```

3. **Check for Port Conflicts:**
   ```powershell
   # See what's using port 5000
   netstat -ano | findstr :5000
   
   # See what's using port 3000
   netstat -ano | findstr :3000
   ```

4. **Verify Dependencies:**
   ```powershell
   # Backend
   cd backend
   npm list socket.io
   # Should show socket.io@4.8.3 or similar
   
   # Frontend
   cd frontend
   npm list socket.io-client
   # Should show socket.io-client@4.8.3 or similar
   ```

5. **Check MongoDB Atlas:**
   - Login to MongoDB Atlas
   - Check if cluster is running
   - Verify IP whitelist includes your IP (or 0.0.0.0/0 for testing)
   - Check connection string in `.env`

---

## Quick Fix Commands

```powershell
# Full restart
cd backend ; npm start
cd frontend ; npm run dev

# Check logs
cd backend ; Get-Content .\error.log -Tail 50

# Test backend directly
curl http://localhost:5000/health

# Test MongoDB connection
cd backend
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected')).catch(e => console.log('❌', e))"
```

---

## Success Indicators

When everything works, you should see:

**Browser Console:**
```
🔌 Initializing chat socket connection...
✅ Connected to chat socket: ABC123
📥 Joining group room...
✅ Loaded messages: 5
📤 Sending message: {...}
📤 Send response: {success: true, message: {...}}
📨 New message received: {...}
```

**Backend Terminal:**
```
🚀 Server running in development mode on port 5000
✅ MongoDB Connected
✅ User connected: user@example.com (ABC123)
💬 Chat socket connected: user@example.com (ABC123)
✅ user@example.com joined group:GROUP_ID
📤 Message send request from user@example.com
✅ Message created: MSG_ID
📢 Broadcasting to room: group:GROUP_ID
✅ Message broadcasted to group:GROUP_ID
```

Good luck! 🎉
