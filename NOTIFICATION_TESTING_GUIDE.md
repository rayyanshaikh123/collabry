# Notification System - Quick Test Guide

## ✅ Completed Components

### Backend
- ✅ Notification Model with 20+ types
- ✅ Notification Service with CRUD + generators
- ✅ Notification Controller with 7 REST endpoints
- ✅ Notification Routes (integrated in app.js)
- ✅ Socket.IO Namespace for real-time delivery
- ✅ Notification Scheduler with 4 cron jobs
- ✅ Integration in 6 controllers (studyTask, board, quiz, mindmap, notebook, report)

### Frontend
- ✅ Notification Service with TypeScript interfaces
- ✅ useNotifications hooks with real-time support
- ✅ NotificationDropdown component
- ✅ Integration in main layout

---

## 🧪 Quick Test Plan

### 1. Test REST API (2 minutes)

**Start backend**:
```bash
cd backend
npm start
```

**Test with curl** (replace `<token>` with your JWT):
```bash
# Create test notification
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Authorization: Bearer <token>"

# Get notifications
curl http://localhost:5000/api/notifications \
  -H "Authorization: Bearer <token>"

# Get unread count
curl http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer <token>"
```

### 2. Test Frontend UI (2 minutes)

**Start frontend**:
```bash
cd frontend
npm run dev
```

**Visual checks**:
1. Login to app
2. Look for bell icon in navbar (top-right)
3. Click bell → dropdown should appear
4. Check if test notification appears
5. Click notification → should mark as read and navigate
6. Verify badge count updates

### 3. Test Real-time Delivery (3 minutes)

**Setup**:
1. Open app in 2 browser tabs
2. Login as same user in both tabs

**Test**:
1. In Tab 1: Create test notification via API
2. In Tab 2: Should see notification appear instantly (no refresh)
3. Check browser console for Socket.IO logs
4. Verify badge count updates in real-time

### 4. Test Scheduled Jobs (5 minutes)

**Create task due soon**:
```bash
# Via Postman or frontend
POST /api/study-tasks
{
  "title": "Test Task",
  "scheduledDate": "<30 minutes from now>",
  "duration": 30
}
```

**Wait & verify**:
- Cron job runs every 15 minutes
- Check server logs for: `📋 Checking for tasks due soon...`
- Should create notification: "⏰ Task Due Soon"
- Check notification appears in dropdown

**Speed up testing** (optional):
```javascript
// In backend/src/services/notificationScheduler.js
// Line 13: Change '*/15 * * * *' to '* * * * *'
// This runs every minute instead of every 15 minutes
// REMEMBER TO REVERT AFTER TESTING!
```

### 5. Test Module Integrations (10 minutes)

#### Study Boards
1. Create new board
2. Invite another user (or add member)
3. Check invited user receives notification
4. Click "Start Voice Chat"
5. Check all board members receive notification

#### AI Features
1. Generate quiz from notebook
2. Check notification: "📝 Quiz Generated!"
3. Generate mindmap
4. Check notification: "🧠 Mind Map Created!"
5. Upload PDF to notebook
6. Check notification: "📄 Document Processed"

#### Reports (Admin)
1. Submit content report
2. Check admin receives: "🚨 New Report"
3. Admin resolves report
4. Check reporter receives: "⚠️ Content Action"

---

## 🔍 Troubleshooting

### Notifications not appearing

**Check server logs**:
```
✓ Notification created for user [userId]
✓ Real-time emitted to user [userId]
```

**Check MongoDB**:
```bash
# In MongoDB Compass or CLI
db.notifications.find({ userId: ObjectId("...") }).sort({ createdAt: -1 })
```

**Check Socket.IO connection** (browser console):
```
Socket connected to /notifications
Joined notification room: user:6789...
```

### Real-time not working

1. Check browser console for Socket.IO errors
2. Verify backend Socket.IO running: Look for `🔌 Socket.IO initialized`
3. Check CORS: Frontend URL should be in allowed origins
4. Test manual emit:
```javascript
// In backend controller
const io = getIO();
io.to('user:6789...').emit('test', { message: 'Hello' });
```

### Cron jobs not running

1. Check server logs for: `🕐 Starting notification scheduler...`
2. Verify `node-cron` installed:
```bash
npm list node-cron
```
3. Check system time (cron uses server time)
4. Restart server to reinitialize cron jobs

---

## 📊 Expected Behavior

### REST API
- `/api/notifications` → Returns array of notifications
- `/api/notifications/unread-count` → Returns { count: X }
- Mark as read → Updates `isRead: true`
- Real-time emit after creation → Badge updates instantly

### Cron Jobs
- **Every 15 min**: Check tasks due in next hour
- **Every hour**: Check overdue tasks
- **8 AM daily**: Send daily plan reminder
- **9 AM daily**: Send motivation quote

### Socket.IO
- Client connects → Joins `user:${userId}` room
- Server emits → Only specific user receives
- Events: `new-notification`, `unread-count`

---

## 🚀 Success Criteria

- [ ] Test notification created via API
- [ ] Notification appears in dropdown
- [ ] Click notification marks as read
- [ ] Badge count updates correctly
- [ ] Real-time works across tabs
- [ ] Cron job creates notification on schedule
- [ ] Board invitation sends notification
- [ ] Voice chat start sends notifications
- [ ] Quiz generation sends notification
- [ ] Document upload sends notification
- [ ] Report submission sends admin notification

---

## 📝 Testing Checklist

### Backend Tests
- [ ] Model saves to MongoDB
- [ ] Service creates notification
- [ ] Controller returns notification
- [ ] Routes are accessible
- [ ] Socket.IO emits to correct user
- [ ] Cron jobs execute on schedule

### Frontend Tests
- [ ] Service fetches notifications
- [ ] Hooks return data correctly
- [ ] Component renders notifications
- [ ] Click mark as read works
- [ ] Delete notification works
- [ ] Real-time updates UI
- [ ] Badge shows correct count

### Integration Tests
- [ ] Task due soon notification
- [ ] Board invitation notification
- [ ] Voice chat start notification
- [ ] Quiz generated notification
- [ ] Mindmap generated notification
- [ ] Document processed notification
- [ ] Report submitted notification

---

## 🎯 Next Steps

After testing:
1. **Monitor logs** for errors
2. **Gather user feedback** on notification usefulness
3. **Add preferences** for users to customize notifications
4. **Create notification history page** for viewing all notifications
5. **Implement push notifications** for PWA support
6. **Add notification grouping** to reduce spam

---

## 📞 Support

If you encounter issues:
1. Check server logs for errors
2. Check browser console for Socket.IO errors
3. Verify MongoDB connection
4. Test with test notification endpoint
5. Check comprehensive docs in `NOTIFICATION_SYSTEM_COMPLETE.md`

**Status**: System ready for testing! 🎉
