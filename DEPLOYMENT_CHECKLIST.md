# 🚀 Collabry Docker Deployment - Pre-Launch Checklist

Use this checklist to ensure your deployment is production-ready.

---

## ✅ Phase 1: Code Implementation

- [x] Frontend Dockerfile created with multi-stage build
- [x] Backend Dockerfile created with optimization
- [x] AI-Engine Dockerfile created with FAISS support
- [x] Backend worker Dockerfile created for cron jobs
- [x] Docker Compose orchestration configured
- [x] .dockerignore files added to all services
- [x] Redis rate limiting implemented
- [x] Graceful shutdown handlers added
- [x] Health check endpoints implemented
- [x] Cron jobs extracted to worker service
- [x] Production logging configured
- [x] Backend dependencies installed (redis, rate-limit-redis)

---

## ✅ Phase 2: Environment Configuration

### Required Actions

- [ ] **Copy .env.example to .env**
  ```bash
  cp .env.example .env
  ```

- [ ] **Generate secure JWT secrets**
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  - [ ] Set `JWT_ACCESS_SECRET` with generated value
  - [ ] Set `JWT_REFRESH_SECRET` with different generated value

- [ ] **Configure MongoDB**
  - [ ] Create MongoDB Atlas cluster
  - [ ] Add IP whitelist (0.0.0.0/0 for testing, specific IPs for production)
  - [ ] Copy connection string to `MONGODB_URI`

- [ ] **Configure Redis**
  - [ ] For local: `REDIS_URL=redis://redis:6379`
  - [ ] For Redis Cloud: Get connection string from dashboard
  - [ ] Test connectivity after deployment

- [ ] **Configure OpenAI**
  - [ ] Get API key from https://platform.openai.com/
  - [ ] Set `OPENAI_API_KEY=sk-proj-...`
  - [ ] Set `OPENAI_MODEL=gpt-4o-mini` (or preferred model)

- [ ] **Configure Frontend URLs**
  - [ ] Set `NEXT_PUBLIC_API_BASE_URL`
  - [ ] Set `NEXT_PUBLIC_SOCKET_URL`
  - [ ] Set `NEXT_PUBLIC_AI_ENGINE_URL`

- [ ] **Configure CORS**
  - [ ] Set `CORS_ORIGIN` to exact domain (NO wildcards in production!)
  - [ ] For multiple domains: `https://app.com,https://www.app.com`

---

## ✅ Phase 3: Local Testing

### Build and Start

- [ ] **Build all images**
  ```bash
  docker compose build
  ```
  Expected: All 4 services build successfully (frontend, backend, ai-engine, backend-worker)

- [ ] **Start services**
  ```bash
  docker compose up -d
  ```

- [ ] **Verify all containers running**
  ```bash
  docker compose ps
  ```
  Expected output:
  ```
  NAME                   STATUS      PORTS
  collabry-frontend      Up          3000
  collabry-backend       Up          5000
  collabry-ai-engine     Up          8000
  collabry-worker        Up          -
  collabry-redis         Up          6379
  ```

### Health Checks

- [ ] **Frontend health**
  ```bash
  curl http://localhost:3000/api/health
  ```
  Expected: `{"success":true,...}`

- [ ] **Backend health**
  ```bash
  curl http://localhost:5000/health
  ```
  Expected: `{"success":true,"message":"Server is healthy",...}`

- [ ] **Backend readiness**
  ```bash
  curl http://localhost:5000/ready
  ```
  Expected: `{"success":true,"checks":{"mongodb":true,"redis":true}}`

- [ ] **AI-Engine health**
  ```bash
  curl http://localhost:8000/health
  ```
  Expected: `{"status":"healthy",...}`

### Functional Testing

- [ ] **Test login flow**
  - Open http://localhost:3000
  - Create account / login
  - Verify JWT cookies set

- [ ] **Test AI chat**
  - Send message to AI
  - Verify streaming response works
  - Check backend logs for `ai_operation` entries

- [ ] **Test Socket.IO**
  - Open collaborative board
  - Verify real-time updates work
  - Check sticky session handling

- [ ] **Test file upload**
  - Upload file to notebook
  - Verify saved to `/uploads` volume
  - Check file persists after restart

- [ ] **Test rate limiting**
  - Make >100 requests in 15 minutes
  - Verify 429 response after limit
  - Check Redis: `docker compose exec redis redis-cli KEYS "rl:*"`

### Log Verification

- [ ] **Check structured logging**
  ```bash
  docker compose logs backend | grep '"level"'
  ```
  Expected: JSON-formatted logs in production

- [ ] **Verify no errors on startup**
  ```bash
  docker compose logs | grep -i error
  ```
  Expected: No critical errors (warnings OK)

- [ ] **Check worker is running cron jobs**
  ```bash
  docker compose logs backend-worker
  ```
  Expected: Cron job initialization messages

---

## ✅ Phase 4: Production Readiness

### Security Hardening

- [ ] **JWT secrets are NOT example values**
  - Verify `JWT_ACCESS_SECRET` is 64+ random characters
  - Verify `JWT_REFRESH_SECRET` is different from access secret
  - Never commit .env file to git

- [ ] **CORS is properly configured**
  - `CORS_ORIGIN` set to exact domain(s)
  - Test from different origin, verify blocked

- [ ] **MongoDB security**
  - IP whitelist configured (not 0.0.0.0/0)
  - Strong password used
  - Database uses authentication

- [ ] **Redis security**
  - Redis Cloud has password (if using cloud)
  - Or configure Redis AUTH in docker-compose.yml

- [ ] **API keys rotated**
  - OpenAI API key is active
  - Other API keys (Razorpay, Google OAuth) configured

- [ ] **Containers run as non-root** ✅ (already configured)
  - Frontend: user `nextjs` (uid 1001)
  - Backend: user `express` (uid 1001)
  - AI-Engine: user `python` (uid 1001)

### Resource Limits

- [ ] **Memory limits configured** ✅ (already in docker-compose.yml)
  - Frontend: 1GB max
  - Backend: 512MB max
  - AI-Engine: 4GB max
  - Worker: 256MB max

- [ ] **CPU limits configured** ✅ (already in docker-compose.yml)

- [ ] **Test under load**
  ```bash
  # Check resource usage
  docker stats

  # Verify no OOM kills
  docker compose logs | grep -i "killed"
  ```

### Persistence & Backup

- [ ] **Volumes are created**
  ```bash
  docker volume ls | grep collabry
  ```
  Expected: `collabry-faiss`, `collabry-uploads`, `collabry-redis`, etc.

- [ ] **FAISS index backup configured**
  ```bash
  # Manual backup test
  docker compose exec ai-engine tar -czf /tmp/faiss-backup.tar.gz /app/data/faiss_index
  docker cp collabry-ai-engine:/tmp/faiss-backup.tar.gz ./backups/
  ```

- [ ] **Uploads backup configured**
  - Set up S3 sync or similar
  - Test restore procedure

- [ ] **MongoDB backups enabled**
  - MongoDB Atlas automated backups (recommended)
  - Or manual backup script scheduled

### Monitoring & Observability

- [ ] **Logging configured**
  - Logs in JSON format (production) ✅
  - Log aggregation set up (optional: ELK, Loki, CloudWatch)

- [ ] **Monitoring configured**
  - Resource monitoring (optional: Prometheus, DataDog)
  - Uptime monitoring (optional: UptimeRobot, Pingdom)
  - Error tracking (optional: Sentry)

- [ ] **Alerts configured**
  - High memory usage alert
  - Container restart alert
  - Error rate threshold alert

---

## ✅ Phase 5: Deployment to Production

### Reverse Proxy Setup

- [ ] **Nginx/Cloudflare configured**
  - SSL certificates installed
  - Proxy timeouts set correctly:
    - `/api/ai/*` routes: 180s timeout (AI streaming)
    - Socket.IO: WebSocket upgrade enabled
    - Other routes: 60s timeout

- [ ] **Sticky sessions configured**
  - Backend uses `ip_hash` for Socket.IO
  - Test from multiple clients

- [ ] **Compression enabled**
  - Gzip/Brotli for API responses
  - Not for SSE streams (breaks chunking)

### DNS & Domain

- [ ] **DNS records configured**
  - A record pointing to load balancer/server
  - CNAME for www (if applicable)

- [ ] **SSL/TLS configured**
  - Valid certificate installed
  - HTTPS redirect enabled
  - HSTS header configured

### Scaling Configuration

- [ ] **Replica counts set**
  - Frontend: 2-3 replicas
  - Backend: 3-5 replicas
  - AI-Engine: 2-4 replicas
  - Worker: **EXACTLY 1 replica** (critical!)

- [ ] **Load balancer configured**
  - Health checks enabled
  - Drain connections on shutdown
  - Sticky sessions for Socket.IO

### Deployment Execution

- [ ] **Run deployment script**
  ```bash
  # Windows
  .\deploy.ps1 -Version v1.0.0

  # Linux/Mac
  VERSION=v1.0.0 ./deploy.sh
  ```

- [ ] **Verify deployment**
  - All health checks pass
  - Smoke tests pass
  - No errors in logs

- [ ] **Monitor for 24 hours**
  - Check error rates
  - Monitor memory usage
  - Verify no crashes

---

## ✅ Phase 6: Post-Deployment

### Verification

- [ ] **User acceptance testing**
  - Create test account
  - Complete full user flow
  - Test on multiple browsers/devices

- [ ] **Performance testing**
  - Test AI response times (<120s)
  - Test API response times (<500ms)
  - Test concurrent users

- [ ] **Stress testing (optional)**
  - Load test with 100+ concurrent users
  - Verify auto-scaling works (if configured)
  - Check for memory leaks

### Documentation

- [ ] **Runbook created**
  - How to deploy updates
  - How to rollback
  - How to check logs
  - How to scale services

- [ ] **Incident response plan**
  - Who to contact
  - How to diagnose issues
  - How to restore from backup

- [ ] **Backup & restore procedures documented**
  - FAISS index backup
  - Upload files backup
  - MongoDB backup/restore

### Maintenance

- [ ] **Update schedule planned**
  - Security patches: weekly
  - Minor updates: bi-weekly
  - Major updates: monthly

- [ ] **Backup schedule configured**
  - FAISS: daily
  - Uploads: hourly (incremental)
  - MongoDB: continuous (Atlas)
  - Redis: not needed (cache only)

- [ ] **Monitoring dashboard set up**
  - Service health
  - Resource usage
  - Error rates
  - Response times

---

## 🎯 Final Sign-Off

Before marking production-ready, verify:

- [ ] All items in this checklist completed
- [ ] No critical errors in logs for 24 hours
- [ ] Performance meets SLA (if defined)
- [ ] Backup/restore tested successfully
- [ ] Rollback procedure tested
- [ ] On-call team briefed
- [ ] Documentation up to date

**Deployment Date:** __________  
**Deployed By:** __________  
**Sign-off By:** __________

---

## 🚨 Emergency Contacts

### Issues During Deployment

1. **Check logs first:**
   ```bash
   docker compose logs -f
   ```

2. **Rollback if critical:**
   ```bash
   docker compose stop backend
   docker compose up -d backend  # Uses previous image
   ```

3. **Contact support:**
   - DevOps Lead: __________
   - Backend Lead: __________
   - Infrastructure: __________

---

**Document Version:** 1.0  
**Last Updated:** February 13, 2026
