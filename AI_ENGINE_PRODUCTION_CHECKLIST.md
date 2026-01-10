# 🚀 AI Engine Production Deployment Checklist

**Current Status:** 🟡 **Development Ready** → **Production Deployment Needed**

---

## ✅ WHAT'S DONE (Already Production-Ready)

### 1. **Core Architecture** ✅
- [x] FastAPI REST API with JWT authentication
- [x] Multi-user isolation (user_id scoping)
- [x] MongoDB persistence for conversations
- [x] RAG pipeline with FAISS embeddings
- [x] Session management (multiple chats per user)
- [x] Background task processing for document uploads
- [x] Health check endpoint (`/health`)
- [x] OpenAPI documentation (`/docs`)

### 2. **Security** ✅
- [x] JWT token validation (synced with backend)
- [x] User authentication required for all endpoints
- [x] Multi-user data isolation
- [x] Environment variables for secrets
- [x] MongoDB authentication enabled

### 3. **AI Features** ✅
- [x] Study Copilot chat (streaming & non-streaming)
- [x] Document Q&A with RAG
- [x] Summarization
- [x] Mind map generation
- [x] Quiz generation
- [x] Web search integration
- [x] Tool system (web scraping, OCR, etc.)

### 4. **Configuration** ✅
- [x] Environment-based configuration
- [x] Ollama integration (local LLM)
- [x] MongoDB Atlas connection
- [x] CORS configured
- [x] Logging system

---

## ⚠️ WHAT'S REMAINING (Critical for Production)

### 1. **🔴 CRITICAL: Hardcoded Development Values**

#### Issue: CORS Origins
**File:** `ai-engine/server/main.py` (lines 77-80)
```python
# ❌ HARDCODED LOCALHOST
origins = [
    "http://localhost:3000",  # Dev only
    "http://localhost:5000",  # Dev only
    "http://127.0.0.1:3000",  # Dev only
    "http://127.0.0.1:5000",  # Dev only
]
```

**Fix Required:**
```python
# ✅ PRODUCTION
import os
origins = os.environ.get("CORS_ORIGINS", "").split(",")
# .env.production: CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

#### Issue: Database Credentials in .env
**File:** `ai-engine/.env` (line 31)
```dotenv
# ❌ EXPOSED CREDENTIALS
MONGO_URI=mongodb+srv://nirmal:nirmal21@cluster0.sunt7fe.mongodb.net/collabry
```

**Fix Required:**
- Use production MongoDB cluster (not development)
- Store credentials in secure secret manager (not in .env)
- Rotate database password

---

### 2. **🔴 CRITICAL: Missing Deployment Infrastructure**

#### No Dockerfile
**Status:** ❌ Not Created

**Required:**
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Expose port
EXPOSE 8000

# Run server
CMD ["python", "run_server.py", "--host", "0.0.0.0", "--port", "8000"]
```

#### No Docker Compose
**Status:** ❌ Not Created

**Required:** For local production testing with Ollama

#### No CI/CD Pipeline
**Status:** ❌ Not Created

**Required:**
- GitHub Actions workflow
- Automated testing
- Docker image build & push
- Deployment automation

---

### 3. **🟡 IMPORTANT: Ollama Deployment**

#### Current Issue: Localhost Ollama
**Current:** `OLLAMA_BASE_URL=http://localhost:11434`

**Production Options:**

**Option A: Deploy Ollama with Your App**
```dockerfile
# docker-compose.yml
version: '3.8'
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
  
  ai-engine:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
    depends_on:
      - ollama

volumes:
  ollama_data:
```

**Option B: Use Cloud LLM API**
- Switch to OpenAI/Anthropic/Groq APIs
- Cheaper for low volume, no GPU hosting needed
- Update `core/local_llm.py` to use API clients

---

### 4. **🟡 IMPORTANT: Production MongoDB**

**Current:** Using development cluster with exposed credentials

**Required:**
1. **Create Production MongoDB Cluster**
   - Separate from development
   - Production-grade tier (not shared)
   - Enable backup automation
   - Restrict IP access

2. **Configure Connection**
   ```dotenv
   # Use connection string secret
   MONGO_URI=${MONGO_CONNECTION_STRING}  # From secret manager
   ```

3. **Database Indexes**
   - Ensure indexes exist for performance:
     - `user_id` + `timestamp` (conversations)
     - `session_id` (conversations)
     - User-specific document filtering

---

### 5. **🟡 IMPORTANT: Environment Configuration**

#### Create Production .env
**File:** `ai-engine/.env.production`

```dotenv
# Production Environment
NODE_ENV=production

# Ollama (Production)
OLLAMA_BASE_URL=http://ollama:11434  # Docker internal
# OR use cloud API:
# OPENAI_API_KEY=sk-...
# USE_OPENAI=true

# MongoDB (Production - use secret manager)
MONGO_URI=${MONGO_CONNECTION_STRING}
MONGO_DB=collabry_prod

# JWT (Must match backend)
JWT_SECRET_KEY=${BACKEND_JWT_ACCESS_SECRET}

# CORS (Production domains)
CORS_ORIGINS=https://collabry.com,https://api.collabry.com

# External APIs
SERPER_API_KEY=${SERPER_KEY}  # Web search

# Resource Limits
OLLAMA_TIMEOUT=120
OLLAMA_MAX_RETRIES=3

# Logging
LOG_LEVEL=INFO
```

---

### 6. **🟢 RECOMMENDED: Monitoring & Logging**

#### Add Structured Logging
**Status:** ❌ Not Configured

**Required:**
- Use `python-json-logger` for structured logs
- Send logs to centralized system (CloudWatch, Datadog, etc.)
- Add request ID tracing

#### Add Metrics
**Status:** ❌ Not Configured

**Required:**
- Prometheus metrics endpoint
- Track:
  - Request latency
  - Ollama response time
  - Token usage
  - Error rates
  - Active sessions

#### Error Tracking
**Status:** ❌ Not Configured

**Required:**
- Sentry integration for error tracking
- Alert on critical errors

---

### 7. **🟢 RECOMMENDED: Performance Optimization**

#### Add Caching
**Status:** ❌ Not Implemented

**Recommendations:**
- Redis cache for:
  - Embeddings (avoid re-computing)
  - Frequently accessed documents
  - Session metadata
- Cache TTL: 1 hour

#### Connection Pooling
**Status:** ⚠️ Basic

**Improvements:**
- Configure MongoDB connection pool size
- Add connection retry logic
- Implement circuit breaker for Ollama

---

### 8. **🟢 RECOMMENDED: Security Hardening**

#### Rate Limiting
**Status:** ❌ Not Implemented

**Required:**
```python
# Add rate limiting per user
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/ai/chat")
@limiter.limit("20/minute")  # 20 requests per minute per user
async def chat_endpoint(...):
    ...
```

#### Input Validation
**Status:** ⚠️ Basic

**Improvements:**
- Add request size limits
- Sanitize file uploads
- Validate JWT claims strictly

#### Secrets Management
**Status:** ⚠️ Environment Variables Only

**Recommended:**
- Use AWS Secrets Manager / Azure Key Vault / GCP Secret Manager
- Rotate secrets automatically
- Never commit secrets to git

---

## 📋 DEPLOYMENT STEPS (What You Need to Do)

### Phase 1: Immediate (Before Any Production Traffic)

#### Step 1: Fix Hardcoded Values
```powershell
cd ai-engine
```

1. **Update CORS origins:**
   Edit `server/main.py`:
   ```python
   import os
   origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
   ```

2. **Create .env.production:**
   ```powershell
   Copy-Item .env .env.production
   # Edit with production values
   ```

3. **Remove credentials from .env:**
   ```dotenv
   MONGO_URI=${MONGO_CONNECTION_STRING}  # Will be injected at runtime
   ```

#### Step 2: Create Dockerfile
Create `ai-engine/Dockerfile` (see template above)

#### Step 3: Test Docker Build
```powershell
docker build -t collabry-ai-engine:latest .
docker run -p 8000:8000 --env-file .env.production collabry-ai-engine:latest
```

---

### Phase 2: Production Infrastructure (1-2 days)

#### Step 4: Deploy Ollama

**Option A: Self-Hosted (GPU Required)**
- Rent GPU server (AWS g4dn.xlarge, $0.52/hr)
- Install Ollama
- Pull model: `ollama pull llama3.2`
- Secure with VPC/firewall
- Update `OLLAMA_BASE_URL` to server IP

**Option B: Cloud API (Easier)**
- Get OpenAI/Anthropic API key
- Update code to use API instead of Ollama
- Cheaper for <10K requests/day

#### Step 5: Production MongoDB
1. Create new MongoDB Atlas cluster (Production tier)
2. Enable backup automation
3. Configure IP whitelist
4. Rotate credentials
5. Update connection string in secret manager

#### Step 6: Deploy to Cloud

**Recommended: Render.com (Easiest)**
```bash
# Deploy in 5 minutes
1. Connect GitHub repo
2. Select "Web Service"
3. Build: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
4. Start: `python run_server.py --host 0.0.0.0 --port $PORT`
5. Add environment variables from .env.production
```

**Alternative: AWS ECS / Google Cloud Run / Azure Container Apps**
- Build Docker image
- Push to registry
- Deploy with environment secrets

---

### Phase 3: Monitoring & Optimization (ongoing)

#### Step 7: Add Monitoring
```powershell
pip install prometheus-fastapi-instrumentator sentry-sdk
```

Update `server/main.py`:
```python
from prometheus_fastapi_instrumentator import Instrumentator
import sentry_sdk

sentry_sdk.init(dsn="your-sentry-dsn")
Instrumentator().instrument(app).expose(app)
```

#### Step 8: Performance Testing
```powershell
# Load test with 100 concurrent users
pip install locust
locust -f tests/load_test.py --host http://your-domain.com
```

#### Step 9: Set Up Alerts
- Alert on 5xx errors > 1%
- Alert on p95 latency > 5s
- Alert on Ollama downtime
- Alert on MongoDB connection failures

---

## 💰 PRODUCTION COSTS ESTIMATE

### Minimal Setup (Self-Hosted Ollama)
| Service | Cost/Month |
|---------|-----------|
| GPU Server (AWS g4dn.xlarge) | ~$374 |
| MongoDB Atlas (M10) | $57 |
| Domain + SSL | $15 |
| **Total** | **~$446/month** |

### Cloud LLM Setup (No GPU)
| Service | Cost/Month |
|---------|-----------|
| App Hosting (Render.com) | $7-25 |
| OpenAI API (10K requests) | $10-50 |
| MongoDB Atlas (M10) | $57 |
| Domain + SSL | $15 |
| **Total** | **~$89-147/month** |

**Recommendation:** Start with Cloud LLM (OpenAI/Groq) for lower initial cost, switch to self-hosted Ollama if usage grows >50K requests/month.

---

## 🎯 PRIORITY RANKING

### Must Do Before Production (P0)
1. ✅ Fix hardcoded CORS origins
2. ✅ Move credentials to secret manager
3. ✅ Create production MongoDB cluster
4. ✅ Choose Ollama vs Cloud LLM strategy
5. ✅ Create Dockerfile
6. ✅ Deploy to cloud (Render/AWS/GCP)

### Should Do Soon (P1)
7. ⚠️ Add rate limiting
8. ⚠️ Add error tracking (Sentry)
9. ⚠️ Set up monitoring (Prometheus)
10. ⚠️ Performance testing

### Nice to Have (P2)
11. 💡 Redis caching
12. 💡 CI/CD pipeline
13. 💡 Auto-scaling
14. 💡 Backup automation

---

## 📊 READINESS SCORE

**Current:** 65/100 🟡

| Category | Score | Notes |
|----------|-------|-------|
| Core Features | 95/100 ✅ | All working |
| Security | 70/100 ⚠️ | JWT done, needs rate limiting |
| Infrastructure | 30/100 🔴 | No Docker/deployment |
| Monitoring | 10/100 🔴 | Basic logs only |
| Scalability | 50/100 ⚠️ | Works but not optimized |

**After P0 Tasks:** 85/100 ✅ (Production-Ready)

---

## 🚀 QUICKEST PATH TO PRODUCTION

### Day 1 (3 hours)
1. Fix CORS origins → Environment variable
2. Create Dockerfile
3. Sign up for Render.com
4. Deploy AI engine to Render
5. Use OpenAI API (skip Ollama setup)

### Day 2 (2 hours)
6. Create production MongoDB cluster
7. Update environment variables on Render
8. Test end-to-end with frontend
9. Add Sentry for error tracking

### Day 3 (1 hour)
10. Performance testing
11. Go live! 🎉

**Total Time:** 6 hours over 3 days
**Total Cost:** ~$89/month initially

---

## 📝 DEPLOYMENT COMMAND REFERENCE

### Docker Build & Run
```powershell
# Build
docker build -t collabry-ai:prod .

# Run locally
docker run -p 8000:8000 \
  -e MONGO_URI=$env:MONGO_URI \
  -e JWT_SECRET_KEY=$env:JWT_SECRET \
  -e OLLAMA_BASE_URL=$env:OLLAMA_URL \
  collabry-ai:prod

# Push to registry
docker tag collabry-ai:prod yourusername/collabry-ai:latest
docker push yourusername/collabry-ai:latest
```

### Render.com Deployment
```yaml
# render.yaml
services:
  - type: web
    name: collabry-ai-engine
    env: python
    buildCommand: "pip install -r requirements.txt && python -m spacy download en_core_web_sm"
    startCommand: "python run_server.py --host 0.0.0.0 --port $PORT"
    envVars:
      - key: MONGO_URI
        sync: false  # Add via dashboard
      - key: JWT_SECRET_KEY
        sync: false
      - key: OPENAI_API_KEY
        sync: false
```

---

## ✅ FINAL CHECKLIST

Before going live:
- [ ] Remove all localhost references
- [ ] Credentials in secret manager (not .env)
- [ ] Production MongoDB cluster created
- [ ] Ollama OR OpenAI configured
- [ ] CORS origins updated
- [ ] Dockerfile tested
- [ ] Deployed to cloud
- [ ] Health check returns 200
- [ ] Frontend can connect
- [ ] Chat works end-to-end
- [ ] Error tracking enabled
- [ ] Monitoring dashboard set up

**Good luck with your deployment! 🚀**
