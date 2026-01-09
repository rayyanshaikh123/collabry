"use client";

import React, { useEffect, useState, useRef } from 'react';
import renderMindmap from '../../src/lib/mindmapClient';

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

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setMermaidCode(null);
    setSvgBase64(null);
    setRenderedSvg(null);

    renderMindmap(mindmapJson, format)
      .then((res) => {
        if (!mounted) return;
        setMermaidCode(res.mermaid || null);
        setSvgBase64(res.svg_base64 || null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(String(err));
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [mindmapJson, format]);

  // If Mermaid code is available, try to dynamically render it using mermaid
  useEffect(() => {
    let cancelled = false;
    async function renderMermaid() {
      if (!mermaidCode) return;
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = (mermaidModule as any).default || mermaidModule;
        if (!mermaid) return;
        mermaid.initialize({ startOnLoad: false });
        const id = 'mm_' + Math.random().toString(36).slice(2, 9);
        const { svg } = await mermaid.render(id, mermaidCode);
        if (!cancelled) setRenderedSvg(svg);
      } catch (e) {
        // mermaid may not be installed; ignore and fallback to showing code
        console.debug('Mermaid render failed or not available:', e);
      }
    }
    renderMermaid();
    return () => { cancelled = true; };
  }, [mermaidCode]);

  if (loading) return <div className={className}>Rendering mindmap…</div>;
  if (error) return <div className={className}>Error: {error}</div>;

  // Prefer SVG if available
  if (svgBase64) {
    return (
      <div className={className} ref={containerRef}>
        <img alt="Mindmap" src={`data:image/svg+xml;base64,${svgBase64}`} />
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
        <pre className="whitespace-pre-wrap text-xs bg-slate-50 border rounded p-2">{mermaidCode}</pre>
      </div>
    );
  }

  return <div className={className}>No mindmap output available.</div>;
}
