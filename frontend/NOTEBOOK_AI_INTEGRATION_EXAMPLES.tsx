// Example: How to integrate Notebook AI features into the frontend UI

/**
 * 1. WEB SCRAPING INTEGRATION (SourcesPanel)
 * 
 * Add a URL input and scrape button to allow users to add web content as sources
 */

// In SourcesPanel.tsx
import { useState } from 'react';
import notebookService from '@/services/notebook.service';

function SourcesPanel({ notebookId }: { notebookId: string }) {
  const [scrapingUrl, setScrapingUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  const handleScrapeUrl = async () => {
    if (!scrapingUrl) return;
    
    setIsScraping(true);
    try {
      // 1. Scrape the URL using AI engine
      const scraped = await notebookService.scrapeUrl(scrapingUrl);
      
      // 2. Convert to file for upload
      const formData = new FormData();
      const blob = new Blob([scraped.content], { type: 'text/plain' });
      const filename = `${scraped.title || 'scraped'}.txt`.replace(/[^a-zA-Z0-9.-]/g, '_');
      formData.append('file', blob, filename);
      formData.append('type', 'website');
      formData.append('url', scraped.url);
      
      // 3. Add as source to notebook
      await notebookService.addSource(notebookId, formData);
      
      // 4. Show success & clear input
      toast.success(`Added ${scraped.word_count} words from ${scraped.title}`);
      setScrapingUrl('');
      
    } catch (error) {
      toast.error('Failed to scrape URL: ' + error.message);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div>
      {/* URL Scraping Section */}
      <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200">
        <h3 className="font-bold mb-2">🌐 Add Website Content</h3>
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/article"
            value={scrapingUrl}
            onChange={(e) => setScrapingUrl(e.target.value)}
            disabled={isScraping}
          />
          <Button
            onClick={handleScrapeUrl}
            disabled={!scrapingUrl || isScraping}
            variant="primary"
          >
            {isScraping ? 'Scraping...' : 'Add'}
          </Button>
        </div>
      </div>
      
      {/* Existing sources list */}
    </div>
  );
}

/**
 * 2. WEB SEARCH INTEGRATION (ChatPanel)
 * 
 * Add a web search button to find resources during chat
 */

// In ChatPanel.tsx
function ChatPanel({ notebookId }: { notebookId: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleWebSearch = async () => {
    if (!searchQuery) return;
    
    setIsSearching(true);
    try {
      const results = await notebookService.searchWeb(searchQuery, 5);
      setSearchResults(results.results);
      
      // Optionally: Add a message to chat showing the search
      addMessage({
        role: 'system',
        content: `Found ${results.total_results} results for "${searchQuery}"`
      });
      
    } catch (error) {
      toast.error('Search failed: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="p-3 bg-indigo-50 border-b-2 border-indigo-200">
        <div className="flex gap-2">
          <Input
            placeholder="Search the web..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleWebSearch()}
          />
          <Button onClick={handleWebSearch} disabled={isSearching}>
            {isSearching ? '🔍' : '🌐'} Search
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="p-3 bg-white border-b-2 border-slate-200">
          <h4 className="font-bold mb-2">Search Results</h4>
          {searchResults.map((result, i) => (
            <div key={i} className="mb-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100">
              <a href={result.url} target="_blank" className="font-medium text-indigo-600 hover:underline">
                {result.title}
              </a>
              <p className="text-sm text-slate-600">{result.snippet}</p>
              <button
                onClick={() => handleScrapeUrl(result.url)}
                className="text-xs text-emerald-600 hover:underline mt-1"
              >
                Add as source
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Chat messages */}
    </div>
  );
}

/**
 * 3. CONTENT SUMMARIZATION (StudioPanel or ArtifactViewer)
 * 
 * Add summarize button for sources
 */

// In StudioPanel.tsx or ArtifactViewer.tsx
function SummarizeButton({ sourceContent }: { sourceContent: string }) {
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummary('');
    
    try {
      // Option 1: Non-streaming (simpler)
      const result = await notebookService.summarizeContent(sourceContent, 200);
      setSummary(result.summary);
      
      // Option 2: Streaming (better UX)
      // for await (const chunk of notebookService.streamSummarization(sourceContent, 200)) {
      //   setSummary(prev => prev + chunk);
      // }
      
    } catch (error) {
      toast.error('Summarization failed: ' + error.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleSummarize}
        disabled={isSummarizing || !sourceContent}
        variant="secondary"
      >
        {isSummarizing ? '✨ Summarizing...' : '📝 Summarize'}
      </Button>
      
      {summary && (
        <div className="mt-4 p-4 bg-amber-50 rounded-2xl border-2 border-amber-200">
          <h4 className="font-bold mb-2">📝 Summary</h4>
          <p className="text-slate-700">{summary}</p>
        </div>
      )}
    </div>
  );
}

/**
 * 4. STREAMING SUMMARIZATION (Better UX)
 * 
 * Show summary as it's being generated with typing effect
 */

function StreamingSummarize({ content }: { content: string }) {
  const [summary, setSummary] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const handleStreamSummary = async () => {
    setSummary('');
    setIsStreaming(true);
    
    try {
      for await (const chunk of notebookService.streamSummarization(content, 200)) {
        setSummary(prev => prev + chunk);
      }
    } catch (error) {
      toast.error('Streaming failed: ' + error.message);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div>
      <Button onClick={handleStreamSummary} disabled={isStreaming}>
        {isStreaming ? '✨ Generating...' : '🎬 Stream Summary'}
      </Button>
      
      {summary && (
        <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-bold">📝 Live Summary</h4>
            {isStreaming && <span className="animate-pulse">✨</span>}
          </div>
          <p className="text-slate-700 whitespace-pre-wrap">{summary}</p>
        </div>
      )}
    </div>
  );
}

/**
 * 5. KEY POINTS EXTRACTION
 * 
 * Extract and display structured key points
 */

function KeyPointsExtractor({ content }: { content: string }) {
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtractKeyPoints = async () => {
    setIsExtracting(true);
    try {
      const result = await notebookService.extractKeyPoints(content, 5);
      setKeyPoints(result.key_points);
    } catch (error) {
      toast.error('Extraction failed: ' + error.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const importanceColors = {
    high: 'bg-red-100 border-red-300 text-red-800',
    medium: 'bg-amber-100 border-amber-300 text-amber-800',
    low: 'bg-blue-100 border-blue-300 text-blue-800'
  };

  return (
    <div>
      <Button onClick={handleExtractKeyPoints} disabled={isExtracting}>
        {isExtracting ? '🔍 Extracting...' : '💡 Extract Key Points'}
      </Button>
      
      {keyPoints.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-bold">💡 Key Points</h4>
          {keyPoints.map((point, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border-2 ${importanceColors[point.importance]}`}
            >
              <div className="flex items-start gap-2">
                <span className="font-bold">{i + 1}.</span>
                <span>{point.point}</span>
              </div>
              <span className="text-xs uppercase font-bold mt-1 inline-block">
                {point.importance}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 6. COMPLETE EXAMPLE: Enhanced SourcesPanel with all features
 */

function EnhancedSourcesPanel({ notebookId, sources }: { notebookId: string; sources: Source[] }) {
  const [activeTab, setActiveTab] = useState<'files' | 'web' | 'search'>('files');
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b-2 border-slate-200">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 font-bold ${activeTab === 'files' ? 'border-b-4 border-indigo-500' : ''}`}
        >
          📁 Files
        </button>
        <button
          onClick={() => setActiveTab('web')}
          className={`px-4 py-2 font-bold ${activeTab === 'web' ? 'border-b-4 border-indigo-500' : ''}`}
        >
          🌐 Web
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 font-bold ${activeTab === 'search' ? 'border-b-4 border-indigo-500' : ''}`}
        >
          🔍 Search
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'files' && (
          <div>
            {/* File upload UI */}
            {/* List of sources */}
          </div>
        )}

        {activeTab === 'web' && (
          <div>
            <Input
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={() => {/* handleScrapeUrl */}}>
              Add Website
            </Button>
          </div>
        )}

        {activeTab === 'search' && (
          <div>
            <Input
              placeholder="Search the web..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button onClick={() => {/* handleWebSearch */}}>
              Search
            </Button>
            
            {/* Display search results with "Add as source" buttons */}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * USAGE NOTES:
 * 
 * 1. All these examples use the service methods from notebook.service.ts
 * 2. Remember to handle loading states and errors properly
 * 3. Use toast notifications for user feedback
 * 4. Consider adding progress indicators for long operations
 * 5. Stream when possible for better UX (summarization)
 * 6. Cache results to avoid redundant API calls
 * 7. Add proper TypeScript types from the service file
 */

export {};
