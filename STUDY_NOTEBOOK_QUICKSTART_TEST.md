# Study Notebook - Quick Start Guide

## Prerequisites

Ensure all servers are running:

1. **MongoDB** (default port 27017)
2. **Backend Server** (port 5000)
3. **AI Engine** (port 8000)
4. **Frontend** (port 3000)

## Starting the Servers

### 1. Start MongoDB
```powershell
# If using MongoDB service
net start MongoDB

# Or if using mongod directly
mongod --dbpath "C:\data\db"
```

### 2. Start Backend Server
```powershell
cd backend
npm install  # First time only
npm run dev
```

Expected output: `Server running on port 5000`

### 3. Start AI Engine
```powershell
cd ai-engine
# Activate virtual environment (if using)
.\venv\Scripts\Activate.ps1

python run_server.py
```

Expected output: `Uvicorn running on http://localhost:8000`

### 4. Start Frontend
```powershell
cd frontend
npm install  # First time only
npm run dev
```

Expected output: `Ready on http://localhost:3000`

## Testing the Study Notebook

### Test 1: Create Notebook
1. Navigate to `http://localhost:3000/study-notebook/new`
2. Should auto-create a notebook and redirect to `/study-notebook/[id]`
3. **Expected**: 3-column layout appears with empty state

### Test 2: Add Sources

#### PDF Upload
1. Click "+ Add Source" → Select "PDF"
2. Choose a PDF file (max 50MB)
3. **Expected**: Source appears in left panel with file name and size

#### Text Note
1. Click "+ Add Source" → Select "Text Note"
2. Enter some text content
3. Provide a title
4. **Expected**: Note appears in left panel

#### Website URL
1. Click "+ Add Source" → Select "Website"
2. Enter a URL (e.g., `https://example.com`)
3. **Expected**: Website appears in left panel

### Test 3: Chat with AI

1. Select at least one source (checkbox)
2. Type a question in chat panel: "Summarize the main points"
3. Click Send or press Enter
4. **Expected**: 
   - User message appears immediately
   - AI response streams in word-by-word
   - Loading spinner shows while generating

### Test 4: Generate Quiz

1. Ensure sources are selected
2. Click "Generate Quiz" in right panel
3. **Expected**:
   - "Generating..." indicator appears
   - After ~10 seconds, quiz appears in artifacts list
   - Click quiz to view in modal

### Test 5: Generate Mind Map

1. Ensure sources are selected
2. Click "Generate Mind Map" in right panel
3. **Expected**:
   - "Generating..." indicator appears
   - After ~15 seconds, mind map appears in artifacts list
   - Click mind map to view in modal

## API Endpoints to Test

### Backend (http://localhost:5000)

```powershell
# Get auth token first
$token = "your_jwt_token_here"

# Create notebook
curl http://localhost:5000/api/notebook `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"title":"Test Notebook"}' `
  -Method POST

# List notebooks
curl http://localhost:5000/api/notebook `
  -H "Authorization: Bearer $token"

# Add source (PDF)
curl http://localhost:5000/api/notebook/[notebook_id]/sources `
  -H "Authorization: Bearer $token" `
  -F "type=pdf" `
  -F "name=Test PDF" `
  -F "file=@path/to/file.pdf" `
  -Method POST
```

### AI Engine (http://localhost:8000)

```powershell
# Test chat
curl "http://localhost:8000/ai/sessions/[session_id]/chat/stream?message=Hello&use_rag=false" `
  -H "Authorization: Bearer $token"

# Test quiz generation
curl http://localhost:8000/ai/generate/quiz `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"content":"Test content","count":5,"save":true}' `
  -Method POST

# Test mind map generation
curl http://localhost:8000/ai/generate/mindmap `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"topic":"Test Topic","depth":3}' `
  -Method POST
```

## Troubleshooting

### Issue: "Notebook not found"
**Solution**: 
- Check backend logs for errors
- Verify MongoDB is running
- Ensure JWT token is valid
- Try creating a new notebook at `/study-notebook/new`

### Issue: "Failed to upload PDF"
**Solution**:
- Check file size (must be < 50MB)
- Verify file is actually a PDF
- Check backend has write permissions to `uploads/` folder
- Create `uploads/sources/` folder if it doesn't exist

### Issue: "AI response not streaming"
**Solution**:
- Verify AI Engine is running on port 8000
- Check AI Engine logs for errors
- Ensure Ollama is installed and running
- Test AI Engine directly: `curl http://localhost:8000/health`

### Issue: "Quiz/Mind map generation fails"
**Solution**:
- Check AI Engine logs
- Verify sources are selected
- Ensure Ollama model is loaded
- Check MongoDB connection

### Issue: TypeScript errors in editor
**Solution**:
- Restart TypeScript server in VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
- Delete `node_modules` and reinstall: `npm install`
- Clear Next.js cache: `rm -rf .next`

## Expected Behavior

### Source Selection
- Checked sources have green checkmark badge
- Unchecked sources have gray badge
- Selected sources are included in chat context

### Chat Streaming
- User message appears instantly
- AI response appears word-by-word
- "Regenerate" button appears after response
- "Clear Chat" removes all messages

### Artifact Generation
- Button shows "Generating..." during process
- Takes 10-30 seconds depending on content
- Artifact appears in list when complete
- Click artifact to open full-screen viewer

### Artifact Viewer
- Opens as full-screen modal
- Shows artifact title and date
- Has Export and Share buttons
- Close button in top-right

## Performance Notes

### First Load
- Notebook creation: ~500ms
- AI session creation: ~1s
- Total initial load: ~1.5s

### Source Operations
- PDF upload (5MB): ~2-3s
- Text note: ~100ms
- Website scraping: ~1-5s (depends on site)

### AI Operations
- Chat response: ~3-10s (streaming)
- Quiz generation: ~10-20s
- Mind map generation: ~15-30s

## Browser Console

Open browser console (F12) to see:
- API request/response logs
- React Query cache updates
- Error messages
- Network activity

### Useful console commands
```javascript
// Check React Query cache
window.__REACT_QUERY_DEVTOOLS_GLOBAL__

// Check auth token
localStorage.getItem('auth-storage')

// Force refetch notebook
// (In React DevTools console with component selected)
refetch()
```

## Database Verification

Connect to MongoDB to verify data:

```javascript
// MongoDB shell
use collabry  // or your database name

// Check notebooks
db.notebooks.find().pretty()

// Check AI sessions
db.sessions.find().pretty()

// Check quizzes
db.quizzes.find().pretty()

// Check mind maps
db.mindmaps.find().pretty()
```

## File System Verification

Check uploaded files:

```powershell
# Windows
Get-ChildItem -Recurse .\backend\uploads\sources\

# Should show folder structure like:
# uploads/sources/
#   notebook_id_1/
#     source_id_1.pdf
#     source_id_2.txt
```

## Next Steps After Testing

1. **Report Issues**: Note any errors or unexpected behavior
2. **Check Logs**: Review backend and AI Engine logs
3. **Performance**: Note any slow operations
4. **UX Feedback**: Suggest improvements

## Development Tips

### Hot Reload
All three servers support hot reload:
- Frontend: Auto-reloads on file changes
- Backend: Nodemon restarts on changes
- AI Engine: Uvicorn reloads on changes

### Debug Mode
Enable verbose logging:

```javascript
// Frontend - Add to page component
console.log('Notebook data:', notebookData);
console.log('Messages:', messages);
```

```python
# AI Engine - In run_server.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

```javascript
// Backend - In app.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

## Demo Flow

Perfect flow for demonstrating the feature:

1. **Start**: Navigate to `/study-notebook/new`
2. **Add PDF**: Upload a research paper
3. **Add Note**: Write key takeaways
4. **Select Both**: Check both sources
5. **Ask Question**: "What are the main findings?"
6. **Watch Stream**: See AI response appear
7. **Generate Quiz**: Create a 10-question quiz
8. **View Quiz**: Open in full-screen viewer
9. **Generate Map**: Create a mind map
10. **Export**: Show export options

Time: ~5 minutes for full demo

---

**Ready to Test!** 🚀

Follow the steps above and report any issues you encounter.
