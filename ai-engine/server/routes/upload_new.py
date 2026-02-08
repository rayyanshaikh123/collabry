"""
Upload Route - Document ingestion endpoint.

Handles file uploads and processes them into the vector store.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from server.deps import get_current_user
from rag.ingest import ingest_document
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["upload"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    notebook_id: str = Form(...),
    user: dict = Depends(get_current_user)
):
    """
    Upload and index a document.
    
    Supported formats: PDF, DOCX, TXT, MD
    
    The document will be:
    1. Text extracted
    2. Chunked into segments
    3. Embedded
    4. Stored in vector database with user_id and notebook_id filters
    
    Request:
    - file: Document file (multipart/form-data)
    - notebook_id: Target notebook identifier
    
    Response:
    ```json
    {
        "success": true,
        "filename": "biology_notes.pdf",
        "chunks": 45,
        "notebook_id": "bio_101"
    }
    ```
    """
    try:
        user_id = user.get("user_id") or user.get("id")
        
        # Read file content
        file_content = await file.read()
        
        # Ingest document
        result = await ingest_document(
            file_content=file_content,
            filename=file.filename,
            user_id=user_id,
            notebook_id=notebook_id
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Document ingestion failed")
            )
        
        logger.info(f"Document uploaded: {file.filename} -> {notebook_id} ({result['chunks']} chunks)")
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/text")
async def upload_text(
    text: str = Form(...),
    notebook_id: str = Form(...),
    source_name: str = Form("direct_input"),
    user: dict = Depends(get_current_user)
):
    """
    Upload raw text directly (no file).
    
    Useful for pasting notes, copying from other sources, etc.
    
    Request:
    - text: Raw text content
    - notebook_id: Target notebook
    - source_name: Optional source identifier
    
    Response: Same as file upload
    """
    from rag.ingest import ingest_text
    
    try:
        user_id = user.get("user_id") or user.get("id")
        
        result = await ingest_text(
            text=text,
            user_id=user_id,
            notebook_id=notebook_id,
            source_name=source_name
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Text ingestion failed")
            )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/batch")
async def upload_batch(
    files: list[UploadFile] = File(...),
    notebook_id: str = Form(...),
    user: dict = Depends(get_current_user)
):
    """
    Upload multiple documents in batch.
    
    Request:
    - files: List of document files
    - notebook_id: Target notebook
    
    Response:
    ```json
    {
        "success": true,
        "total_files": 5,
        "successful": 4,
        "failed": 1,
        "total_chunks": 178,
        "results": [...]
    }
    ```
    """
    from rag.ingest import batch_ingest
    
    try:
        user_id = user.get("user_id") or user.get("id")
        
        # Read all files
        files_data = []
        for file in files:
            content = await file.read()
            files_data.append((content, file.filename))
        
        # Batch ingest
        result = await batch_ingest(
            files=files_data,
            user_id=user_id,
            notebook_id=notebook_id
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
