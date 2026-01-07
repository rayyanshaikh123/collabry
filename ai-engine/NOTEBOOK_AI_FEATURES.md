# Study Notebook AI Features

Comprehensive AI-powered features for the Study Notebook workspace.

## Overview

The Study Notebook AI engine provides specialized endpoints for web scraping, searching, content analysis, and summarization specifically designed for study materials.

## Base URL

All notebook AI endpoints are available at:
```
http://localhost:8000/ai/notebook
```

## Authentication

All endpoints require JWT Bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Web Scraping

**Endpoint:** `POST /ai/notebook/scrape`

Scrape and extract clean text content from any website URL for use as a study source.

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "extract_text_only": true
}
```

**Response:**
```json
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "content": "Full extracted text content...",
  "word_count": 1234,
  "scraped_at": "2024-01-15T10:30:00"
}
```

**Use Cases:**
- Add web articles as study sources
- Extract lecture notes from university websites
- Scrape documentation pages
- Import blog posts and tutorials

**Frontend Integration:**
```typescript
const scrapedData = await notebookService.scrapeUrl('https://example.com');
```

---

### 2. Web Search

**Endpoint:** `POST /ai/notebook/search`

Search the web for information related to your study topics using DuckDuckGo or Serper API.

**Request Body:**
```json
{
  "query": "machine learning basics",
  "max_results": 5
}
```

**Response:**
```json
{
  "query": "machine learning basics",
  "results": [
    {
      "title": "Introduction to Machine Learning",
      "url": "https://example.com/ml-intro",
      "snippet": "Machine learning is a subset of artificial intelligence..."
    }
  ],
  "total_results": 5,
  "searched_at": "2024-01-15T10:35:00"
}
```

**Use Cases:**
- Find additional resources on a topic
- Discover related study materials
- Quick fact-checking
- Research paper discovery

**Frontend Integration:**
```typescript
const searchResults = await notebookService.searchWeb('quantum physics', 10);
```

---

### 3. Content Summarization

**Endpoint:** `POST /ai/notebook/summarize`

Generate concise summaries of study materials using AI.

**Request Body:**
```json
{
  "content": "Long text content to summarize...",
  "max_length": 200
}
```

**Response:**
```json
{
  "summary": "Concise summary of the content...",
  "original_length": 1500,
  "summary_length": 180
}
```

**Use Cases:**
- Quick overview of long articles
- Create study notes from textbooks
- Condense lecture transcripts
- Generate abstracts

**Frontend Integration:**
```typescript
const summary = await notebookService.summarizeContent(longText, 200);
```

---

### 4. Streaming Summarization

**Endpoint:** `GET /ai/notebook/summarize/stream`

Stream summary generation in real-time using Server-Sent Events (SSE).

**Query Parameters:**
- `content` (string, required): Content to summarize
- `max_length` (integer, default: 200): Maximum summary length in words

**Response:** Server-Sent Events stream
```
data: {"status": "started"}
data: {"chunk": "The"}
data: {"chunk": " content"}
data: {"chunk": " is about..."}
data: {"status": "completed"}
data: [DONE]
```

**Use Cases:**
- Real-time summary generation with progress
- Better UX for long content summarization
- Show streaming text as it's generated

**Frontend Integration:**
```typescript
for await (const chunk of notebookService.streamSummarization(content, 200)) {
  setSummary(prev => prev + chunk);
}
```

---

### 5. Key Points Extraction

**Endpoint:** `POST /ai/notebook/extract-key-points`

Extract structured key points from content with importance ratings.

**Request Body:**
```json
{
  "content": "Text content to analyze...",
  "num_points": 5
}
```

**Response:**
```json
{
  "key_points": [
    {
      "point": "Machine learning requires large datasets",
      "importance": "high"
    },
    {
      "point": "Neural networks mimic brain structure",
      "importance": "medium"
    }
  ],
  "total_points": 5
}
```

**Use Cases:**
- Create bullet-point study guides
- Identify main concepts quickly
- Generate flashcard content
- Review material preparation

**Frontend Integration:**
```typescript
const keyPoints = await notebookService.extractKeyPoints(content, 5);
```

---

## Error Handling

All endpoints return structured error responses:

```json
{
  "error": "Error type",
  "detail": "Detailed error message",
  "timestamp": "2024-01-15T10:40:00"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `500` - Internal Server Error

## Rate Limiting

All notebook AI endpoints are subject to the general usage tracking and rate limiting:
- Free tier: 50 sessions per user
- Rate limits apply per user based on usage tracking middleware

## Technical Implementation

### Backend (Python/FastAPI)

**File:** `ai-engine/server/routes/notebook.py`

Key components:
- Uses existing `web_scrape` and `web_search` tools from `ai-engine/tools/`
- Creates isolated AI agents for content analysis
- Implements SSE streaming for real-time responses
- Proper error handling and logging
- Pydantic models for request/response validation

### Frontend (TypeScript/Next.js)

**File:** `frontend/src/services/notebook.service.ts`

Key features:
- Type-safe API client methods
- Async generator for streaming responses
- Error handling with typed exceptions
- Integration with React Query for state management

## Integration Guide

### Adding Web Scrape to Sources Panel

```typescript
// In SourcesPanel component
const handleScrapeUrl = async () => {
  try {
    const scraped = await notebookService.scrapeUrl(url);
    
    // Create FormData with scraped content
    const formData = new FormData();
    const blob = new Blob([scraped.content], { type: 'text/plain' });
    formData.append('file', blob, `${scraped.title}.txt`);
    formData.append('type', 'website');
    formData.append('url', scraped.url);
    
    // Add as source
    await addSourceMutation.mutateAsync({ notebookId, formData });
  } catch (error) {
    // Handle error
  }
};
```

### Implementing Search in Chat Panel

```typescript
// In ChatPanel component
const handleWebSearch = async (query: string) => {
  try {
    const results = await notebookService.searchWeb(query, 5);
    
    // Display results in chat
    setSearchResults(results.results);
  } catch (error) {
    // Handle error
  }
};
```

### Streaming Summary Display

```typescript
// In ArtifactViewer or StudioPanel
const handleStreamSummary = async (content: string) => {
  setSummary('');
  setIsStreaming(true);
  
  try {
    for await (const chunk of notebookService.streamSummarization(content, 200)) {
      setSummary(prev => prev + chunk);
    }
  } catch (error) {
    // Handle error
  } finally {
    setIsStreaming(false);
  }
};
```

## Future Enhancements

Potential additions to the notebook AI features:

1. **PDF Text Extraction**
   - Extract text from PDF sources
   - OCR for scanned documents

2. **Concept Mapping**
   - Automatic concept relationship detection
   - Visual concept graph generation

3. **Citation Generation**
   - Auto-generate citations from sources
   - Multiple citation formats (APA, MLA, Chicago)

4. **Smart Highlighting**
   - AI-powered text highlighting
   - Importance-based color coding

5. **Question Generation**
   - Generate practice questions from content
   - Multiple question types (MCQ, short answer, essay)

6. **Spaced Repetition**
   - Smart scheduling for review
   - Personalized difficulty adjustment

## Performance Considerations

- Content is limited to 5000 characters for streaming endpoints (URL parameter limits)
- Web scraping timeout: 10 seconds
- Web search timeout: 8 seconds (Serper) or 10 seconds (DuckDuckGo)
- Summarization uses full AI agent context (may be slower for very long content)
- Key point extraction limited to 20 points maximum

## Security

- All endpoints require valid JWT authentication
- User isolation enforced at the agent level
- Input validation using Pydantic models
- Rate limiting prevents abuse
- No sensitive data logged

## Testing

Run notebook AI endpoint tests:
```bash
cd ai-engine
python -m pytest tests/test_notebook_routes.py -v
```

## Support

For issues or questions:
1. Check the logs: `ai-engine/logs/`
2. Review API documentation: http://localhost:8000/docs
3. Examine usage statistics: `GET /ai/usage/me`

## Version History

- **v1.0.0** (2024-01-15): Initial release
  - Web scraping
  - Web search
  - Content summarization (non-streaming and streaming)
  - Key points extraction
