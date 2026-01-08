# Voice Chat Setup Guide

Voice chat is now fully integrated using Daily.co WebRTC service.

## ✅ What's Implemented

### Backend
- ✅ Daily.co service integration (`backend/src/services/daily.service.js`)
- ✅ Room creation/management endpoints
- ✅ Meeting token generation for secure access
- ✅ Auto-cleanup of rooms
- ✅ Fallback mode when API key not configured

### Frontend
- ✅ Full Daily.co iframe integration
- ✅ Audio/video controls (mute, camera toggle)
- ✅ Participant tracking
- ✅ Error handling and loading states
- ✅ Automatic cleanup on component unmount

## 🚀 Quick Setup

### 1. Get Daily.co API Key (Optional but Recommended)

**Without API Key:** Voice chat will work in demo mode using Daily.co's public domain.

**With API Key (Recommended for production):**

1. Sign up at [https://www.daily.co/](https://www.daily.co/) (Free plan available)
2. Go to [Dashboard > Developers](https://dashboard.daily.co/developers)
3. Copy your API key

### 2. Configure Backend

Add to your `.env` file:

```bash
# Daily.co Configuration
DAILY_API_KEY=your_api_key_here
DAILY_DOMAIN=collabry.daily.co  # Or use your custom domain
```

**Note:** If you don't set `DAILY_API_KEY`, it will work in fallback mode (no token auth, public rooms).

### 3. Install Dependencies (Already Installed)

Frontend packages are already in `package.json`:
- `@daily-co/daily-js` - Core Daily.co SDK
- `@daily-co/daily-react` - React hooks (optional, not currently used)

### 4. Restart Servers

```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run dev
```

## 📖 How to Use

### For Users

1. Open a study board
2. Click "Voice Chat" button in the top toolbar
3. Click "Join Voice Chat"
4. Grant microphone/camera permissions (browser will prompt)
5. Use controls to:
   - 🎤 Mute/Unmute microphone
   - 📹 Toggle camera on/off
   - 📞 Leave call

### For Developers

**API Endpoint:**
```
GET /api/boards/:boardId/voice-room
```

**Response:**
```json
{
  "success": true,
  "room": {
    "url": "https://collabry.daily.co/board-id-123",
    "token": "meeting-token-xyz"
  }
}
```

**VoiceChat Component Usage:**
```tsx
import { VoiceChat } from '@/components/VoiceChat';

<VoiceChat boardId={boardId} onClose={() => setShowVoiceChat(false)} />
```

## 🔧 Configuration Options

### Daily.co Service (`daily.service.js`)

```javascript
{
  privacy: 'private',           // Room privacy level
  enable_screenshare: true,     // Allow screen sharing
  enable_chat: false,           // Daily's built-in chat (disabled, we have our own)
  enable_knocking: false,       // Require approval to join
  start_video_off: true,        // Join with camera off by default
  start_audio_off: false,       // Join with mic on by default
  max_participants: 20,         // Maximum participants
  exp: 24 * 60 * 60            // Room expires in 24 hours
}
```

### Customize in `backend/src/services/daily.service.js` line 30-40

## 🔐 Security Features

- ✅ **Authentication Required**: Only authenticated users can create rooms
- ✅ **Board Access Control**: Users must have access to the board to join voice chat
- ✅ **Meeting Tokens**: Secure token-based room access (when API key configured)
- ✅ **Private Rooms**: Rooms are private by default
- ✅ **Auto-expiry**: Rooms automatically expire after 24 hours

## 🎨 UI Customization

The VoiceChat component (`frontend/components/VoiceChat.tsx`) can be customized:

- **iframe size**: Line 55 - `height: '400px'`
- **Button variants**: Lines 179-205
- **Colors**: Update Tailwind classes throughout the component

## 📊 Daily.co Free Plan Limits

- ✅ Up to 5,000 participant minutes/month
- ✅ Up to 20 participants per call
- ✅ Unlimited rooms
- ✅ HIPAA compliance
- ✅ Recording available

Perfect for testing and small deployments!

## 🐛 Troubleshooting

### "Failed to join voice chat"
- Check browser console for errors
- Verify microphone/camera permissions
- Check backend logs for API errors
- Ensure `.env` file is loaded (restart backend)

### No video showing
- Camera is off by default (`start_video_off: true`)
- Click video button to enable
- Grant camera permissions in browser

### "Voice chat error occurred"
- Check Daily.co API key is valid
- Verify API quota not exceeded
- Check network connectivity
- Review backend logs

### Room not found
- Rooms auto-expire after 24 hours
- Check Daily.co dashboard for room status

## 🔄 What Happens Without API Key

Without `DAILY_API_KEY`:
- ✅ Voice chat still works
- ⚠️ Uses public Daily.co domain
- ⚠️ No meeting tokens (less secure)
- ⚠️ Limited customization options
- ✅ Perfect for development/testing

## 🚀 Production Deployment

For production:

1. ✅ Get Daily.co paid plan if needed (based on usage)
2. ✅ Set up custom domain in Daily.co dashboard
3. ✅ Update `DAILY_DOMAIN` in `.env`
4. ✅ Add `DAILY_API_KEY` to production environment variables
5. ✅ Configure SSL/HTTPS (Daily.co requires HTTPS)
6. ✅ Test with multiple users

## 📚 Additional Resources

- [Daily.co Documentation](https://docs.daily.co/)
- [Daily.co React SDK](https://docs.daily.co/reference/daily-react)
- [Daily.co Dashboard](https://dashboard.daily.co/)
- [API Reference](https://docs.daily.co/reference/rest-api)

## ✨ Future Enhancements

Potential improvements:
- [ ] Screen sharing UI controls
- [ ] Recording functionality
- [ ] Speaker detection/highlighting
- [ ] Participant grid view
- [ ] Chat integration
- [ ] Noise cancellation
- [ ] Background blur
- [ ] Virtual backgrounds

---

**That's it! Voice chat is ready to use.** 🎉

Just click the Voice Chat button on any study board to start collaborating!
