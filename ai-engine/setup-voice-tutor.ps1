# Voice Tutor Setup Script for Windows PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Collabry Voice Tutor Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "[1/6] Checking Python installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Python found: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "ERROR: Python not found. Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

# Install Python dependencies
Write-Host ""
Write-Host "[2/6] Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Python dependencies installed" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Check MongoDB
Write-Host ""
Write-Host "[3/6] Checking MongoDB connection..." -ForegroundColor Yellow
$mongoUri = $env:MONGO_URI
if (-not $mongoUri) {
    $mongoUri = "mongodb://localhost:27017"
}

python -c "from pymongo import MongoClient; client = MongoClient('$mongoUri', serverSelectionTimeoutMS=3000); client.server_info(); print('SUCCESS: MongoDB connected')"
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: MongoDB is accessible" -ForegroundColor Green
} else {
    Write-Host "WARNING: MongoDB not accessible at $mongoUri" -ForegroundColor Yellow
    Write-Host "  Voice tutor will work but sessions won't be saved" -ForegroundColor Yellow
}

# Create data directories
Write-Host ""
Write-Host "[4/6] Creating data directories..." -ForegroundColor Yellow
$directories = @(
    "data/curricula",
    "data/questions"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    }
}
Write-Host "SUCCESS: Data directories ready" -ForegroundColor Green

# Check .env file
Write-Host ""
Write-Host "[5/6] Checking environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "WARNING: No .env file found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creating .env from template..." -ForegroundColor Gray
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "SUCCESS: Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Edit .env and add your API keys:" -ForegroundColor Yellow
    Write-Host "  - LIVEKIT_API_KEY" -ForegroundColor Cyan
    Write-Host "  - LIVEKIT_API_SECRET" -ForegroundColor Cyan
    Write-Host "  - LIVEKIT_WS_URL" -ForegroundColor Cyan
    Write-Host "  - OPENAI_API_KEY" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "SUCCESS: .env file exists" -ForegroundColor Green
    
    # Check required keys
    $envContent = Get-Content ".env" -Raw
    $requiredKeys = @("LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "OPENAI_API_KEY")
    $missingKeys = @()
    
    foreach ($key in $requiredKeys) {
        if ($envContent -notmatch "$key=\w+") {
            $missingKeys += $key
        }
    }
    
    if ($missingKeys.Count -gt 0) {
        Write-Host "WARNING: Missing or empty configuration:" -ForegroundColor Yellow
        foreach ($key in $missingKeys) {
            Write-Host "  - $key" -ForegroundColor Cyan
        }
        Write-Host ""
    } else {
        Write-Host "SUCCESS: All required API keys configured" -ForegroundColor Green
    }
}

# Summary
Write-Host ""
Write-Host "[6/6] Setup Summary" -ForegroundColor Yellow
Write-Host ""
Write-Host "SUCCESS: Voice Tutor setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Ensure .env has your LiveKit and OpenAI credentials" -ForegroundColor White
Write-Host "2. Start the AI engine: python run_server.py" -ForegroundColor White
Write-Host "3. Navigate to voice tutor in frontend" -ForegroundColor White
Write-Host ""
Write-Host "For detailed documentation, see:" -ForegroundColor Cyan
Write-Host "  VOICE_TUTOR_README.md" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
