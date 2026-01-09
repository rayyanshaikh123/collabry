# Quick Setup - Email Password Reset

## 🚀 5-Minute Setup Guide

### Step 1: Configure Gmail (Easiest)

1. **Enable 2FA on Gmail**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Update Backend `.env`**
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `.env` and add:
   ```env
   # Email Configuration
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=abcdefghijklmnop
   EMAIL_FROM=your-email@gmail.com
   EMAIL_FROM_NAME=Collabry
   FRONTEND_URL=http://localhost:3000
   ```

### Step 2: Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 3: Test It!

1. Go to http://localhost:3000/login
2. Click **"Forgot Password?"**
3. Enter your email
4. Check your inbox
5. Click the reset link
6. Set new password
7. Login with new password ✅

---

## 📧 Email Configuration Options

### Option 1: Gmail (Development)
✅ Easiest for testing
✅ Free
✅ Works immediately

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password-16-chars
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Collabry
```

### Option 2: SendGrid (Production)
✅ 100 emails/day free
✅ Professional
✅ Better deliverability

```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.your-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Collabry
```

### Option 3: Mailgun (Production)
✅ 5,000 emails/month free
✅ Reliable
✅ Good analytics

```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=postmaster@yourdomain.mailgun.org
EMAIL_PASSWORD=your-mailgun-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Collabry
```

---

## 🧪 Testing Checklist

- [ ] Backend starts without errors
- [ ] Email service initialized (check console: `✉️ Email service initialized`)
- [ ] Frontend loads at http://localhost:3000
- [ ] Forgot password page accessible
- [ ] Email received successfully
- [ ] Reset link works
- [ ] Password updated successfully
- [ ] Can login with new password

---

## 🐛 Troubleshooting

**❌ Backend Error: "Email service initialization failed"**
- Check EMAIL_USER and EMAIL_PASSWORD in `.env`
- For Gmail: Must use App Password, not regular password
- Verify EMAIL_SERVICE is set to "gmail"

**❌ Email Not Received**
- Check spam/junk folder
- Verify email address is correct
- Check backend logs for email sending confirmation
- Test email configuration: restart backend and check console

**❌ "Invalid or expired reset token"**
- Token expires after 1 hour - request a new one
- Token is single-use only
- Don't modify the URL manually

---

## 📝 Files Created/Modified

### Backend
- ✅ `src/utils/emailService.js` - Email service with templates
- ✅ `src/models/User.js` - Added reset token fields
- ✅ `src/services/auth.service.js` - Forgot/reset password logic
- ✅ `src/controllers/auth.controller.js` - API endpoints
- ✅ `src/routes/auth.routes.js` - Routes
- ✅ `src/config/env.js` - Email configuration
- ✅ `.env.example` - Email variables documented

### Frontend
- ✅ `app/(auth)/forgot-password/page.tsx` - Forgot password UI
- ✅ `app/(auth)/reset-password/page.tsx` - Reset password UI
- ✅ `src/services/auth.service.ts` - API methods
- ✅ `views/Auth.tsx` - Added "Forgot Password?" link

### Documentation
- ✅ `EMAIL_PASSWORD_RESET.md` - Complete documentation
- ✅ `QUICK_SETUP_EMAIL.md` - This file

---

## 🎉 That's It!

Password reset is now fully functional. Users can:
1. Request password reset from login page
2. Receive beautiful branded email
3. Click secure reset link
4. Set new password
5. Login immediately

**Need help?** Check `EMAIL_PASSWORD_RESET.md` for detailed documentation.
