# AI Engine Setup & Configuration

## Quick Start

### 1. Start the AI Engine Server
```powershell
cd C:\Users\Admin\Documents\GitHub\collabry\ai-engine
python .\run_server.py
```

Or use the startup script:
```powershell
.\start-server.ps1
```

The server will start on **http://localhost:8000**

### 2. API Documentation
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Configuration

### Environment Variables (.env)
The `.env` file contains all configuration:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB=collabry

# JWT Authentication (must match backend)
JWT_SECRET_KEY=your-super-secret-access-token-key-change-this-in-production
JWT_ALGORITHM=HS256
```

### CORS Configuration
The server is configured to accept requests from:
- http://localhost:3000 (Next.js frontend)
- http://localhost:5000 (Node.js backend)

### JWT Authentication
The AI engine validates JWT tokens from the backend. The `JWT_SECRET_KEY` in the AI engine's `.env` file **must match** the `JWT_ACCESS_SECRET` in the backend's `.env` file for authentication to work.

## Prerequisites

### Required Services
1. **MongoDB** - Running on port 27017
2. **Ollama** - Running on port 11434 with llama3.1 model

### Python Dependencies
The correct packages are installed from `requirements.txt`:
```bash
pip install -r requirements.txt
```

**Important**: We use `python-jose` (NOT `jose`) for JWT handling.

## Common Issues & Solutions

### Issue: `jose` SyntaxError
**Problem**: Wrong jose package installed
**Solution**:
```bash
pip uninstall jose -y
pip install python-jose[cryptography]
```

### Issue: MongoDB Connection Failed
**Problem**: MongoDB not running
**Solution**: Start MongoDB service
```bash
mongod
```

### Issue: Ollama Connection Failed
**Problem**: Ollama not running or wrong model
**Solution**: Start Ollama and pull the model
```bash
ollama serve
ollama pull llama3.1
```

### Issue: JWT Authentication Failed
**Problem**: JWT secrets don't match between backend and AI engine
**Solution**: Update `.env` in both services:
- Backend: `JWT_ACCESS_SECRET`
- AI Engine: `JWT_SECRET_KEY`

Both must have the same value.

## API Integration

### From Frontend
The frontend should NOT call the AI engine directly. Instead, it should call the backend (port 5000), which then forwards requests to the AI engine (port 8000).

### From Backend
The backend can call AI engine endpoints with JWT authentication:
```javascript
const response = await axios.post('http://localhost:8000/api/chat', {
  message: "Hello",
  user_id: "user123"
}, {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});
```

## Server Status

✅ **Fixed Issues:**
- ✅ Replaced incorrect `jose` package with `python-jose`
- ✅ Configured CORS for frontend and backend
- ✅ JWT secrets synchronized with backend
- ✅ MongoDB connection verified
- ✅ Server starts successfully on port 8000

🚀 **Server is ready to use!**
