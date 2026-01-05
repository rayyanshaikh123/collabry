"""
FastAPI AI Core Server

Multi-user isolated AI backend with JWT authentication.

Features:
- JWT-based authentication
- User-isolated conversations (multi-session support)
- RAG document ingestion with background processing
- Summarization, Q&A, and mind map generation
- Streaming and non-streaming endpoints
"""
from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from server.schemas import HealthResponse, ErrorResponse
from server.routes import chat, ingest, summarize, qa, mindmap, sessions
from server.deps import get_current_user
from config import CONFIG
import logging
from datetime import datetime
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events.
    """
    # Startup
    logger.info("🚀 Starting Collabry AI Core Server")
    logger.info(f"MongoDB: {CONFIG['mongo_uri']}")
    logger.info(f"Ollama: {CONFIG['ollama_host']}")
    logger.info(f"JWT Algorithm: {CONFIG['jwt_algorithm']}")
    
    # Verify critical services
    try:
        from pymongo import MongoClient
        client = MongoClient(CONFIG["mongo_uri"], serverSelectionTimeoutMS=5000)
        client.server_info()
        logger.info("✓ MongoDB connection verified")
        client.close()
    except Exception as e:
        logger.error(f"✗ MongoDB connection failed: {e}")
        logger.warning("Server will start but database operations may fail")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Collabry AI Core Server")


# Create FastAPI app
app = FastAPI(
    title="Collabry AI Core API",
    description="Multi-user isolated AI backend with RAG, chat, and document processing",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend integration
# Allow frontend at localhost:3000 (Next.js default) and backend at localhost:5000
allowed_origins = [
    "http://localhost:3000",  # Next.js dev server
    "http://localhost:5000",  # Backend server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Specific origins for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler for unhandled errors.
    """
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal server error",
            detail=str(exc),
            timestamp=datetime.utcnow()
        ).dict()
    )


# Health check endpoint (no auth required)
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["health"],
    summary="Health check",
    description="Check service health and component status"
)
async def health_check():
    """
    Health check endpoint for monitoring.
    
    Returns:
        Service status and component health
    """
    components = {}
    
    # Check MongoDB
    try:
        from pymongo import MongoClient
        client = MongoClient(CONFIG["mongo_uri"], serverSelectionTimeoutMS=2000)
        client.server_info()
        components["mongodb"] = "healthy"
        client.close()
    except Exception as e:
        components["mongodb"] = f"unhealthy: {str(e)}"
        logger.error(f"MongoDB health check failed: {e}")
    
    # Check Ollama
    try:
        import requests
        response = requests.get(f"{CONFIG['ollama_host']}/api/tags", timeout=2)
        if response.status_code == 200:
            components["ollama"] = "healthy"
        else:
            components["ollama"] = f"unhealthy: status {response.status_code}"
    except Exception as e:
        components["ollama"] = f"unhealthy: {str(e)}"
        logger.error(f"Ollama health check failed: {e}")
    
    # Overall status
    overall_status = "healthy" if all(
        "healthy" in status for status in components.values()
    ) else "degraded"
    
    return HealthResponse(
        status=overall_status,
        version="1.0.0",
        components=components,
        timestamp=datetime.utcnow()
    )


# Test auth endpoint
@app.get("/test-auth", tags=["health"])
async def test_auth(user_id: str = Depends(get_current_user)):
    """Test endpoint to verify JWT authentication is working"""
    logger.info(f"🎯 Test auth endpoint hit! User ID: {user_id}")
    return {"message": "Auth works!", "user_id": user_id}


# Include routers
app.include_router(chat.router)
app.include_router(sessions.router)
app.include_router(ingest.router)
app.include_router(summarize.router)
app.include_router(qa.router)
app.include_router(mindmap.router)


# Root endpoint
@app.get(
    "/",
    tags=["root"],
    summary="API root",
    description="Welcome message and API information"
)
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "message": "Collabry AI Core API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "chat": "POST /ai/chat - Chat with AI assistant",
            "chat_stream": "POST /ai/chat/stream - Streaming chat (SSE)",
            "upload": "POST /ai/upload - Upload document for RAG",
            "summarize": "POST /ai/summarize - Summarize text",
            "qa": "POST /ai/qa - Question answering with RAG",
            "mindmap": "POST /ai/mindmap - Generate mind map",
            "sessions": "GET /ai/sessions - List user sessions",
            "create_session": "POST /ai/sessions - Create new session"
        },
        "authentication": "JWT Bearer token required (except /health and /)",
        "timestamp": datetime.utcnow()
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "server.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
