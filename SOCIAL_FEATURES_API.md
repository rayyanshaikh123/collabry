# Friends, Groups & Communities - API Documentation

## Overview
Complete social features including friend management, groups, communities, and real-time chat.

## Backend Structure

### Models Created
- **FriendRequest** - Friend request management
- **Friendship** - Active friendships with block functionality
- **Group** - Private groups with invite codes
- **Community** - Public/private communities with categories
- **Message** - Universal messaging (direct, group, community)

### API Endpoints

#### Friends API (`/api/friends`)
- `POST /requests` - Send friend request
- `GET /requests/pending` - Get pending requests (received)
- `GET /requests/sent` - Get sent requests
- `PUT /requests/:requestId/accept` - Accept friend request
- `PUT /requests/:requestId/reject` - Reject friend request  
- `DELETE /requests/:requestId` - Cancel sent request
- `GET /` - Get friends list
- `DELETE /:friendshipId` - Remove friend
- `PUT /:friendshipId/block` - Block friend
- `PUT /:friendshipId/unblock` - Unblock friend
- `GET /search?q=query` - Search users (excludes friends)

#### Groups API (`/api/groups`)
- `POST /` - Create group
- `GET /` - Get user's groups
- `GET /:groupId` - Get group details
- `PUT /:groupId` - Update group
- `DELETE /:groupId` - Delete group
- `POST /:groupId/members` - Add member
- `DELETE /:groupId/members/:memberId` - Remove member
- `POST /:groupId/leave` - Leave group
- `PUT /:groupId/admins/:memberId` - Make admin
- `DELETE /:groupId/admins/:memberId` - Remove admin
- `POST /join` - Join with invite code
- `POST /:groupId/invite-code/regenerate` - Regenerate invite code

#### Communities API (`/api/communities`)
**Public Routes:**
- `GET /search?q=query` - Search communities
- `GET /all?category=&search=&isPrivate=` - Browse communities
- `GET /:identifier` - Get community (by ID or slug)

**Protected Routes:**
- `POST /` - Create community
- `GET /my/communities` - Get user's communities
- `PUT /:communityId` - Update community
- `DELETE /:communityId` - Delete community
- `POST /:communityId/join` - Join community
- `POST /:communityId/leave` - Leave community
- `PUT /:communityId/moderators/:memberId` - Add moderator
- `DELETE /:communityId/moderators/:memberId` - Remove moderator
- `DELETE /:communityId/members/:memberId` - Remove member

#### Chat API (`/api/chat`)
- `POST /messages` - Send message
- `GET /messages/:type?recipientId=&groupId=&communityId=&limit=50&before=` - Get messages
  - Types: `direct`, `group`, `community`
- `PUT /messages/:messageId` - Edit message
- `DELETE /messages/:messageId` - Delete message
- `GET /conversations` - Get conversations list (direct messages)
- `POST /messages/read` - Mark messages as read

### Socket.IO Chat Namespace (`/chat`)

**Authentication:**
```javascript
socket = io('http://localhost:5000/chat', {
  auth: {
    userId: user._id,
    userEmail: user.email
  }
});
```

**Events to Emit:**
- `join:conversation` - Join chat room
  ```javascript
  socket.emit('join:conversation', { 
    conversationType: 'direct|group|community',
    conversationId: 'userId|groupId|communityId'
  });
  ```

- `leave:conversation` - Leave chat room
  ```javascript
  socket.emit('leave:conversation', {
    conversationType: 'direct',
    conversationId: recipientId
  });
  ```

- `message:send` - Send message
  ```javascript
  socket.emit('message:send', {
    conversationType: 'direct',
    content: 'Hello!',
    messageType: 'text',
    recipientId: 'userId', // for direct
    groupId: 'groupId', // for group
    communityId: 'communityId', // for community
    replyTo: 'messageId', // optional
    attachments: [] // optional
  }, (response) => {
    if (response.success) {
      console.log('Message sent:', response.message);
    }
  });
  ```

- `typing:start` - Start typing indicator
  ```javascript
  socket.emit('typing:start', {
    conversationType: 'direct',
    conversationId: recipientId
  });
  ```

- `typing:stop` - Stop typing indicator
  ```javascript
  socket.emit('typing:stop', {
    conversationType: 'direct',
    conversationId: recipientId
  });
  ```

- `messages:mark-read` - Mark messages as read
  ```javascript
  socket.emit('messages:mark-read', {
    messageIds: ['id1', 'id2']
  }, (response) => {
    if (response.success) {
      console.log('Messages marked as read');
    }
  });
  ```

- `message:edit` - Edit message
  ```javascript
  socket.emit('message:edit', {
    messageId: 'id',
    content: 'Updated text'
  }, (response) => {
    if (response.success) {
      console.log('Message edited');
    }
  });
  ```

- `message:delete` - Delete message
  ```javascript
  socket.emit('message:delete', {
    messageId: 'id'
  }, (response) => {
    if (response.success) {
      console.log('Message deleted');
    }
  });
  ```

**Events to Listen:**
- `message:new` - New message received
- `message:sent` - Message sent confirmation
- `message:edited` - Message edited
- `message:deleted` - Message deleted
- `messages:read` - Messages marked as read
- `user:typing` - User started typing
- `user:stopped-typing` - User stopped typing

**Example Usage:**
```javascript
// Connect
const chatSocket = io('http://localhost:5000/chat', {
  auth: {
    userId: currentUser._id,
    userEmail: currentUser.email
  }
});

// Join conversation
chatSocket.emit('join:conversation', {
  conversationType: 'direct',
  conversationId: friendId
});

// Listen for messages
chatSocket.on('message:new', (message) => {
  console.log('New message:', message);
  // Update UI
});

// Send message
chatSocket.emit('message:send', {
  conversationType: 'direct',
  content: 'Hello!',
  recipientId: friendId
}, (response) => {
  if (response.success) {
    console.log('Message sent');
  }
});

// Listen for typing
chatSocket.on('user:typing', ({ userId, userEmail }) => {
  console.log(`${userEmail} is typing...`);
});
```

## Database Schema Details

### FriendRequest
```javascript
{
  from: ObjectId (User),
  to: ObjectId (User),
  status: 'pending' | 'accepted' | 'rejected',
  message: String (optional),
  timestamps
}
```

### Friendship
```javascript
{
  user1: ObjectId (User),
  user2: ObjectId (User),
  status: 'active' | 'blocked',
  blockedBy: ObjectId (User),
  timestamps
}
```

### Group
```javascript
{
  name: String,
  description: String,
  avatar: String,
  creator: ObjectId (User),
  admins: [ObjectId (User)],
  members: [{
    user: ObjectId (User),
    joinedAt: Date,
    role: 'admin' | 'member'
  }],
  isPrivate: Boolean,
  inviteCode: String (unique),
  settings: {
    allowMemberInvite: Boolean,
    allowMemberPost: Boolean
  },
  timestamps
}
```

### Community
```javascript
{
  name: String (unique),
  slug: String (unique, auto-generated),
  description: String,
  avatar: String,
  banner: String,
  creator: ObjectId (User),
  moderators: [ObjectId (User)],
  members: [{
    user: ObjectId (User),
    joinedAt: Date,
    role: 'moderator' | 'member'
  }],
  category: 'education' | 'technology' | 'science' | 'arts' | 'health' | 'business' | 'entertainment' | 'sports' | 'other',
  tags: [String],
  isPrivate: Boolean,
  requiresApproval: Boolean,
  rules: [{
    title: String,
    description: String
  }],
  settings: {
    allowPosts: Boolean,
    allowComments: Boolean,
    allowPolls: Boolean
  },
  stats: {
    memberCount: Number,
    postCount: Number
  },
  timestamps
}
```

### Message
```javascript
{
  sender: ObjectId (User),
  conversationType: 'direct' | 'group' | 'community',
  participants: [ObjectId (User)], // for direct messages
  group: ObjectId (Group), // for group messages
  community: ObjectId (Community), // for community messages
  content: String,
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'link',
  attachments: [{
    url: String,
    type: String,
    name: String,
    size: Number
  }],
  replyTo: ObjectId (Message),
  isEdited: Boolean,
  editedAt: Date,
  isDeleted: Boolean,
  deletedAt: Date,
  readBy: [{
    user: ObjectId (User),
    readAt: Date
  }],
  timestamps
}
```

## Testing with Postman/Thunder Client

### 1. Send Friend Request
```
POST http://localhost:5000/api/friends/requests
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "toUserId": "USER_ID",
  "message": "Let's be friends!"
}
```

### 2. Create Group
```
POST http://localhost:5000/api/groups
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "name": "Study Group",
  "description": "Group for studying together",
  "isPrivate": false
}
```

### 3. Create Community
```
POST http://localhost:5000/api/communities
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "name": "Tech Enthusiasts",
  "description": "Community for tech lovers",
  "category": "technology",
  "tags": ["programming", "ai", "web"],
  "isPrivate": false
}
```

### 4. Send Message
```
POST http://localhost:5000/api/chat/messages
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "conversationType": "direct",
  "recipientId": "USER_ID",
  "content": "Hello!",
  "messageType": "text"
}
```

## Next Steps: Frontend Implementation

Now you can start building the frontend UI. The backend is fully functional with:
✅ Friend management system
✅ Group creation and management
✅ Community creation and management
✅ Real-time chat with Socket.IO
✅ Message read receipts
✅ Typing indicators
✅ Message editing and deletion

Start the backend with:
```bash
cd backend
npm run dev
```

The server will run on port 5000 with all the new routes registered.
