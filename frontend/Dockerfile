# ================================
# Frontend Dockerfile (Next.js 16)
# Production-optimized multi-stage build
# ================================

# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY . .

# Build-time environment variables (baked into client bundle)
# These NEXT_PUBLIC_* vars are embedded in the JavaScript bundle
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_AI_ENGINE_URL
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_AI_ENGINE_URL=${NEXT_PUBLIC_AI_ENGINE_URL}
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=${NEXT_PUBLIC_RAZORPAY_KEY_ID}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}

# Build Next.js application
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy standalone output (includes minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start Next.js server
CMD ["node", "server.js"]
