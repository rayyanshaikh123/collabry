"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import renderMindmap from '@/lib/mindmapClient';

interface Props {
  mindmapJson: any;
  format?: 'svg' | 'mermaid' | 'both';
  className?: string;
}

export default function MindMapViewer({ mindmapJson, format = 'both', className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mermaidCode, setMermaidCode] = useState<string | null>(null);
  const [svgBase64, setSvgBase64] = useState<string | null>(null);
  const [renderedSvg, setRenderedSvg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Create a stable reference for mindmapJson to prevent infinite loops
  const mindmapKey = useMemo(() => {
    if (!mindmapJson) return null;
    try {
      // Create a stable key from the mindmap structure
      if (mindmapJson.nodes && Array.isArray(mindmapJson.nodes)) {
        return JSON.stringify({
          nodeCount: mindmapJson.nodes.length,
          edgeCount: mindmapJson.edges?.length || 0,
          firstNode: mindmapJson.nodes[0]?.label || ''
        });
      }
      return JSON.stringify(mindmapJson);
    } catch {
      return String(mindmapJson);
    }
  }, [mindmapJson]);

  useEffect(() => {
    if (!mindmapJson || !mindmapKey) {
      console.log('MindMapViewer: No mindmapJson or mindmapKey');
      return;
    }
    
    // Check if mermaidCode is already cached in the mindmap data
    if (mindmapJson.mermaidCode) {
      console.log('MindMapViewer: Using cached mermaidCode from database');
      setMermaidCode(mindmapJson.mermaidCode);
      setSvgBase64(mindmapJson.svgBase64 || null);
      setLoading(false);
      return;
    }
    
    console.log('MindMapViewer: Starting render with:', {
      hasNodes: !!mindmapJson.nodes,
      nodeCount: mindmapJson.nodes?.length || 0,
      hasEdges: !!mindmapJson.edges,
      edgeCount: mindmapJson.edges?.length || 0,
      hasChildren: !!mindmapJson.children,
      format
    });
    
    let mounted = true;
    setLoading(true);
    setError(null);
    setMermaidCode(null);
    setSvgBase64(null);
    setRenderedSvg(null);

    renderMindmap(mindmapJson, format)
      .then((res) => {
        if (!mounted) return;
        console.log('MindMapViewer: Render response:', {
          hasMermaid: !!res.mermaid,
          hasSvg: !!(res as any).svg_base64,
          mermaidLength: res.mermaid?.length || 0
        });
        setMermaidCode(res.mermaid || null);
        setSvgBase64((res as any).svg_base64 || null);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('MindMapViewer: Render error:', err);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [mindmapKey, format]); // Use mindmapKey instead of mindmapJson

  // If Mermaid code is available, try to dynamically render it using mermaid
  useEffect(() => {
    let cancelled = false;
    async function renderMermaid() {
      if (!mermaidCode) return;
      
      // Sanitize Mermaid code to fix invalid node IDs
      let sanitizedCode = mermaidCode;
      try {
        // Fix node IDs with spaces or special characters
        // Pattern: "Node Name"["Label"] -> n1["Label"]
        const lines = sanitizedCode.split('\n');
        const sanitizedLines: string[] = [];
        const idMap = new Map<string, string>();
        let nodeCounter = 1;
        
        for (const line of lines) {
          if (line.trim().startsWith('graph') || line.trim() === '') {
            sanitizedLines.push(line);
            continue;
          }
          
          // Check if line has invalid node ID (contains spaces or special chars)
          const nodeDeclMatch = line.match(/^([^["\s]+)\["/);
          if (nodeDeclMatch) {
            const originalId = nodeDeclMatch[1];
            // Check if ID is invalid (has spaces, special chars, or starts with number)
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(originalId)) {
              // Generate valid ID
              const validId = `n${nodeCounter++}`;
              idMap.set(originalId, validId);
              sanitizedLines.push(line.replace(originalId, validId));
            } else {
              sanitizedLines.push(line);
            }
          } else {
            // Check for edges with invalid IDs
            const edgeMatch = line.match(/^([^-\s]+)\s*-->\s*([^\s]+)$/);
            if (edgeMatch) {
              const fromId = edgeMatch[1];
              const toId = edgeMatch[2];
              const validFrom = idMap.get(fromId) || (fromId.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/) ? fromId : `n${nodeCounter++}`);
              const validTo = idMap.get(toId) || (toId.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/) ? toId : `n${nodeCounter++}`);
              if (validFrom !== fromId || validTo !== toId) {
                idMap.set(fromId, validFrom);
                idMap.set(toId, validTo);
              }
              sanitizedLines.push(`${validFrom} --> ${validTo}`);
            } else {
              sanitizedLines.push(line);
            }
          }
        }
        
        sanitizedCode = sanitizedLines.join('\n');
      } catch (e) {
        console.warn('Mermaid sanitization failed, using original:', e);
      }
      
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = (mermaidModule as any).default || mermaidModule;
        if (!mermaid) return;
        mermaid.initialize({ startOnLoad: false });
        const id = 'mm_' + Math.random().toString(36).slice(2, 9);
        const { svg } = await mermaid.render(id, sanitizedCode);
        if (!cancelled) setRenderedSvg(svg);
      } catch (e) {
        // mermaid may not be installed; ignore and fallback to showing code
        console.error('Mermaid render failed:', e);
        console.log('Mermaid code that failed:', sanitizedCode);
      }
    }
    renderMermaid();
    return () => { cancelled = true; };
  }, [mermaidCode]);

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-emerald-500 mx-auto mb-2"></div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Rendering mindmap…</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    console.error('MindMapViewer error:', error);
    return (
      <div className={className}>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-400 font-bold mb-1">Error rendering mindmap</p>
          <p className="text-xs text-red-600 dark:text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  // Prefer SVG if available
  if (svgBase64) {
    return (
      <div className={className} ref={containerRef}>
        <img 
          alt="Mindmap" 
          src={`data:image/svg+xml;base64,${svgBase64}`} 
          className="w-full h-auto"
          onError={(e) => {
            console.error('SVG image load error');
            setError('Failed to load SVG image');
          }}
        />
      </div>
    );
  }

  // If mermaid rendered to SVG via library, inject it
  if (renderedSvg) {
    return (
      <div className={className} dangerouslySetInnerHTML={{ __html: renderedSvg }} />
    );
  }

  // Fallback: show mermaid code block if present
  if (mermaidCode) {
    return (
      <div className={className}>
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-bold">Mermaid Diagram:</p>
          <pre className="whitespace-pre-wrap text-xs bg-white dark:bg-slate-900 border dark:border-slate-700 rounded p-2 overflow-auto max-h-96 text-slate-900 dark:text-slate-200">{mermaidCode}</pre>
        </div>
      </div>
    );
  }

  // If we have mindmap data but no output, show debug info
  if (mindmapJson) {
    console.warn('MindMapViewer: Has data but no output:', {
      hasNodes: !!mindmapJson.nodes,
      nodeCount: mindmapJson.nodes?.length || 0,
      hasMermaid: !!mermaidCode,
      hasSvg: !!svgBase64,
      hasRenderedSvg: !!renderedSvg,
      error
    });
  }

  return (
    <div className={className}>
      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
        <p className="text-sm text-yellow-800 dark:text-yellow-400 font-bold mb-1">No mindmap output available</p>
        <p className="text-xs text-yellow-600 dark:text-yellow-500">The mindmap data was parsed but rendering failed. Check console for details.</p>
      </div>
    </div>
  );
}
