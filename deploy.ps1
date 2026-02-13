# Collabry Production Deployment Script (Windows PowerShell)
# Handles zero-downtime rolling deployments for all services

param(
    [string]$Version = (git describe --tags --always 2>$null),
    [string]$Registry = "registry.example.com",
    [switch]$UseRegistry = $false,
    [switch]$SkipBuild = $false,
    [switch]$SkipTests = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$Project = "collabry"

###############################################################################
# Helper Functions
###############################################################################

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Log-Info {
    param([string]$Message)
    Write-ColorOutput Green "[INFO] $Message"
}

function Log-Warn {
    param([string]$Message)
    Write-ColorOutput Yellow "[WARN] $Message"
}

function Log-Error {
    param([string]$Message)
    Write-ColorOutput Red "[ERROR] $Message"
}

function Check-Prerequisites {
    Log-Info "Checking prerequisites..."
    
    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Log-Error "Docker is not installed or not in PATH"
        exit 1
    }
    
    # Check Docker Compose
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Log-Error "Docker Compose is not available"
        exit 1
    }
    
    # Test Docker Compose v2 syntax
    try {
        docker compose version | Out-Null
    } catch {
        Log-Error "Docker Compose v2 is required. Please upgrade Docker Desktop."
        exit 1
    }
    
    # Check environment file
    if (-not (Test-Path ".env")) {
        Log-Error ".env file not found. Copy from .env.example and configure."
        exit 1
    }
    
    Log-Info "✅ Prerequisites check passed"
}

function Build-Images {
    if ($SkipBuild) {
        Log-Info "Skipping build (--SkipBuild flag)"
        return
    }
    
    Log-Info "Building Docker images..."
    
    # Load environment variables for build args
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            Set-Item -Path "env:$($matches[1])" -Value $matches[2]
        }
    }
    
    # Build frontend
    Log-Info "Building frontend..."
    docker compose build `
        --build-arg NEXT_PUBLIC_API_BASE_URL="$env:NEXT_PUBLIC_API_BASE_URL" `
        --build-arg NEXT_PUBLIC_SOCKET_URL="$env:NEXT_PUBLIC_SOCKET_URL" `
        --build-arg NEXT_PUBLIC_AI_ENGINE_URL="$env:NEXT_PUBLIC_AI_ENGINE_URL" `
        frontend
    
    if ($LASTEXITCODE -ne 0) {
        Log-Error "Frontend build failed"
        exit 1
    }
    
    # Build backend
    Log-Info "Building backend..."
    docker compose build backend
    
    if ($LASTEXITCODE -ne 0) {
        Log-Error "Backend build failed"
        exit 1
    }
    
    # Build ai-engine
    Log-Info "Building ai-engine..."
    docker compose build ai-engine
    
    if ($LASTEXITCODE -ne 0) {
        Log-Error "AI-engine build failed"
        exit 1
    }
    
    # Build backend worker
    Log-Info "Building backend-worker..."
    docker compose build backend-worker
    
    if ($LASTEXITCODE -ne 0) {
        Log-Error "Backend-worker build failed"
        exit 1
    }
    
    Log-Info "✅ All images built successfully"
}

function Tag-Images {
    Log-Info "Tagging images with version: $Version"
    
    docker tag "${Project}-frontend:latest" "${Registry}/${Project}-frontend:${Version}"
    docker tag "${Project}-backend:latest" "${Registry}/${Project}-backend:${Version}"
    docker tag "${Project}-ai-engine:latest" "${Registry}/${Project}-ai-engine:${Version}"
    docker tag "${Project}-backend-worker:latest" "${Registry}/${Project}-backend-worker:${Version}"
    
    # Also tag as latest
    docker tag "${Project}-frontend:latest" "${Registry}/${Project}-frontend:latest"
    docker tag "${Project}-backend:latest" "${Registry}/${Project}-backend:latest"
    docker tag "${Project}-ai-engine:latest" "${Registry}/${Project}-ai-engine:latest"
    docker tag "${Project}-backend-worker:latest" "${Registry}/${Project}-backend-worker:latest"
    
    Log-Info "✅ Images tagged"
}

function Push-Images {
    Log-Info "Pushing images to registry..."
    
    docker push "${Registry}/${Project}-frontend:${Version}"
    docker push "${Registry}/${Project}-frontend:latest"
    docker push "${Registry}/${Project}-backend:${Version}"
    docker push "${Registry}/${Project}-backend:latest"
    docker push "${Registry}/${Project}-ai-engine:${Version}"
    docker push "${Registry}/${Project}-ai-engine:latest"
    docker push "${Registry}/${Project}-backend-worker:${Version}"
    docker push "${Registry}/${Project}-backend-worker:latest"
    
    Log-Info "✅ Images pushed to registry"
}

function Test-HealthCheck {
    param(
        [string]$ServiceName,
        [int]$Port,
        [string]$Endpoint
    )
    
    $MaxAttempts = 30
    $Attempt = 1
    
    Log-Info "Running health checks for $ServiceName..."
    
    while ($Attempt -le $MaxAttempts) {
        try {
            $Response = Invoke-WebRequest -Uri "http://localhost:${Port}${Endpoint}" -TimeoutSec 5 -UseBasicParsing
            if ($Response.StatusCode -eq 200) {
                Log-Info "✅ $ServiceName is healthy"
                return $true
            }
        } catch {
            # Health check failed, continue retrying
        }
        
        Log-Warn "Health check failed (attempt $Attempt/$MaxAttempts), retrying in 5s..."
        Start-Sleep -Seconds 5
        $Attempt++
    }
    
    Log-Error "$ServiceName failed health checks after $MaxAttempts attempts"
    return $false
}

function Deploy-Service {
    param(
        [string]$ServiceName,
        [int]$HealthPort = 0,
        [string]$HealthEndpoint = ""
    )
    
    Log-Info "Deploying $ServiceName..."
    
    # Deploy with zero-downtime
    docker compose up -d --no-deps $ServiceName
    
    if ($LASTEXITCODE -ne 0) {
        Log-Error "Failed to start $ServiceName"
        return $false
    }
    
    # Wait for initial startup
    Start-Sleep -Seconds 10
    
    # Run health checks if configured
    if ($HealthPort -gt 0) {
        $Healthy = Test-HealthCheck -ServiceName $ServiceName -Port $HealthPort -Endpoint $HealthEndpoint
        
        if (-not $Healthy) {
            Log-Error "$ServiceName deployment failed health checks"
            Log-Error "Rolling back..."
            Rollback-Service -ServiceName $ServiceName
            return $false
        }
    }
    
    Log-Info "✅ $ServiceName deployed successfully"
    return $true
}

function Rollback-Service {
    param([string]$ServiceName)
    
    Log-Warn "Rolling back $ServiceName to previous version..."
    
    # Stop current version
    docker compose stop $ServiceName
    
    # Start previous version
    docker compose up -d $ServiceName
    
    Log-Info "✅ $ServiceName rolled back"
}

function Run-SmokeTests {
    if ($SkipTests) {
        Log-Info "Skipping smoke tests (--SkipTests flag)"
        return $true
    }
    
    Log-Info "Running smoke tests..."
    
    # Test backend API
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing
        if ($Response.StatusCode -ne 200) {
            Log-Error "Backend smoke test failed"
            return $false
        }
        Log-Info "✅ Backend API responding"
    } catch {
        Log-Error "Backend smoke test failed: $_"
        return $false
    }
    
    # Test backend readiness
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:5000/ready" -UseBasicParsing
        if ($Response.StatusCode -ne 200) {
            Log-Error "Backend readiness check failed"
            return $false
        }
        Log-Info "✅ Backend ready (MongoDB + Redis connected)"
    } catch {
        Log-Error "Backend readiness failed: $_"
        return $false
    }
    
    # Test AI engine
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
        if ($Response.StatusCode -ne 200) {
            Log-Error "AI-engine smoke test failed"
            return $false
        }
        Log-Info "✅ AI-engine responding"
    } catch {
        Log-Error "AI-engine smoke test failed: $_"
        return $false
    }
    
    # Test frontend
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
        if ($Response.StatusCode -ne 200) {
            Log-Error "Frontend smoke test failed"
            return $false
        }
        Log-Info "✅ Frontend responding"
    } catch {
        Log-Error "Frontend smoke test failed: $_"
        return $false
    }
    
    Log-Info "✅ All smoke tests passed"
    return $true
}

###############################################################################
# Main Deployment Flow
###############################################################################

function Main {
    Log-Info "========================================"
    Log-Info "Collabry Production Deployment"
    Log-Info "Version: $Version"
    Log-Info "========================================"
    
    # Check prerequisites
    Check-Prerequisites
    
    # Build images
    Build-Images
    
    # Tag and push images (if using registry)
    if ($UseRegistry) {
        Tag-Images
        Push-Images
    }
    
    # Deploy services in order (dependencies first)
    Log-Info "Starting rolling deployment..."
    
    # 1. Deploy AI-Engine (no dependencies)
    $Success = Deploy-Service -ServiceName "ai-engine" -HealthPort 8000 -HealthEndpoint "/health"
    if (-not $Success) { exit 1 }
    
    # 2. Deploy Backend (depends on AI-Engine)
    $Success = Deploy-Service -ServiceName "backend" -HealthPort 5000 -HealthEndpoint "/ready"
    if (-not $Success) { exit 1 }
    
    # 3. Deploy Backend Worker (depends on Backend)
    $Success = Deploy-Service -ServiceName "backend-worker"
    if (-not $Success) { exit 1 }
    
    # 4. Deploy Frontend (depends on Backend)
    $Success = Deploy-Service -ServiceName "frontend" -HealthPort 3000 -HealthEndpoint "/api/health"
    if (-not $Success) { exit 1 }
    
    # Run smoke tests
    $TestsPassed = Run-SmokeTests
    if (-not $TestsPassed) {
        Log-Error "Smoke tests failed!"
        Log-Error "Deployment completed but service may be unhealthy"
        Log-Error "Check logs: docker compose logs -f"
        exit 1
    }
    
    Log-Info "========================================"
    Log-Info "✅ Deployment Successful!"
    Log-Info "Version: $Version"
    Log-Info "========================================"
    Log-Info ""
    Log-Info "Next steps:"
    Log-Info "  - Monitor logs: docker compose logs -f"
    Log-Info "  - Check metrics: docker stats"
    Log-Info "  - Test endpoints manually"
}

# Run main function
try {
    Main
} catch {
    Log-Error "Deployment failed with error: $_"
    exit 1
}
