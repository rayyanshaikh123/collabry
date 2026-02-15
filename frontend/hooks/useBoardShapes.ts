export function generateShapeId(prefix: string = 'shape'): string {
  return `${prefix}:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateAssetId(): string {
  return `asset:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeColor(color: string): string {
  const validColors = [
    'black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue', 
    'yellow', 'orange', 'green', 'light-green', 'light-red', 'red', 'white'
  ];
  
  const colorMap: Record<string, string> = {
    'light-yellow': 'yellow',
  };
  
  const mappedColor = colorMap[color] || color;
  return validColors.includes(mappedColor) ? mappedColor : 'black';
}

export function sanitizeShape(shape: any): any {
  if (shape.type === 'geo' && shape.props?.color) {
    return {
      ...shape,
      props: {
        ...shape.props,
        color: sanitizeColor(shape.props.color),
      },
    };
  }
  return shape;
}

export function buildInfographicShapes(infographic: any) {
  if (!infographic) return [];
  const title = String(infographic.title || 'Infographic');
  const subtitle = infographic.subtitle ? String(infographic.subtitle) : '';
  const sections = Array.isArray(infographic.sections) ? infographic.sections : [];

  const originX = 120;
  const originY = 140;
  const shapes: any[] = [];

  shapes.push({
    id: generateShapeId('shape'),
    typeName: 'shape',
    type: 'text',
    x: originX,
    y: originY,
    parentId: 'page:page',
    index: 'a1',
    rotation: 0,
    isLocked: false,
    opacity: 1,
    meta: {},
    props: {
      richText: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: subtitle ? `${title}\n${subtitle}` : title }]
          }
        ]
      },
      font: 'sans',
      size: 'xl',
      color: 'black',
      textAlign: 'start',
      w: 680,
      autoSize: false,
      scale: 1,
    },
  });

  sections.slice(0, 4).forEach((section: any, idx: number) => {
    const cardX = originX + (idx % 2) * 360;
    const cardY = originY + 110 + Math.floor(idx / 2) * 220;
    const icon = section?.icon ? String(section.icon) : '📌';
    const sectionTitle = section?.title ? String(section.title) : `Section ${idx + 1}`;
    const keyPoints = Array.isArray(section?.keyPoints) ? section.keyPoints.slice(0, 4) : [];
    const body = keyPoints.map((p: any) => `• ${String(p)}`).join('\n');
    const text = body ? `${icon} ${sectionTitle}\n${body}` : `${icon} ${sectionTitle}`;

    shapes.push({
      id: generateShapeId('shape'),
      typeName: 'shape',
      type: 'geo',
      x: cardX,
      y: cardY,
      parentId: 'page:page',
      index: `a${idx + 2}`,
      rotation: 0,
      isLocked: false,
      opacity: 1,
      meta: {},
      props: {
        geo: 'rectangle',
        w: 330,
        h: 200,
        color: 'blue',
        labelColor: 'black',
        fill: 'semi',
        dash: 'draw',
        size: 'm',
        font: 'sans',
        richText: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text }]
            }
          ]
        },
        align: 'start',
        verticalAlign: 'start',
        scale: 1,
        growY: 0,
        url: '',
      },
    });
  });

  return shapes;
}

export async function buildMindmapShapes(payload: any) {
  if (!payload) return { shapes: [], assets: [] };
  
  const title = payload.title || 'Mind Map';
  const data = payload.data || payload;
  const nodeCount = data?.nodes?.length || 0;
  let svgBase64 = payload.svgBase64 || data?.svgBase64;
  
  // If no SVG but we have mermaid code, render it to SVG
  if (!svgBase64 && data?.mermaidCode) {
    try {
      const mermaidModule = await import('mermaid');
      const mermaid = (mermaidModule as any).default || mermaidModule;
      if (mermaid) {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        const id = 'board_' + Math.random().toString(36).slice(2, 9);
        const { svg } = await mermaid.render(id, data.mermaidCode);
        // Use Unicode-safe encoding for btoa
        svgBase64 = btoa(unescape(encodeURIComponent(svg)));
      }
    } catch (error) {
      console.error('Failed to render mermaid for study board:', error);
    }
  }
  
  const originX = 120;
  const originY = 160;
  const shapes: any[] = [];
  const assets: any[] = [];

  if (svgBase64) {
    const assetId = generateAssetId();
    const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;
    
    // Extract SVG dimensions from the SVG content
    let width = 1600;
    let height = 1200;
    
    try {
      const svgContent = atob(svgBase64);
      const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
      const widthMatch = svgContent.match(/width=["']?(\d+)/);
      const heightMatch = svgContent.match(/height=["']?(\d+)/);
      
      if (viewBoxMatch) {
        const [, , , vbWidth, vbHeight] = viewBoxMatch[1].split(/\s+/).map(Number);
        if (vbWidth && vbHeight) {
          width = Math.min(Math.max(vbWidth, 800), 2400); // Min 800px, max 2400px
          height = Math.min(Math.max(vbHeight, 600), 1800); // Min 600px, max 1800px
        }
      } else if (widthMatch && heightMatch) {
        width = Math.min(Math.max(Number(widthMatch[1]), 800), 2400);
        height = Math.min(Math.max(Number(heightMatch[1]), 600), 1800);
      }
    } catch (e) {
      console.warn('Could not extract SVG dimensions, using defaults:', e);
    }
    
    assets.push({
      id: assetId,
      type: 'image',
      typeName: 'asset',
      props: {
        name: `${title}.svg`,
        src: svgDataUri,
        w: width,
        h: height,
        mimeType: 'image/svg+xml',
        isAnimated: false,
      },
      meta: {},
    });

    shapes.push({
      id: generateShapeId('shape'),
      typeName: 'shape',
      type: 'image',
      x: originX,
      y: originY,
      parentId: 'page:page',
      index: 'a1',
      rotation: 0,
      isLocked: false,
      opacity: 1,
      meta: {
        svgDataUri: svgDataUri,
        assetType: 'mindmap-svg',
        title: title,
      },
      props: {
        w: width,
        h: height,
        assetId: assetId,
        playing: true,
        url: '',
        crop: null,
        flipX: false,
        flipY: false,
        altText: title,
      },
    });
  } else {
    shapes.push({
      id: generateShapeId('shape'),
      typeName: 'shape',
      type: 'geo',
      x: originX,
      y: originY,
      parentId: 'page:page',
      index: 'a1',
      rotation: 0,
      isLocked: false,
      opacity: 1,
      meta: {},
      props: {
        geo: 'rectangle',
        w: 500,
        h: 300,
        color: 'violet',
        labelColor: 'black',
        fill: 'semi',
        dash: 'draw',
        size: 'm',
        font: 'sans',
        richText: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: `🧠 ${title}\n\nMindmap with ${nodeCount} nodes\n\n💡 View in Study Notebook to see full diagram\n📊 This is a visual representation placeholder` }]
            }
          ]
        },
        align: 'middle',
        verticalAlign: 'middle',
        scale: 1,
        growY: 0,
        url: '',
      },
    });
  }

  return { shapes, assets };
}

export async function buildShapesFromImport(payload: any) {
  if (!payload || typeof payload !== 'object') {
    return { shapes: [], assets: [] };
  }
  
  if (payload.kind === 'mindmap') {
    return await buildMindmapShapes(payload);
  }
  
  if (payload.kind === 'infographic') {
    return { shapes: buildInfographicShapes(payload.data), assets: [] };
  }
  
  return { shapes: [], assets: [] };
}
