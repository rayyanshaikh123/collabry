# Google Drive Integration for Study Board

All images added to the collaborative study board are automatically uploaded to your Google Drive for persistent storage.

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Library**
4. Search for "Google Drive API" and enable it

### 2. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Web application** as the application type
4. Configure the OAuth consent screen if prompted:
   - User Type: External
   - Add your email as a test user
   - Scopes: Just use the default scopes
5. Add Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://yourdomain.com
   ```
6. Click **CREATE**
7. Copy the **Client ID** (looks like `xxxxx.apps.googleusercontent.com`)

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Client ID:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

## How It Works

### Image Upload Flow

1. User adds an image to the study board (drag & drop, paste, or import from mindmap)
2. First time: User is prompted to authorize Google Drive access
3. Image is uploaded to a folder named "Collabry Study Board Images" in their Drive
4. Only the Drive file ID is stored in the database (not the full image data)
5. Other collaborators can view the image via public Drive URL

### Image Loading Flow

1. Board loads existing shapes from database
2. For images with Drive file IDs, public URLs are generated
3. Images are displayed directly from Google Drive
4. No bandwidth impact on your backend server

### Fallback Behavior

If Google Drive upload fails (no internet, user denies access, etc.):
- Images are stored as base64 data in the database (local fallback)
- Still works, but consumes more database storage
- Consider adding storage limits if using fallback extensively

## Features

✅ **Persistent Storage**: Images survive page reloads and browser sessions  
✅ **Cross-Device**: Access your boards with images from any device  
✅ **Collaborative**: All team members see the same images  
✅ **No Size Limits**: Uses your personal Drive storage  
✅ **Private**: Files are in your own Google Drive  
✅ **Automatic**: No manual upload/download required  

## Folder Structure

All images are stored in:
```
Google Drive
└── Collabry Study Board Images
    ├── mindmap-123456.svg
    ├── screenshot-789012.png
    └── diagram-345678.jpg
```

## Security

- Users must explicitly grant Drive access (OAuth consent)
- Images are uploaded to the user's own Drive account
- Files are set to "anyone with link can view" for collaboration
- You can revoke access anytime from [Google Account Settings](https://myaccount.google.com/permissions)

## Troubleshooting

### "Failed to upload to Google Drive"

Check:
1. Client ID is correctly set in `.env.local`
2. Google Drive API is enabled in Cloud Console
3. Your domain is in Authorized JavaScript origins
4. You granted permissions when prompted

### "Drive access denied"

- The user clicked "Deny" on the OAuth consent screen
- Try again: the app will re-prompt for access
- Fallback: Images will be stored locally in the database

### Images not loading

1. Check browser console for errors
2. Verify Drive file ID is stored in shape meta
3. Check if file exists in your Drive folder
4. Ensure file permissions are set to "anyone with link"

## Development Notes

- Service: `frontend/src/lib/googleDrive.ts`
- Integration: `frontend/views/StudyBoardNew.tsx`
- Token stored in localStorage with expiry
- Folder ID cached to avoid repeated API calls
- Public URLs generated for cross-browser access
