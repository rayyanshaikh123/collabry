/**
 * Convert nodes/edges format to hierarchical tree format expected by backend
 */
function convertToHierarchicalTree(mindmap: any): any {
  // If already in hierarchical format (has children), return as is
  if (mindmap.children || (mindmap.label && !mindmap.nodes)) {
    console.log('convertToHierarchicalTree: Already hierarchical format');
    return mindmap;
  }

  // Convert nodes/edges to hierarchical tree
  if (mindmap.nodes && Array.isArray(mindmap.nodes)) {
    const nodes = mindmap.nodes;
    const edges = mindmap.edges && Array.isArray(mindmap.edges) ? mindmap.edges : [];
    
    console.log('convertToHierarchicalTree: Converting nodes/edges:', {
      nodeCount: nodes.length,
      edgeCount: edges.length
    });
    
    // If no edges, create a simple flat structure with root and children
    if (edges.length === 0 && nodes.length > 0) {
      console.log('convertToHierarchicalTree: No edges, creating flat structure');
      const rootNode = nodes.find((n: any) => n.id === 'root' || n.level === 0) || nodes[0];
      const children = nodes
        .filter((n: any) => n.id !== rootNode.id && (n.level === 1 || n.level === undefined))
        .map((n: any) => ({
          id: n.id,
          label: n.label || n.text || 'Node',
          children: nodes
            .filter((child: any) => child.level === 2 && child.id !== n.id)
            .map((child: any) => ({
              id: child.id,
              label: child.label || child.text || 'Node',
              children: []
            }))
        }));
      
      return {
        id: rootNode.id || 'root',
        label: rootNode.label || rootNode.text || 'Root',
        children: children
      };
    }
    
    // Find root node (node with no incoming edges, or node with id "root", or level 0)
    let rootNode = nodes.find((n: any) => n.id === 'root' || n.level === 0);
    
    if (!rootNode && edges.length > 0) {
      // Try to find node with no incoming edges
      rootNode = nodes.find((n: any) => !edges.some((e: any) => (e.to === n.id || e.target === n.id)));
    }
    
    if (!rootNode) {
      // If no root found, use first node
      rootNode = nodes[0];
      if (!rootNode) {
        console.warn('convertToHierarchicalTree: No nodes found');
        return { label: 'Root', children: [] };
      }
    }
    
    console.log('convertToHierarchicalTree: Found root:', rootNode.label);
    const tree = buildTree(rootNode, nodes, edges);
    console.log('convertToHierarchicalTree: Built tree:', {
      label: tree.label,
      childCount: tree.children?.length || 0
    });
    return tree;
  }
  
  // Fallback: return as is
  console.warn('convertToHierarchicalTree: Unknown format, returning as is');
  return mindmap;
}

/**
 * Generate Mermaid code directly from nodes/edges format (fallback)
 * Ensures valid Mermaid syntax with proper node IDs
 */
function generateMermaidFromNodesEdges(mindmap: any): string | null {
  if (!mindmap.nodes || !Array.isArray(mindmap.nodes) || mindmap.nodes.length === 0) {
    return null;
  }
  
  const edges = mindmap.edges || [];
  const lines: string[] = ['graph TD'];
  
  // Create a map of original IDs to valid Mermaid IDs
  const idMap = new Map<string, string>();
  
  // Generate valid node IDs (no spaces, special chars)
  for (let i = 0; i < mindmap.nodes.length; i++) {
    const node = mindmap.nodes[i];
    const originalId = node.id || `node_${i}`;
    // Create valid Mermaid ID: replace spaces and special chars with underscores
    let validId = originalId
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, 'n$&') // Can't start with number
      .replace(/^_+/, 'n') // Can't start with underscore
      .replace(/_+/g, '_') // Collapse multiple underscores
      .toLowerCase();
    
    // Ensure uniqueness
    if (!validId || idMap.has(validId)) {
      validId = `n${i + 1}`;
    }
    
    idMap.set(originalId, validId);
    
    // Escape label for Mermaid
    const label = (node.label || node.text || 'Node')
      .replace(/"/g, "'")
      .replace(/\n/g, ' ')
      .trim();
    
    lines.push(`${validId}["${label}"]`);
  }
  
  // Add all edges with mapped IDs
  for (const edge of edges) {
    const fromOriginal = edge.from || edge.source;
    const toOriginal = edge.to || edge.target;
    
    if (fromOriginal && toOriginal) {
      const fromId = idMap.get(fromOriginal) || fromOriginal.replace(/[^a-zA-Z0-9_]/g, '_');
      const toId = idMap.get(toOriginal) || toOriginal.replace(/[^a-zA-Z0-9_]/g, '_');
      
      // Only add edge if both IDs are valid
      if (fromId && toId && idMap.has(fromOriginal) && idMap.has(toOriginal)) {
        lines.push(`${fromId} --> ${toId}`);
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Build hierarchical tree from nodes and edges
 */
function buildTree(node: any, allNodes: any[], edges: any[]): any {
  // Find all edges where this node is the parent
  const childEdges = edges.filter((e: any) => {
    const fromId = e.from || e.source || e.parent;
    return fromId === node.id;
  });
  
  // Build children recursively
  const children = childEdges
    .map((e: any) => {
      const childId = e.to || e.target || e.child;
      const childNode = allNodes.find((n: any) => n.id === childId);
      if (childNode) {
        return buildTree(childNode, allNodes, edges);
      }
      return null;
    })
    .filter((n: any) => n !== null);
  
  const result = {
    id: node.id || 'root',
    label: node.label || node.text || node.name || String(node) || 'Node',
    children: children
  };
  
  return result;
}

// Helper to call the backend mindmap render endpoint
export async function renderMindmap(mindmap: any, format: 'svg' | 'mermaid' | 'both' = 'both', baseUrl?: string) {
  const host = baseUrl || (typeof window !== 'undefined' && (window as any).__AI_ENGINE_URL) || process?.env?.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';

  const url = `${host.replace(/\/$/, '')}/ai/mindmap/render?format=${encodeURIComponent(format)}`;

  // Get auth token from localStorage
  let token = '';
  if (typeof window !== 'undefined') {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        token = state?.accessToken || '';
      }
    } catch (e) {
      console.warn('Failed to get auth token:', e);
    }
  }

  // Convert to hierarchical format if needed
  const hierarchicalMindmap = convertToHierarchicalTree(mindmap);
  
  console.log('renderMindmap: Sending to backend:', {
    original: { hasNodes: !!mindmap.nodes, hasEdges: !!mindmap.edges, hasChildren: !!mindmap.children },
    converted: { hasLabel: !!hierarchicalMindmap.label, hasChildren: !!hierarchicalMindmap.children },
    format
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(hierarchicalMindmap),
    });
  } catch (e) {
    // Network/CORS errors show up here as a TypeError in browsers
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Mindmap render request failed: ${message}`);
  }

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    let payload: any = null;
    let text: string | null = null;

    if (contentType.includes('application/json')) {
      try {
        payload = await res.json();
      } catch {
        // fall through
      }
    }
    if (payload === null) {
      try {
        text = await res.text();
      } catch {
        // ignore
      }
    }

    const detail = payload?.detail ?? payload?.message ?? payload?.error ?? text ?? '';
    const detailString = typeof detail === 'string' ? detail : JSON.stringify(detail);

    console.error('renderMindmap: Backend error:', { status: res.status, detail: payload ?? text });

    if (res.status === 429) {
      // Friendly rate-limit message for UI
      const msg =
        (payload && typeof payload?.message === 'string' && payload.message) ||
        (payload && typeof payload?.detail?.message === 'string' && payload.detail.message) ||
        'Daily limit exceeded. Try again later.';
      const suggestion =
        (payload && typeof payload?.suggestion === 'string' && payload.suggestion) ||
        (payload && typeof payload?.detail?.suggestion === 'string' && payload.detail.suggestion) ||
        '';
      throw new Error(`Rate limit exceeded (429): ${msg}${suggestion ? ` — ${suggestion}` : ''}`);
    }

    throw new Error(`Mindmap render failed (HTTP ${res.status}): ${detailString}`);
  }

  const data = await res.json();
  console.log('renderMindmap: Backend response:', {
    hasMermaid: !!data.mermaid,
    hasSvg: !!data.svg_base64,
    hasError: !!data.error,
    mermaidPreview: data.mermaid?.substring(0, 100)
  });
  
  if (data.error) {
    console.error('renderMindmap: Backend returned error:', data.error);
    // Try to generate mermaid locally as fallback
    if (mindmap.nodes && mindmap.edges) {
      console.log('renderMindmap: Attempting local mermaid generation as fallback');
      const localMermaid = generateMermaidFromNodesEdges(mindmap);
      if (localMermaid) {
        return { mermaid: localMermaid, json: mindmap };
      }
    }
    throw new Error(data.error);
  }
  
  // If no mermaid but we have nodes/edges, try to generate locally
  if (!data.mermaid && mindmap.nodes && mindmap.edges) {
    console.log('renderMindmap: No mermaid from backend, generating locally');
    const localMermaid = generateMermaidFromNodesEdges(mindmap);
    if (localMermaid) {
      return { ...data, mermaid: localMermaid };
    }
  }
  
  return data;
}

export default renderMindmap;
