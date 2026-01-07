"""
Study Notebook AI Routes
Provides specialized AI endpoints for the Study Notebook feature including:
- Web scraping for adding sources
- Web search for finding information
- Content summarization
- Question generation from sources
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from server.deps import get_current_user
from server.schemas import ErrorResponse
from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional
from datetime import datetime
import logging
import json
from tools.web_scraper import web_scrape
from tools.web_search import web_search
from core.agent import create_agent
from config import CONFIG

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai/notebook", tags=["notebook"])


# === Request/Response Models ===

class WebScrapeRequest(BaseModel):
    url: HttpUrl = Field(..., description="URL to scrape")
    extract_text_only: bool = Field(default=True, description="Extract only text content")


class WebScrapeResponse(BaseModel):
    url: str
    title: Optional[str]
    content: str
    word_count: int
    scraped_at: datetime


class WebSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    max_results: int = Field(default=5, ge=1, le=10, description="Maximum number of results")


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str


class WebSearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total_results: int
    searched_at: datetime


class SummarizeRequest(BaseModel):
    content: str = Field(..., min_length=10, description="Content to summarize")
    max_length: Optional[int] = Field(default=200, description="Maximum summary length in words")


class SummarizeResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int


class ExtractKeyPointsRequest(BaseModel):
    content: str = Field(..., min_length=10, description="Content to extract key points from")
    num_points: int = Field(default=5, ge=1, le=20, description="Number of key points")


class KeyPoint(BaseModel):
    point: str
    importance: str  # 'high' | 'medium' | 'low'


class ExtractKeyPointsResponse(BaseModel):
    key_points: List[KeyPoint]
    total_points: int


# === Web Scraping Endpoint ===

@router.post(
    "/scrape",
    response_model=WebScrapeResponse,
    responses={
        401: {"model": ErrorResponse},
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Scrape website content",
    description="Scrape and extract content from a website URL for use as a notebook source"
)
async def scrape_website(
    request: WebScrapeRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Scrape content from a website URL.
    Returns cleaned text content suitable for use as a study source.
    """
    try:
        logger.info(f"Scraping URL for user {user_id}: {request.url}")
        
        # Use the web_scrape tool
        result = web_scrape(str(request.url))
        
        if not result or 'error' in result:
            raise HTTPException(
                status_code=400,
                detail=result.get('error', 'Failed to scrape content from URL')
            )
        
        # Extract content and title from the result
        full_text = result.get('full_text', '')
        title = result.get('title', 'Untitled')
        
        if not full_text:
            raise HTTPException(
                status_code=400,
                detail="No content could be extracted from the URL"
            )
        
        # Count words
        word_count = len(full_text.split())
        
        logger.info(f"Successfully scraped {word_count} words from {request.url}")
        
        return WebScrapeResponse(
            url=str(request.url),
            title=title,
            content=full_text,
            word_count=word_count,
            scraped_at=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Web scraping error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scrape website: {str(e)}"
        )


# === Web Search Endpoint ===

@router.post(
    "/search",
    response_model=WebSearchResponse,
    responses={
        401: {"model": ErrorResponse},
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Search the web",
    description="Search the web for information related to study topics"
)
async def search_web_endpoint(
    request: WebSearchRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Search the web using DuckDuckGo.
    Returns a list of relevant search results.
    """
    try:
        logger.info(f"Web search for user {user_id}: {request.query}")
        
        # Use the web_search tool
        result = web_search(request.query, max_results=request.max_results)
        
        if not result or 'error' in result:
            return WebSearchResponse(
                query=request.query,
                results=[],
                total_results=0,
                searched_at=datetime.utcnow()
            )
        
        # Parse results from the web_search tool
        raw_results = result.get('results', [])
        search_results = []
        
        for r in raw_results[:request.max_results]:
            search_results.append(SearchResult(
                title=r.get('title', 'No title'),
                url=r.get('url', ''),
                snippet=r.get('snippet', '')
            ))
        
        logger.info(f"Found {len(search_results)} results for query: {request.query}")
        
        return WebSearchResponse(
            query=request.query,
            results=search_results,
            total_results=len(search_results),
            searched_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.exception(f"Web search error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Web search failed: {str(e)}"
        )


# === Content Summarization Endpoint ===

@router.post(
    "/summarize",
    response_model=SummarizeResponse,
    responses={
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Summarize content",
    description="Generate a concise summary of provided content"
)
async def summarize_content(
    request: SummarizeRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Summarize text content using AI.
    Useful for creating quick overviews of study materials.
    """
    try:
        logger.info(f"Summarizing content for user {user_id}, length: {len(request.content)}")
        
        # Create agent for summarization
        agent, _, _, _ = create_agent(
            user_id=user_id,
            session_id="summarization",
            config=CONFIG
        )
        
        prompt = f"""Summarize the following content in approximately {request.max_length} words.
Focus on the main ideas and key points. Be concise and clear.

Content to summarize:
{request.content[:5000]}  

Provide ONLY the summary, no extra formatting or explanations."""

        summary = ""
        def collect_chunk(chunk: str):
            nonlocal summary
            summary += chunk
        
        agent.handle_user_input_stream(prompt, collect_chunk)
        
        summary = summary.strip()
        original_length = len(request.content.split())
        summary_length = len(summary.split())
        
        logger.info(f"Generated summary: {original_length} -> {summary_length} words")
        
        return SummarizeResponse(
            summary=summary,
            original_length=original_length,
            summary_length=summary_length
        )
        
    except Exception as e:
        logger.exception(f"Summarization error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to summarize content: {str(e)}"
        )


# === Key Points Extraction Endpoint ===

@router.post(
    "/extract-key-points",
    response_model=ExtractKeyPointsResponse,
    responses={
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Extract key points",
    description="Extract key points from content for quick review"
)
async def extract_key_points(
    request: ExtractKeyPointsRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Extract key points from content.
    Returns structured list of important points with importance ratings.
    """
    try:
        logger.info(f"Extracting {request.num_points} key points for user {user_id}")
        
        # Create agent
        agent, _, _, _ = create_agent(
            user_id=user_id,
            session_id="key_points",
            config=CONFIG
        )
        
        prompt = f"""Extract exactly {request.num_points} key points from the following content.
For each point, rate its importance as 'high', 'medium', or 'low'.

Format your response as a JSON array:
[
  {{"point": "Key point text", "importance": "high"}},
  {{"point": "Another point", "importance": "medium"}}
]

Content:
{request.content[:5000]}

Return ONLY the JSON array, no extra text."""

        response_text = ""
        def collect_chunk(chunk: str):
            nonlocal response_text
            response_text += chunk
        
        agent.handle_user_input_stream(prompt, collect_chunk)
        
        # Parse response
        try:
            json_start = response_text.find('[')
            json_end = response_text.rfind(']') + 1
            if json_start != -1 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                points_data = json.loads(json_str)
                
                key_points = []
                for point_data in points_data[:request.num_points]:
                    key_points.append(KeyPoint(
                        point=point_data.get('point', ''),
                        importance=point_data.get('importance', 'medium')
                    ))
                
                logger.info(f"Extracted {len(key_points)} key points")
                
                return ExtractKeyPointsResponse(
                    key_points=key_points,
                    total_points=len(key_points)
                )
        except Exception as e:
            logger.warning(f"Failed to parse key points JSON: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to parse AI response for key points"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Key points extraction error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract key points: {str(e)}"
        )


# === Streaming Summarization ===

@router.get(
    "/summarize/stream",
    summary="Streaming summarization",
    description="Stream content summary as it's generated",
    responses={
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def summarize_content_stream(
    content: str = Query(..., min_length=10, description="Content to summarize"),
    max_length: int = Query(default=200, ge=50, le=1000, description="Max summary length in words"),
    user_id: str = Depends(get_current_user)
):
    """
    Stream summary generation using SSE.
    """
    try:
        logger.info(f"Streaming summarization for user {user_id}")
        
        agent, _, _, _ = create_agent(
            user_id=user_id,
            session_id="stream_summary",
            config=CONFIG
        )
        
        prompt = f"""Summarize the following content in approximately {max_length} words.
Focus on the main ideas and key points. Be concise and clear.

Content to summarize:
{content[:5000]}

Provide ONLY the summary, no extra formatting."""

        async def event_generator():
            try:
                def stream_callback(chunk: str):
                    return f"data: {json.dumps({'chunk': chunk})}\n\n"
                
                yield "data: {\"status\": \"started\"}\n\n"
                
                for chunk in agent.handle_user_input_stream_generator(prompt):
                    yield stream_callback(chunk)
                
                yield "data: {\"status\": \"completed\"}\n\n"
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                logger.exception(f"Streaming error: {e}")
                yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
        
    except Exception as e:
        logger.exception(f"Streaming summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
