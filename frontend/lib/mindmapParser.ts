/**
 * Parser for extracting mindmap JSON from AI responses
 * Supports multiple formats:
 * - Direct JSON objects
 * - JSON wrapped in markdown code blocks
 * - Hierarchical tree structures
 */

export interface MindMapNode {
  id: string;
  label: string;
  level?: number;
  children?: MindMapNode[];
}

export interface MindMapStructure {
  nodes: Array<{ id: string; label: string; level?: number }>;
  edges: Array<{ id: string; from: string; to: string }>;
}

/**
 * Clean and fix common JSON issues
 */
function cleanJSON(jsonString: string): string {
  let cleaned = jsonString.trim();

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Remove comments (single line // and multi-line /* */)
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove any text after the closing brace
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > 0) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }

  return cleaned;
}

/**
 * Extract JSON from text (handles code blocks, plain JSON, etc.)
 */
function extractJSON(text: string): any | null {
  // Clean text - remove common prefixes/suffixes
  let cleanText = text.trim();

  // Remove markdown code block markers if present
  cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Remove explicit intent markers like [MINDMAP_GENERATION_REQUEST]
  cleanText = cleanText.replace(/^\[[A-Z_]+_REQUEST\]\s*/i, '');

  // Try to find JSON in markdown code blocks first
  const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
  const codeBlockMatch = cleanText.match(codeBlockRegex);
  if (codeBlockMatch) {
    try {
      const cleaned = cleanJSON(codeBlockMatch[1]);
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('Failed to parse JSON from code block:', e);
    }
  }

  // Try to find JSON object with nodes/edges - use non-greedy match
  const jsonObjectRegex = /\{[\s\S]*?"(?:nodes|edges)"[\s\S]*?\}/i;
  const jsonMatch = cleanText.match(jsonObjectRegex);
  if (jsonMatch) {
    try {
      const cleaned = cleanJSON(jsonMatch[0]);
      const parsed = JSON.parse(cleaned);
      if (parsed && (parsed.nodes || parsed.edges || parsed.children)) {
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse JSON object:', e);
      // Try to extract just the JSON part more carefully
      try {
        // Find the first { and last } that contain nodes or edges
        const startIdx = cleanText.indexOf('{');
        if (startIdx >= 0) {
          let braceCount = 0;
          let endIdx = startIdx;
          for (let i = startIdx; i < cleanText.length; i++) {
            if (cleanText[i] === '{') braceCount++;
            if (cleanText[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIdx = i;
                break;
              }
            }
          }
          if (endIdx > startIdx) {
            const jsonStr = cleanText.substring(startIdx, endIdx + 1);
            const cleaned = cleanJSON(jsonStr);
            const parsed = JSON.parse(cleaned);
            if (parsed && (parsed.nodes || parsed.edges || parsed.children)) {
              return parsed;
            }
          }
        }
      } catch (e2) {
        console.warn('Failed to parse with brace matching:', e2);
      }
    }
  }

  // Try to find any JSON object by matching braces
  const startBrace = cleanText.indexOf('{');
  if (startBrace >= 0) {
    try {
      let braceCount = 0;
      let endBrace = startBrace;
      for (let i = startBrace; i < cleanText.length; i++) {
        if (cleanText[i] === '{') braceCount++;
        if (cleanText[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endBrace = i;
            break;
          }
        }
      }
      if (endBrace > startBrace) {
        const jsonStr = cleanText.substring(startBrace, endBrace + 1);
        const cleaned = cleanJSON(jsonStr);
        const parsed = JSON.parse(cleaned);
        if (parsed && (parsed.nodes || parsed.edges || parsed.children)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse with brace matching:', e);
    }
  }

  // Last resort: try parsing the entire cleaned text
  try {
    const cleaned = cleanJSON(cleanText);
    const parsed = JSON.parse(cleaned);
    if (parsed && (parsed.nodes || parsed.edges || parsed.children)) {
      return parsed;
    }
  } catch (e) {
    // Not valid JSON
  }

  return null;
}

/**
 * Convert hierarchical tree structure to nodes/edges format
 */
function treeToNodesEdges(
  node: MindMapNode,
  nodes: Array<{ id: string; label: string; level?: number }> = [],
  edges: Array<{ id: string; from: string; to: string }> = [],
  parentId: string | null = null,
  level: number = 0
): { nodes: Array<{ id: string; label: string; level?: number }>; edges: Array<{ id: string; from: string; to: string }> } {
  // Add current node
  nodes.push({
    id: node.id,
    label: node.label,
    level: node.level ?? level
  });

  // Add edge from parent if exists
  if (parentId) {
    edges.push({
      id: `edge_${parentId}_${node.id}`,
      from: parentId,
      to: node.id
    });
  }

  // Process children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      treeToNodesEdges(child, nodes, edges, node.id, level + 1);
    }
  }

  return { nodes, edges };
}

/**
 * Parse mindmap from AI response text
 * Returns nodes/edges format compatible with MindMapViewer
 */
export function parseMindMapFromText(text: string): MindMapStructure | null {
  // Try to extract JSON first
  const jsonData = extractJSON(text);

  if (jsonData) {
    // Handle different JSON formats

    // Format 1: Direct nodes/edges format
    if (jsonData.nodes && Array.isArray(jsonData.nodes) && jsonData.edges && Array.isArray(jsonData.edges)) {
      return {
        nodes: jsonData.nodes.map((n: any, idx: number) => ({
          id: n.id || `node_${idx}`,
          label: n.label || n.text || n.name || String(n),
          level: n.level
        })),
        edges: jsonData.edges.map((e: any, idx: number) => ({
          id: e.id || `edge_${e.from || e.source || e.parent}_${e.to || e.target || e.child}_${idx}`,
          from: e.from || e.source || e.parent,
          to: e.to || e.target || e.child
        }))
      };
    }

    // Format 2: Hierarchical tree structure
    if (jsonData.children || jsonData.label || jsonData.text) {
      const root: MindMapNode = {
        id: jsonData.id || 'root',
        label: jsonData.label || jsonData.text || jsonData.name || 'Root',
        level: jsonData.level || 0,
        children: jsonData.children || []
      };
      return treeToNodesEdges(root);
    }

    // Format 3: Array of nodes (assume root is first)
    if (Array.isArray(jsonData) && jsonData.length > 0) {
      const first = jsonData[0];
      if (first.children || first.label) {
        const root: MindMapNode = {
          id: first.id || 'root',
          label: first.label || first.text || 'Root',
          level: 0,
          children: first.children || []
        };
        return treeToNodesEdges(root);
      }
    }
  }

  // Do NOT fall back to hierarchical text parsing - that turns any bullet list into a "mindmap"
  return null;
}

/**
 * Extract mindmap from markdown and return clean markdown + mindmap
 */
export function extractMindMapFromMarkdown(markdownText: string): {
  cleanMarkdown: string;
  mindmap: MindMapStructure | null;
} {
  // Check if text contains JSON mindmap
  const hasJsonPattern = /\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/i.test(markdownText) ||
    /\{[\s\S]*"children"[\s\S]*\}/i.test(markdownText) ||
    /```(?:json)?\s*\{[\s\S]*\}/i.test(markdownText);

  const mindmap = parseMindMapFromText(markdownText);

  // Validate mindmap structure
  if (!mindmap || !mindmap.nodes || !Array.isArray(mindmap.nodes) || mindmap.nodes.length === 0) {
    return { cleanMarkdown: markdownText, mindmap: null };
  }

  // Reject if response looks like an error or generic apology (avoid rendering mindmap on failed/generic responses)
  const errorIndicators = [
    /^I('m| am) sorry/i, /^Sorry[,!]/i, /^Unfortunately/i, /^I (couldn't|cannot) /i,
    /^(An? )?error (occurred|happened)/i, /^Something went wrong/i, /^Failed to /i,
    /^(I )?don't have (access|information)/i, /^I ('m|am) unable to/i
  ];
  const textStart = markdownText.trim().substring(0, 150);
  if (errorIndicators.some((pat) => pat.test(textStart))) {
    return { cleanMarkdown: markdownText, mindmap: null };
  }

  // CRITICAL: Reject mindmaps with placeholder text
  const placeholderPatterns = [
    /MainTopicName/i,
    /Subtopic\d+/i,
    /Concept\d+/i,
    /Main Topic Name/i,
    /Subtopic One/i,
    /Subtopic Two/i,
    /Specific Detail/i,
    /RealSubtopic\d+/i,
    /RealConcept\d+/i,
    /ActualMainTopic/i,
    /REAL_TOPIC_FROM_CONTEXT/i
  ];

  const hasPlaceholders = mindmap.nodes.some((node: any) => {
    const label = (node.label || '').toString();
    return placeholderPatterns.some(pattern => pattern.test(label));
  });

  if (hasPlaceholders) {
    console.warn('Mindmap rejected: contains placeholder text');
    return { cleanMarkdown: markdownText, mindmap: null };
  }

  // Ensure edges array exists
  if (!mindmap.edges || !Array.isArray(mindmap.edges)) {
    mindmap.edges = [];
  }

  // Debug logging (only if we detected JSON pattern and it's valid)
  if (hasJsonPattern) {
    console.log('Mindmap parsing:', {
      hasJsonPattern,
      textLength: markdownText.length,
      parsed: {
        nodeCount: mindmap.nodes?.length || 0,
        edgeCount: mindmap.edges?.length || 0
      }
    });
  }

  // Remove mindmap section from markdown
  let cleanMarkdown = markdownText;

  // Try to find and remove JSON code blocks
  const codeBlockRegex = /```(?:json)?\s*\{[\s\S]*?\}\s*```/i;
  cleanMarkdown = cleanMarkdown.replace(codeBlockRegex, '');

  // Try to remove standalone JSON objects
  const jsonObjectRegex = /\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/i;
  cleanMarkdown = cleanMarkdown.replace(jsonObjectRegex, '');

  // Also remove hierarchical tree JSON objects (label/children format)
  const treeJsonRegex = /\{[\s\S]*"label"[\s\S]*"children"[\s\S]*\}/i;
  cleanMarkdown = cleanMarkdown.replace(treeJsonRegex, '');

  return { cleanMarkdown: cleanMarkdown.trim(), mindmap };
}

