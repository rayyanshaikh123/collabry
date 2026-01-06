"""
FastAPI Client Examples - Streaming Summarization

This file demonstrates how to use the streaming summarization endpoint
from both Python and JavaScript/TypeScript clients.
"""

# ============================================================================
# Python Client Example (using requests library)
# ============================================================================

def python_streaming_example():
    """Python example using requests library."""
    import requests
    
    BASE_URL = "http://localhost:8000"
    TOKEN = "your_jwt_token"
    
    payload = {
        "text": "Your long text to summarize...",
        "style": "concise",  # or "detailed", "bullet"
        "max_length": 100    # optional
    }
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Stream the response
    with requests.post(
        f"{BASE_URL}/ai/summarize/stream",
        json=payload,
        headers=headers,
        stream=True
    ) as response:
        print("Streaming summary: ", end='')
        
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                
                if line.startswith('data: '):
                    content = line[6:]
                    if content:
                        print(content, end='', flush=True)
                
                elif line.startswith('event: done'):
                    print("\n✅ Complete!")
                    break


# ============================================================================
# Python Async Client Example (using httpx)
# ============================================================================

async def python_async_streaming_example():
    """Python async example using httpx library."""
    import httpx
    
    BASE_URL = "http://localhost:8000"
    TOKEN = "your_jwt_token"
    
    payload = {
        "text": "Your long text to summarize...",
        "style": "detailed"
    }
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        async with client.stream(
            'POST',
            f"{BASE_URL}/ai/summarize/stream",
            json=payload,
            headers=headers
        ) as response:
            print("Streaming summary: ", end='')
            
            async for line in response.aiter_lines():
                if line.startswith('data: '):
                    content = line[6:]
                    if content:
                        print(content, end='', flush=True)
                
                elif line.startswith('event: done'):
                    print("\n✅ Complete!")
                    break


# ============================================================================
# JavaScript/TypeScript Frontend Example
# ============================================================================

JAVASCRIPT_EXAMPLE = """
// TypeScript/JavaScript example using fetch API and EventSource pattern

interface SummarizeRequest {
  text: string;
  style?: 'concise' | 'detailed' | 'bullet';
  max_length?: number;
}

async function streamSummary(request: SummarizeRequest, token: string) {
  const response = await fetch('http://localhost:8000/ai/summarize/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  let summary = '';
  
  while (true) {
    const { done, value } = await reader!.read();
    
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const content = line.slice(6);
        if (content) {
          summary += content;
          // Update UI with streaming content
          console.log(content);
          // updateUI(content);
        }
      } else if (line.startsWith('event: done')) {
        console.log('✅ Summary complete!');
        return summary;
      }
    }
  }
  
  return summary;
}

// Usage example
const text = "Your long text to summarize...";
const token = "your_jwt_token";

streamSummary({ text, style: 'concise', max_length: 100 }, token)
  .then(summary => console.log('Final summary:', summary))
  .catch(error => console.error('Error:', error));


// React example with hooks
import { useState } from 'react';

function SummarizeComponent() {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSummarize = async (text: string) => {
    setLoading(true);
    setSummary('');

    try {
      const response = await fetch('/ai/summarize/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, style: 'concise' }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content) {
              setSummary(prev => prev + content);
            }
          } else if (line.startsWith('event: done')) {
            setLoading(false);
          }
        }
      }
    } catch (error) {
      console.error('Summarization error:', error);
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="summary-output">
        {loading && <span className="loading">Generating summary...</span>}
        {summary}
      </div>
    </div>
  );
}
"""

# ============================================================================
# cURL Example
# ============================================================================

CURL_EXAMPLE = """
# Non-streaming request
curl -X POST "http://localhost:8000/ai/summarize" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Your long text here...",
    "style": "concise",
    "max_length": 100
  }'

# Streaming request (will show SSE stream)
curl -N -X POST "http://localhost:8000/ai/summarize/stream" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Your long text here...",
    "style": "detailed"
  }'
"""

if __name__ == "__main__":
    print("=" * 70)
    print("STREAMING SUMMARIZATION - CLIENT EXAMPLES")
    print("=" * 70)
    print("\n📚 Available endpoints:")
    print("  • POST /ai/summarize - Regular response")
    print("  • POST /ai/summarize/stream - SSE streaming response")
    print("\n" + "=" * 70)
    print("\nSee code above for implementation examples in:")
    print("  ✓ Python (requests)")
    print("  ✓ Python (httpx async)")
    print("  ✓ JavaScript/TypeScript (fetch)")
    print("  ✓ React hooks")
    print("  ✓ cURL")
    print("\n" + "=" * 70)
