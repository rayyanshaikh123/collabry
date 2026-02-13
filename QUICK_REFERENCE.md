# 🚀 Collabry Docker Quick Reference

## ⚡ Quick Commands

### Start Everything
```bash
docker compose up -d
```

### View Logs
```bash
docker compose logs -f              # All services
docker compose logs -f backend      # Specific service
docker compose logs --tail=100 ai-engine  # Last 100 lines
```

### Check Status
```bash
docker compose ps                   # Service status
docker stats                        # Resource usage
curl http://localhost:5000/ready    # Backend readiness
```

### Restart Service
```bash
docker compose restart backend
docker compose restart ai-engine
```

### Scale Services
```bash
docker compose up -d --scale backend=5
docker compose up -d --scale ai-engine=3
```

### Stop Everything
```bash
docker compose down                 # Stop and remove
docker compose stop                 # Just stop
```

---

## 🔧 Installation Steps

### 1. Install Dependencies
```bash
cd backend
npm install redis@^4.7.0 rate-limit-redis@^4.2.0
cd ..
```

### 2. Configure Environment
```bash
copy .env.example .env              # Windows
cp .env.example .env                # Linux/Mac

# Edit .env and set:
# - MONGODB_URI
# - JWT_ACCESS_SECRET (generate with crypto)
# - JWT_REFRESH_SECRET (generate with crypto)
# - OPENAI_API_KEY
# - REDIS_URL=redis://redis:6379
```

### 3. Build Images
```bash
docker compose build
```

### 4. Start Services
```bash
docker compose up -d
```

### 5. Verify
```bash
curl http://localhost:5000/health
curl http://localhost:5000/ready
curl http://localhost:8000/health
curl http://localhost:3000/api/health
```

---

## 🎯 Service Endpoints

| Service | Port | Health | Purpose |
|---------|------|--------|---------|
| Frontend | 3000 | `/api/health` | Next.js SSR |
| Backend | 5000 | `/health`, `/ready` | Express API |
| AI-Engine | 8000 | `/health` | FastAPI + LLM |
| Redis | 6379 | - | Rate limiting |

---

## 🐛 Troubleshooting

### Container Won't Start
```bash
docker compose logs <service>
docker inspect collabry-<service>
```

### MongoDB Connection Failed
```bash
# Check env var
docker compose exec backend printenv MONGODB_URI

# Test connection
docker compose exec backend node -e "const m=require('mongoose'); m.connect(process.env.MONGODB_URI).then(()=>console.log('OK')).catch(console.error)"
```

### Redis Not Connecting
```bash
# Test Redis
docker compose exec redis redis-cli ping

# Test from backend
docker compose exec backend node -e "const r=require('redis'); const c=r.createClient({url:'redis://redis:6379'}); c.connect().then(()=>c.ping()).then(console.log)"
```

### Out of Memory
```bash
# Check usage
docker stats

# Increase in docker-compose.yml:
# services:
#   ai-engine:
#     deploy:
#       resources:
#         limits:
#           memory: 6G

docker compose up -d ai-engine
```

### Reset Everything
```bash
# Stop and remove all containers + volumes
docker compose down -v

# Remove all images
docker compose down --rmi all

# Start fresh
docker compose build --no-cache
docker compose up -d
```

---

## 📊 Monitoring

### Resource Usage
```bash
docker stats                        # Live stats
docker system df                    # Disk usage
```

### Log Analysis
```bash
# Errors only
docker compose logs backend | findstr ERROR

# AI operations
docker compose logs backend | findstr "ai_operation"

# Slow queries
docker compose logs backend | findstr "slow_query"
```

### Health Checks
```bash
# All health endpoints
curl http://localhost:5000/health
curl http://localhost:5000/ready
curl http://localhost:8000/health
curl http://localhost:3000/api/health

# Backend readiness JSON
curl http://localhost:5000/ready | jq
```

---

## 🔄 Updates

### Deploy New Version
```bash
# Windows
.\deploy.ps1 -Version v1.1.0

# Linux/Mac
VERSION=v1.1.0 ./deploy.sh
```

### Manual Update
```bash
# Build new version
docker compose build backend

# Zero-downtime restart
docker compose up -d --no-deps backend
```

### Rollback
```bash
# Stop current
docker compose stop backend

# Revert to previous image
docker compose up -d backend
```

---

## 🔐 Security Checklist

- [ ] JWT secrets are random 64-char hex (not example values!)
- [ ] CORS_ORIGIN set to exact domain (no wildcards)
- [ ] MongoDB URI uses strong password
- [ ] Redis has authentication enabled (production)
- [ ] OpenAI API key rotated periodically
- [ ] SSL/TLS enabled on reverse proxy
- [ ] Firewall rules configured
- [ ] Containers run as non-root user ✅ (already configured)

---

## 📦 Backup & Restore

### Backup FAISS Index
```bash
docker compose exec ai-engine tar -czf /tmp/faiss-backup.tar.gz /app/data/faiss_index
docker cp collabry-ai-engine:/tmp/faiss-backup.tar.gz ./backups/faiss-$(date +%Y%m%d).tar.gz
```

### Restore FAISS Index
```bash
docker cp ./backups/faiss-backup.tar.gz collabry-ai-engine:/tmp/
docker compose exec ai-engine tar -xzf /tmp/faiss-backup.tar.gz -C /
docker compose restart ai-engine
```

### Backup Uploads
```bash
docker compose exec backend tar -czf /tmp/uploads-backup.tar.gz /app/uploads
docker cp collabry-backend:/tmp/uploads-backup.tar.gz ./backups/
```

---

## 🎛️ Environment Variables Quick Ref

```bash
# Required
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>
OPENAI_API_KEY=sk-proj-...

# Optional
OPENAI_MODEL=gpt-4o-mini
REDIS_URL=redis://redis:6379
CORS_ORIGIN=https://yourdomain.com
MAX_AGENT_ITERATIONS=5

# Frontend (build-time)
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_AI_ENGINE_URL=http://localhost:5000/api/ai
```

---

## 📚 Documentation

- **[DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)** - Complete deployment guide
- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Implementation summary
- **[.env.example](.env.example)** - Environment variable template
- **[docker-compose.yml](docker-compose.yml)** - Service configuration

---

## 🆘 Support

### Check Logs First
```bash
docker compose logs -f
```

### Common Issues

1. **"Cannot connect to MongoDB"**
   - Check MONGODB_URI in .env
   - Verify MongoDB Atlas IP whitelist

2. **"Redis connection failed"**
   - Ensure Redis container is running: `docker compose ps redis`
   - Check REDIS_URL matches service name: `redis://redis:6379`

3. **"Rate limiting not working"**
   - Verify Redis is connected: `curl http://localhost:5000/ready`
   - Check backend logs for Redis errors

4. **"AI requests timeout"**
   - Increase timeout in Nginx/reverse proxy
   - Check AI-engine memory: `docker stats collabry-ai-engine`

5. **"Frontend build fails"**
   - Check NEXT_PUBLIC_* vars are set
   - Rebuild: `docker compose build --no-cache frontend`

---

**Created by:** Senior DevOps Engineer  
**Date:** February 13, 2026  
**Version:** 1.0.0
