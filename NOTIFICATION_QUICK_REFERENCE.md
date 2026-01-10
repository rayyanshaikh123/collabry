# 🚀 Notification System - Quick Reference

## For Developers: How to Add Notifications

### Step 1: Choose Notification Type

```javascript
// Available types in notification.service.js:
notifyTaskDueSoon()          // ⏰ Study Planner
notifyTaskOverdue()          // ⚠️ Study Planner
notifyBoardInvitation()      // 📧 Boards
notifyBoardMemberJoined()    // 👤 Boards
notifyVoiceChatStarted()     // 🎙️ Boards
notifyQuizGenerated()        // 📝 AI Features
notifyMindmapGenerated()     // 🧠 AI Features
notifyDocumentProcessed()    // 📄 AI Features
notifyStreakMilestone()      // 🔥 Engagement
notifyDailyMotivation()      // 💡 Engagement
notifyNewReport()            // 🚨 Admin
notifyContentFlagged()       // ⚠️ Admin
// ...and more
```

### Step 2: Add to Your Controller

```javascript
// 1. Import dependencies
const notificationService = require('../services/notification.service');
const { getIO } = require('../socket');
const { emitNotificationToUser } = require('../socket/notificationNamespace');

// 2. In your controller method
exports.yourMethod = asyncHandler(async (req, res) => {
  // Your business logic here...
  
  // Create notification
  try {
    const notification = await notificationService.notifyXxx(
      userId,      // Who receives it
      data         // Related data (task, board, etc.)
    );

    // Emit real-time
    const io = getIO();
    emitNotificationToUser(io, userId, notification);
  } catch (err) {
    console.error('Failed to send notification:', err);
    // Continue anyway - notification is not critical
  }

  res.json({ success: true, data: yourData });
});
```

### Step 3: Test

```bash
# Create test notification
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check if it appears in UI
# Open app → Look for bell icon → Click → Should see notification
```

---

## Quick API Reference

### Backend Endpoints

```javascript
// Get notifications
GET /api/notifications
  ?page=1
  &limit=20
  &type=task_due_soon
  &priority=high
  &unreadOnly=true

// Get unread count
GET /api/notifications/unread-count

// Mark as read
PATCH /api/notifications/:id/read

// Mark all as read
PATCH /api/notifications/read-all

// Delete notification
DELETE /api/notifications/:id

// Delete all read
DELETE /api/notifications/read

// Create test notification
POST /api/notifications/test
```

### Frontend Hooks

```typescript
import { 
  useNotifications, 
  useUnreadCount, 
  useMarkAsRead,
  useRealtimeNotifications 
} from '@/hooks/useNotifications';

function MyComponent() {
  // Fetch notifications
  const { data, isLoading } = useNotifications({ 
    unreadOnly: true,
    page: 1,
    limit: 10
  });

  // Get unread count
  const { count } = useUnreadCount();

  // Mark as read
  const { mutate: markAsRead } = useMarkAsRead();

  // Enable real-time
  useRealtimeNotifications();

  return (
    <div>
      <span>Unread: {count}</span>
      {data?.notifications.map(n => (
        <div key={n._id} onClick={() => markAsRead(n._id)}>
          {n.title}
        </div>
      ))}
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Notify Single User

```javascript
// When action affects one user
const notification = await notificationService.notifyTaskDueSoon(
  userId,
  task
);

const io = getIO();
emitNotificationToUser(io, userId, notification);
```

### Pattern 2: Notify Multiple Users

```javascript
// When action affects multiple users (e.g., all board members)
for (const member of board.members) {
  const notification = await notificationService.notifyVoiceChatStarted(
    member.userId,
    board,
    currentUser
  );

  const io = getIO();
  emitNotificationToUser(io, member.userId, notification);
}
```

### Pattern 3: Notify All Admins

```javascript
// When action needs admin attention
const User = require('../models/User');
const admins = await User.find({ role: 'admin' }).select('_id');

for (const admin of admins) {
  const notification = await notificationService.notifyNewReport(
    admin._id,
    report
  );

  const io = getIO();
  emitNotificationToUser(io, admin._id, notification);
}
```

---

## Scheduled Notifications

### Add New Cron Job

```javascript
// In backend/src/services/notificationScheduler.js

const yourScheduledJob = cron.schedule('0 10 * * *', async () => {
  try {
    console.log('🎯 Running your scheduled job...');

    // Your logic here
    const users = await User.find({ ... });

    for (const user of users) {
      const notification = await notificationService.notifyXxx(
        user._id,
        data
      );

      const io = getIO();
      emitNotificationToUser(io, user._id, notification);
    }
  } catch (error) {
    console.error('Error in scheduled job:', error);
  }
});

// Register in startNotificationScheduler()
const startNotificationScheduler = () => {
  // ... existing jobs
  yourScheduledJob.start();
};
```

### Cron Schedule Cheatsheet

```
* * * * *          Every minute
*/5 * * * *        Every 5 minutes
*/15 * * * *       Every 15 minutes
0 * * * *          Every hour
0 */2 * * *        Every 2 hours
0 8 * * *          Every day at 8 AM
0 9,17 * * *       At 9 AM and 5 PM
0 8 * * 1          Every Monday at 8 AM
0 0 1 * *          First day of month
```

---

## Add New Notification Type

### Step 1: Update Model

```javascript
// backend/src/models/Notification.js
type: {
  type: String,
  enum: [
    // ... existing types
    'your_new_type',  // Add your new type here
  ],
  required: true
}
```

### Step 2: Add Service Method

```javascript
// backend/src/services/notification.service.js
async notifyYourNewType(userId, data) {
  return this.createNotification({
    userId,
    type: 'your_new_type',
    title: '🎉 Your Title',
    message: `Your message with ${data.property}`,
    priority: 'medium',
    relatedEntity: {
      entityType: 'YourModel',
      entityId: data._id || data.id,
    },
    actionUrl: `/your/path/${data._id}`,
    actionText: 'View Details',
  });
}
```

### Step 3: Add Frontend Icon

```typescript
// frontend/components/NotificationDropdown.tsx
const ICONS: Record<string, string> = {
  // ... existing icons
  your_new_type: '🎉',
};
```

### Step 4: Use It

```javascript
// In any controller
const notification = await notificationService.notifyYourNewType(
  userId,
  yourData
);

const io = getIO();
emitNotificationToUser(io, userId, notification);
```

---

## Troubleshooting Commands

```bash
# Check MongoDB for notifications
db.notifications.find({ userId: ObjectId("...") })
  .sort({ createdAt: -1 })
  .limit(10)

# Check unread count
db.notifications.countDocuments({ 
  userId: ObjectId("..."), 
  isRead: false 
})

# Clear all notifications for user
db.notifications.deleteMany({ 
  userId: ObjectId("...") 
})

# Check Socket.IO connections (browser console)
socket.connected  // Should be true
socket.id         // Connection ID

# Test real-time emit (backend)
const io = getIO();
io.to('user:123').emit('test', { message: 'Hello!' });
```

---

## Performance Tips

### Backend

```javascript
// ✅ Good: Use lean queries for read-only operations
const notifications = await Notification.find({ userId })
  .lean()
  .limit(20);

// ❌ Bad: Loading full Mongoose documents when not needed
const notifications = await Notification.find({ userId })
  .limit(20);

// ✅ Good: Create notification with minimal data
await notificationService.notifyTaskDueSoon(userId, { 
  _id: task._id,
  title: task.title 
});

// ❌ Bad: Passing entire populated document
await notificationService.notifyTaskDueSoon(userId, taskWithAllData);
```

### Frontend

```typescript
// ✅ Good: Use caching and auto-refetch
const { data } = useNotifications(); // Cached for 30s

// ❌ Bad: Fetching on every render
const [notifications, setNotifications] = useState([]);
useEffect(() => {
  fetchNotifications().then(setNotifications);
}, []); // No caching, no real-time

// ✅ Good: Optimistic updates
const { mutate } = useMarkAsRead();
mutate(notificationId); // Instant UI update

// ❌ Bad: Waiting for server response
const markAsRead = async (id) => {
  await api.markAsRead(id);
  refetch(); // Slow, causes flash
};
```

---

## Security Checklist

- [ ] All endpoints require JWT authentication
- [ ] Users can only access their own notifications
- [ ] Socket.IO validates token on connection
- [ ] Admin notifications verified by role
- [ ] Input validation on all fields
- [ ] Rate limiting on creation
- [ ] Sanitize notification content (XSS prevention)
- [ ] CORS properly configured

---

## Testing Checklist

- [ ] Create notification via API
- [ ] Notification appears in MongoDB
- [ ] Real-time delivery works
- [ ] Badge count updates
- [ ] Mark as read works
- [ ] Delete notification works
- [ ] Cron job executes
- [ ] Mobile responsive
- [ ] Browser notifications (if enabled)
- [ ] Handles errors gracefully

---

## Common Errors & Fixes

### Error: "Cannot read property 'emit' of undefined"

**Cause**: Socket.IO not initialized
**Fix**: Ensure `initializeSocket(server)` called in server.js

### Error: "Notification not appearing in UI"

**Cause**: Socket.IO not connected or JWT expired
**Fix**: Check browser console for connection errors, verify token

### Error: "Cron job not running"

**Cause**: Scheduler not started or syntax error
**Fix**: Check server logs for "🕐 Starting notification scheduler..."

### Error: "Badge count wrong"

**Cause**: Cache not invalidated
**Fix**: Clear cache or wait for auto-refetch (15s)

---

## Environment Variables

```env
# No additional variables needed!
# Uses existing:
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
CLIENT_URL=http://localhost:3000
```

---

## File Locations Quick Reference

```
Backend:
├─ models/Notification.js
├─ services/notification.service.js
├─ services/notificationScheduler.js
├─ controllers/notification.controller.js
├─ routes/notification.routes.js
└─ socket/notificationNamespace.js

Frontend:
├─ services/notification.service.ts
├─ hooks/useNotifications.ts
└─ components/NotificationDropdown.tsx

Docs:
├─ NOTIFICATION_SYSTEM_COMPLETE.md
├─ NOTIFICATION_TESTING_GUIDE.md
├─ NOTIFICATION_SYSTEM_SUMMARY.md
└─ NOTIFICATION_ARCHITECTURE_DIAGRAM.md
```

---

## Need More Help?

1. **Full Docs**: See `NOTIFICATION_SYSTEM_COMPLETE.md`
2. **Testing**: See `NOTIFICATION_TESTING_GUIDE.md`
3. **Architecture**: See `NOTIFICATION_ARCHITECTURE_DIAGRAM.md`
4. **API Examples**: Look at existing controller integrations
5. **Debug**: Enable verbose logging in service methods

---

**Quick Start**: Copy-paste Pattern 1, test with `/test` endpoint, done! ✅
