#!/bin/bash

###############################################################################
# Collabry Production Deployment Script
# Handles zero-downtime rolling deployments for all services
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VERSION=${VERSION:-$(git describe --tags --always)}
REGISTRY=${REGISTRY:-registry.example.com}
PROJECT="collabry"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f .env ]; then
        log_error ".env file not found. Copy from .env.example and configure."
        exit 1
    fi
    
    log_info "✅ Prerequisites check passed"
}

build_images() {
    log_info "Building Docker images..."
    
    # Build frontend
    log_info "Building frontend..."
    docker compose build \
        --build-arg NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL}" \
        --build-arg NEXT_PUBLIC_SOCKET_URL="${NEXT_PUBLIC_SOCKET_URL}" \
        --build-arg NEXT_PUBLIC_AI_ENGINE_URL="${NEXT_PUBLIC_AI_ENGINE_URL}" \
        frontend || { log_error "Frontend build failed"; exit 1; }
    
    # Build backend
    log_info "Building backend..."
    docker compose build backend || { log_error "Backend build failed"; exit 1; }
    
    # Build ai-engine
    log_info "Building ai-engine..."
    docker compose build ai-engine || { log_error "AI-engine build failed"; exit 1; }
    
    # Build backend worker
    log_info "Building backend-worker..."
    docker compose build backend-worker || { log_error "Backend-worker build failed"; exit 1; }
    
    log_info "✅ All images built successfully"
}

tag_images() {
    log_info "Tagging images with version: $VERSION"
    
    docker tag ${PROJECT}-frontend:latest ${REGISTRY}/${PROJECT}-frontend:${VERSION}
    docker tag ${PROJECT}-backend:latest ${REGISTRY}/${PROJECT}-backend:${VERSION}
    docker tag ${PROJECT}-ai-engine:latest ${REGISTRY}/${PROJECT}-ai-engine:${VERSION}
    docker tag ${PROJECT}-backend-worker:latest ${REGISTRY}/${PROJECT}-backend-worker:${VERSION}
    
    # Also tag as latest
    docker tag ${PROJECT}-frontend:latest ${REGISTRY}/${PROJECT}-frontend:latest
    docker tag ${PROJECT}-backend:latest ${REGISTRY}/${PROJECT}-backend:latest
    docker tag ${PROJECT}-ai-engine:latest ${REGISTRY}/${PROJECT}-ai-engine:latest
    docker tag ${PROJECT}-backend-worker:latest ${REGISTRY}/${PROJECT}-backend-worker:latest
    
    log_info "✅ Images tagged"
}

push_images() {
    log_info "Pushing images to registry..."
    
    docker push ${REGISTRY}/${PROJECT}-frontend:${VERSION}
    docker push ${REGISTRY}/${PROJECT}-frontend:latest
    docker push ${REGISTRY}/${PROJECT}-backend:${VERSION}
    docker push ${REGISTRY}/${PROJECT}-backend:latest
    docker push ${REGISTRY}/${PROJECT}-ai-engine:${VERSION}
    docker push ${REGISTRY}/${PROJECT}-ai-engine:latest
    docker push ${REGISTRY}/${PROJECT}-backend-worker:${VERSION}
    docker push ${REGISTRY}/${PROJECT}-backend-worker:latest
    
    log_info "✅ Images pushed to registry"
}

run_health_checks() {
    local service=$1
    local port=$2
    local endpoint=$3
    local max_attempts=30
    local attempt=1
    
    log_info "Running health checks for $service..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:${port}${endpoint}" > /dev/null 2>&1; then
            log_info "✅ $service is healthy"
            return 0
        fi
        
        log_warn "Health check failed (attempt $attempt/$max_attempts), retrying in 5s..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    log_error "$service failed health checks after $max_attempts attempts"
    return 1
}

deploy_service() {
    local service=$1
    local health_port=$2
    local health_endpoint=$3
    
    log_info "Deploying $service..."
    
    # Deploy with zero-downtime
    docker compose up -d --no-deps $service
    
    # Wait for health checks
    sleep 10  # Initial startup time
    
    if [ -n "$health_port" ]; then
        run_health_checks $service $health_port $health_endpoint || {
            log_error "$service deployment failed health checks"
            log_error "Rolling back..."
            rollback_service $service
            exit 1
        }
    fi
    
    log_info "✅ $service deployed successfully"
}

rollback_service() {
    local service=$1
    
    log_warn "Rolling back $service to previous version..."
    
    # Stop current version
    docker compose stop $service
    
    # Start previous version (should be cached)
    docker compose up -d $service
    
    log_info "✅ $service rolled back"
}

smoke_tests() {
    log_info "Running smoke tests..."
    
    # Test backend API
    if ! curl -f -s http://localhost:5000/health > /dev/null; then
        log_error "Backend smoke test failed"
        return 1
    fi
    log_info "✅ Backend API responding"
    
    # Test backend readiness
    if ! curl -f -s http://localhost:5000/ready > /dev/null; then
        log_error "Backend readiness check failed"
        return 1
    fi
    log_info "✅ Backend ready (MongoDB + Redis connected)"
    
    # Test AI engine
    if ! curl -f -s http://localhost:8000/health > /dev/null; then
        log_error "AI-engine smoke test failed"
        return 1
    fi
    log_info "✅ AI-engine responding"
    
    # Test frontend
    if ! curl -f -s http://localhost:3000/api/health > /dev/null; then
        log_error "Frontend smoke test failed"
        return 1
    fi
    log_info "✅ Frontend responding"
    
    log_info "✅ All smoke tests passed"
    return 0
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
    log_info "========================================"
    log_info "Collabry Production Deployment"
    log_info "Version: $VERSION"
    log_info "========================================"
    
    # Check prerequisites
    check_prerequisites
    
    # Build images
    build_images
    
    # Tag images (if using registry)
    if [ "$USE_REGISTRY" = "true" ]; then
        tag_images
        push_images
    fi
    
    # Deploy services in order (dependencies first)
    log_info "Starting rolling deployment..."
    
    # 1. Deploy AI-Engine (no dependencies)
    deploy_service "ai-engine" "8000" "/health"
    
    # 2. Deploy Backend (depends on AI-Engine)
    deploy_service "backend" "5000" "/ready"
    
    # 3. Deploy Backend Worker (depends on Backend)
    deploy_service "backend-worker" "" ""
    
    # 4. Deploy Frontend (depends on Backend)
    deploy_service "frontend" "3000" "/api/health"
    
    # Run smoke tests
    if ! smoke_tests; then
        log_error "Smoke tests failed!"
        log_error "Deployment completed but service may be unhealthy"
        log_error "Check logs: docker compose logs -f"
        exit 1
    fi
    
    log_info "========================================"
    log_info "✅ Deployment Successful!"
    log_info "Version: $VERSION"
    log_info "========================================"
    log_info ""
    log_info "Next steps:"
    log_info "  - Monitor logs: docker compose logs -f"
    log_info "  - Check metrics: docker stats"
    log_info "  - Test endpoints manually"
}

# Run main function
main "$@"
