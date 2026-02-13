# Frontend Deployment Guide

This guide provides comprehensive instructions for deploying the Collabry frontend in various environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Production Build](#production-build)
- [Deployment Platforms](#deployment-platforms)
  - [Vercel](#vercel-recommended)
  - [Netlify](#netlify)
  - [Render](#render)
  - [Docker](#docker)
  - [Custom Server](#custom-server)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Backend API running and accessible
- AI Engine running and accessible
- Environment variables configured

### Local Production Build

```bash
# Install dependencies
npm install

# Create production build
npm run build

# Start production server
npm start
```

The application will be available at `http://localhost:3000`.

## Environment Variables

Create a `.env.local` file (or configure in your deployment platform):

```bash
# API Endpoints
NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.com
NEXT_PUBLIC_AI_ENGINE_URL=https://your-ai-engine.com

# Authentication
NEXT_PUBLIC_AUTH_URL=https://your-backend-api.com/auth

# Google Drive Integration (Optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-api-key

# Feature Flags (Optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WHITEBOARD=true
NEXT_PUBLIC_ENABLE_FOCUS_MODE=true

# WebSocket (for collaboration features)
NEXT_PUBLIC_SOCKET_URL=https://your-backend-api.com
```

### Required Variables

- `NEXT_PUBLIC_BACKEND_URL`: Backend API URL
- `NEXT_PUBLIC_AI_ENGINE_URL`: AI Engine URL

### Optional Variables

- Google Drive variables: Required only if using Drive integration
- Feature flags: Control feature availability
- `NEXT_PUBLIC_SOCKET_URL`: Required for real-time collaboration

## Production Build

### Build Optimization

```bash
# Standard production build
npm run build

# Build with source maps for debugging
GENERATE_SOURCEMAP=true npm run build

# Build with bundle analysis
npm run build && npm run analyze
```

### Build Output

Next.js generates optimized output in `.next/` directory:

- **Static files**: `.next/static/` - Can be served via CDN
- **Server files**: `.next/server/` - Required for SSR
- **Build manifest**: `.next/build-manifest.json` - Build metadata

### Build Size Optimization

The build is optimized with:

- **Tree shaking**: Removes unused code
- **Code splitting**: Loads code on demand
- **Image optimization**: Automatic WebP conversion
- **Font optimization**: Inline critical fonts
- **CSS minimization**: Compressed stylesheets

## Deployment Platforms

### Vercel (Recommended)

Vercel offers the best Next.js deployment experience with zero configuration.

#### Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_BACKEND_URL production
vercel env add NEXT_PUBLIC_AI_ENGINE_URL production
```

#### Using Vercel Dashboard

1. Push code to GitHub/GitLab/Bitbucket
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy automatically on every push

**Configuration:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

### Netlify

Deploy Next.js on Netlify with Edge Functions support.

#### Using Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
netlify deploy --prod

# Set environment variables
netlify env:set NEXT_PUBLIC_BACKEND_URL "https://your-backend-api.com"
netlify env:set NEXT_PUBLIC_AI_ENGINE_URL "https://your-ai-engine.com"
```

#### netlify.toml Configuration

Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "18"
```

### Render

Deploy on Render with automatic builds from Git.

#### Render Configuration

1. Create new Web Service
2. Connect your repository
3. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node 18+

4. Add environment variables in Render dashboard

#### render.yaml

```yaml
services:
  - type: web
    name: collabry-frontend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NEXT_PUBLIC_BACKEND_URL
        value: https://your-backend-api.com
      - key: NEXT_PUBLIC_AI_ENGINE_URL
        value: https://your-ai-engine.com
      - key: NODE_VERSION
        value: 18
```

### Docker

Deploy using Docker for containerized environments.

#### Dockerfile (Production)

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.com
      - NEXT_PUBLIC_AI_ENGINE_URL=https://your-ai-engine.com
    restart: unless-stopped
    networks:
      - collabry-network

networks:
  collabry-network:
    external: true
```

#### Build and Run

```bash
# Build image
docker build -t collabry-frontend .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.com \
  -e NEXT_PUBLIC_AI_ENGINE_URL=https://your-ai-engine.com \
  collabry-frontend

# Or use Docker Compose
docker-compose up -d
```

### Custom Server

Deploy on any VPS/dedicated server with Node.js.

#### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start npm --name "collabry-frontend" -- start

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

#### PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'collabry-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/frontend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_BACKEND_URL: 'https://your-backend-api.com',
      NEXT_PUBLIC_AI_ENGINE_URL: 'https://your-ai-engine.com'
    }
  }]
};
```

Start with: `pm2 start ecosystem.config.js`

#### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for collaboration features
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Post-Deployment

### Health Check

Verify deployment health:

```bash
# Check if application is running
curl https://your-domain.com

# Check API connectivity
curl https://your-domain.com/api/health

# Test authentication
curl https://your-domain.com/auth/login
```

### Performance Testing

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run performance audit
lighthouse https://your-domain.com --view
```

### Security Headers

Add security headers in `next.config.ts`:

```typescript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

## Monitoring

### Application Monitoring

**Vercel Analytics** (for Vercel deployments):
- Automatic Web Vitals tracking
- Real-time performance metrics
- Error tracking

**Custom Monitoring:**

```typescript
// lib/analytics.ts
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: url,
    });
  }
};

export const trackEvent = (action: string, category: string, label?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
    });
  }
};
```

### Error Tracking

Integrate Sentry for error tracking:

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Performance Monitoring

Monitor Core Web Vitals:

```typescript
// app/layout.tsx
export function reportWebVitals(metric: NextWebVitalsMetric) {
  console.log(metric);
  // Send to analytics
}
```

## Troubleshooting

### Build Failures

**Issue**: Build fails with memory error

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

**Issue**: Module not found errors

```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run build
```

### Runtime Errors

**Issue**: API calls failing

- Check `NEXT_PUBLIC_BACKEND_URL` is set correctly
- Verify backend is accessible from frontend
- Check CORS configuration in backend

**Issue**: Environment variables not loading

- Ensure variables start with `NEXT_PUBLIC_` prefix
- Rebuild after adding new variables
- Check deployment platform environment settings

### Performance Issues

**Issue**: Slow page loads

- Enable static generation where possible
- Optimize images with Next.js Image component
- Implement code splitting
- Enable caching headers

**Issue**: Large bundle size

```bash
# Analyze bundle
npm run build
npm run analyze

# Optimize imports
import { Button } from '@/components/ui/button'  # Good
import * from '@/components/ui'  # Avoid
```

### Deployment Issues

**Issue**: 404 errors on refresh

- Ensure `output: 'standalone'` in next.config.ts for custom servers
- Configure proper routing in reverse proxy
- Check `.htaccess` or Nginx configuration

**Issue**: WebSocket connection failures

- Verify `NEXT_PUBLIC_SOCKET_URL` is correct
- Check firewall allows WebSocket connections
- Ensure proxy passes upgrade headers

## Best Practices

1. **Always use environment variables** for API URLs and secrets
2. **Enable HTTPS** in production (required for PWA features)
3. **Implement CDN** for static assets (.next/static/)
4. **Monitor performance** with Web Vitals
5. **Set up error tracking** (Sentry, LogRocket)
6. **Enable compression** (gzip/brotli)
7. **Implement caching** strategies
8. **Use incremental static regeneration** where appropriate
9. **Test deployments** in staging environment first
10. **Keep dependencies updated** regularly

## Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

For backend deployment, see `../backend/README.md`.
For AI engine deployment, see `../ai-engine/DEPLOYMENT.md`.
