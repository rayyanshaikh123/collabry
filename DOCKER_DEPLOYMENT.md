# Collabry Docker Deployment Guide

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 8GB RAM (16GB recommended for production)
- MongoDB Atlas account (or local MongoDB)
- Redis Cloud account (or local Redis)
- OpenAI API key

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/collabry.git
   cd collabry
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Install backend dependencies (for Redis packages)**
   ```bash
   cd backend
   npm install redis@^4.7.0 rate-limit-redis@^4.2.0
   cd ..
   ```

4. **Build images**
   ```bash
   docker compose build
   ```

5. **Start services**
   ```bash
   docker compose up -d
   ```

6. **Check status**
   ```bash
   docker compose ps
   docker compose logs -f
   ```

---

## 📦 Service Architecture

### Frontend (Next.js 16)
- **Port:** 3000
- **Resources:** 512MB-1GB RAM, 0.5 CPU
- **Replicas:** 2-3 (behind load balancer)
- **Healthcheck:** `curl http://localhost:3000/api/health`

### Backend (Express.js 5)
- **Port:** 5000
- **Resources:** 256-512MB RAM, 0.5 CPU
- **Replicas:** 3-5 (stateless, JWT-based auth)
- **Healthcheck:** `curl http://localhost:5000/health`
- **Readiness:** `curl http://localhost:5000/ready`

### AI-Engine (FastAPI + Python)
- **Port:** 8000
- **Resources:** 2-4GB RAM, 1-2 CPU
- **Replicas:** 2-4 (CPU/RAM intensive)
- **Healthcheck:** `curl http://localhost:8000/health`
- **FAISS index:** Persistent volume at `/app/data/faiss_index`

### Backend Worker (Cron Jobs)
- **Replicas:** 1 (exactly one instance only!)
- **Resources:** 256MB RAM, 0.25 CPU
- **Runs:** Notification scheduler, subscription expiry, recycle bin cleanup

### Redis (Rate Limiting)
- **Port:** 6379
- **Resources:** 256MB RAM
- **Persistence:** Append-only file (AOF)

---

## 🔒 Environment Variables

### Required Variables

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/collabry

# JWT (CRITICAL - Generate secure values!)
JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# AI/LLM
OPENAI_API_KEY=sk-proj-your_key_here
OPENAI_MODEL=gpt-4o-mini

# Redis
REDIS_URL=redis://redis:6379
```

### Frontend Build Args

These are baked into the client bundle during build:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXT_PUBLIC_AI_ENGINE_URL=https://api.yourdomain.com/api/ai
```

⚠️ **Important:** Frontend must be rebuilt if these URLs change!

---

## 🏗️ Building for Production

### Build All Services

```bash
docker compose build --no-cache
```

### Build Specific Service

```bash
docker compose build frontend
docker compose build backend
docker compose build ai-engine
```

### Build with Custom Args

```bash
docker compose build --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.prod.com/api frontend
```

---

## 🚦 Running Services

### Development Mode (local)

```bash
docker compose up
```

### Production Mode (detached)

```bash
docker compose up -d
```

### Scale Specific Service

```bash
# Scale backend to 5 replicas
docker compose up -d --scale backend=5

# Scale AI-engine to 3 replicas
docker compose up -d --scale ai-engine=3

# NEVER scale worker (must always be 1)
docker compose up -d --scale backend-worker=1
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 ai-engine
```

---

## 🔍 Health Checks

### Liveness Probes (Is it running?)

```bash
curl http://localhost:3000/api/health  # Frontend
curl http://localhost:5000/health      # Backend
curl http://localhost:8000/health      # AI-Engine
```

### Readiness Probes (Can it serve traffic?)

```bash
curl http://localhost:5000/ready       # Backend (checks MongoDB + Redis)
```

Expected response:
```json
{
  "success": true,
  "message": "Service is ready",
  "checks": {
    "mongodb": true,
    "redis": true,
    "timestamp": "2026-02-13T10:30:00.000Z",
    "uptime": 3600
  }
}
```

---

## 🐛 Troubleshooting

### Container won't start

```bash
# Check container status
docker compose ps

# View detailed logs
docker compose logs backend

# Inspect container
docker inspect collabry-backend

# Check resource usage
docker stats
```

### MongoDB connection failed

```bash
# Test MongoDB connection from backend
docker compose exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('✅ Connected to MongoDB');
  process.exit(0);
}).catch((err) => {
  console.error('❌ MongoDB Error:', err.message);
  process.exit(1);
});
"
```

### Redis not connecting

```bash
# Test Redis from backend
docker compose exec backend node -e "
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });
client.connect().then(() => {
  console.log('✅ Connected to Redis');
  return client.ping();
}).then((pong) => {
  console.log('PING response:', pong);
  process.exit(0);
}).catch((err) => {
  console.error('❌ Redis Error:', err.message);
  process.exit(1);
});
"
```

### AI-Engine out of memory

```bash
# Check memory usage
docker stats collabry-ai-engine

# Increase memory limit in docker-compose.yml
services:
  ai-engine:
    deploy:
      resources:
        limits:
          memory: 6G  # Increase from 4G

# Restart with new limits
docker compose up -d ai-engine
```

### FAISS index lost after restart

```bash
# Check volume
docker volume inspect collabry-faiss

# Backup FAISS index
docker compose exec ai-engine tar -czf /tmp/faiss-backup.tar.gz /app/data/faiss_index
docker cp collabry-ai-engine:/tmp/faiss-backup.tar.gz ./backups/

# Restore FAISS index
docker cp ./backups/faiss-backup.tar.gz collabry-ai-engine:/tmp/
docker compose exec ai-engine tar -xzf /tmp/faiss-backup.tar.gz -C /
```

---

## 🔄 Updates & Rollbacks

### Rolling Update

```bash
# Build new version
docker compose build backend

# Restart with zero-downtime
docker compose up -d --no-deps backend
```

### Rollback

```bash
# Tag current version first
docker tag collabry-backend:latest collabry-backend:v1.0

# If deployment fails, rollback
docker tag collabry-backend:v1.0 collabry-backend:latest
docker compose up -d --no-deps backend
```

### Database Migrations

```bash
# Run migrations before deploying new code
docker compose exec backend node scripts/migrate.js

# Or use dedicated migration container
docker run --rm --env-file .env collabry-backend:latest node scripts/migrate.js
```

---

## 📊 Monitoring

### Resource Usage

```bash
# Real-time stats
docker stats

# Export to file
docker stats --no-stream > stats.txt
```

### Log Aggregation

Logs are in JSON format (production) for easy parsing:

```bash
# Extract error logs
docker compose logs backend | jq 'select(.level == "ERROR")'

# Count requests by status
docker compose logs backend | jq 'select(.type == "http_request") | .status' | sort | uniq -c

# Average response time
docker compose logs backend | jq 'select(.type == "http_request") | .duration_ms' | awk '{sum+=$1; count++} END {print sum/count}'
```

---

## 🛡️ Security Checklist

- [ ] Change default JWT secrets (never use example values!)
- [ ] Set `CORS_ORIGIN` to your domain (no wildcards)
- [ ] Use HTTPS in production (terminate SSL at reverse proxy)
- [ ] Enable Redis authentication in production
- [ ] Use MongoDB Atlas IP whitelist
- [ ] Run containers as non-root user (already configured)
- [ ] Regularly update base images for security patches
- [ ] Rotate OpenAI API keys periodically
- [ ] Enable Docker Content Trust (DCT) for image signing

---

## 📈 Production Best Practices

### Scaling Strategy

| Service | Min | Max | Scale Trigger |
|---------|-----|-----|---------------|
| Frontend | 2 | 5 | CPU >60% |
| Backend | 3 | 10 | Active connections >2000 |
| AI-Engine | 2 | 4 | Memory >75% or queue depth >10 |
| Worker | 1 | 1 | Never scale! |

### Resource Limits

Always set `limits` and `reservations`:

```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### Backup Strategy

1. **MongoDB:** Use MongoDB Atlas automated backups
2. **FAISS Index:** Daily backup to S3
   ```bash
   docker compose exec ai-engine tar -czf - /app/data/faiss_index | \
     aws s3 cp - s3://your-bucket/backups/faiss-$(date +%Y%m%d).tar.gz
   ```
3. **Uploads:** Sync to S3 continuously
   ```bash
   docker compose exec backend aws s3 sync /app/uploads s3://your-bucket/uploads
   ```

---

## 🚀 Production Deployment Checklist

Before deploying to production:

- [ ] All environment variables set correctly
- [ ] JWT secrets are secure random values (64+ characters)
- [ ] CORS configured with exact domain (no wildcards)
- [ ] MongoDB Atlas connection string tested
- [ ] Redis connection tested
- [ ] OpenAI API key valid and has credits
- [ ] Health checks passing on all services
- [ ] Logs showing correct JSON structure
- [ ] Resource limits configured
- [ ] Backup strategy in place
- [ ] Monitoring and alerting configured
- [ ] SSL certificates installed (reverse proxy)
- [ ] DNS records pointing to load balancer
- [ ] Load balancer configured with sticky sessions for backend

---

## 📞 Support

For issues:
1. Check logs: `docker compose logs -f`
2. Verify health: `curl http://localhost:5000/ready`
3. Check resources: `docker stats`
4. Review documentation above

Common solutions:
- Container crash loop → Check environment variables
- Out of memory → Increase limits in docker-compose.yml
- Slow AI responses → Scale ai-engine replicas
- Rate limiting issues → Verify Redis connection
