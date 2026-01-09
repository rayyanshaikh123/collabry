// Helper to call the backend mindmap render endpoint
export async function renderMindmap(mindmap: any, format: 'svg' | 'mermaid' | 'both' = 'both', baseUrl?: string) {
  const host = baseUrl || (typeof window !== 'undefined' && (window as any).__AI_ENGINE_URL) || process?.env?.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';

  const url = `${host.replace(/\/$/, '')}/ai/mindmap/render?format=${encodeURIComponent(format)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mindmap),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mindmap render failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}

export default renderMindmap;
