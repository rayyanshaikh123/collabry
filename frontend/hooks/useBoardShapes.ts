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
  console.log('=== buildMindmapShapes DEBUG ===');
  console.log('Payload:', payload);
  console.log('Has payload.svgBase64:', !!payload?.svgBase64);
  console.log('Has payload.data:', !!payload?.data);
  console.log('Has payload.data.svgBase64:', !!payload?.data?.svgBase64);
  console.log('Has payload.data.mermaidCode:', !!payload?.data?.mermaidCode);
  
  if (!payload) return { shapes: [], assets: [] };
  
  const title = payload.title || 'Mind Map';
  const data = payload.data || payload;
  const nodeCount = data?.nodes?.length || 0;
  let svgBase64 = payload.svgBase64 || data?.svgBase64;
  
  console.log('Initial svgBase64 check:', !!svgBase64);
  console.log('MermaidCode available:', !!data?.mermaidCode);
  
  // If no SVG but we have mermaid code, render it to SVG
  if (!svgBase64 && data?.mermaidCode) {
    console.log('No SVG found, rendering mermaid code to SVG for study board...');
    console.log('Mermaid code length:', data.mermaidCode.length);
    console.log('Mermaid code preview:', data.mermaidCode.substring(0, 100));
    try {
      const mermaidModule = await import('mermaid');
      const mermaid = (mermaidModule as any).default || mermaidModule;
      if (mermaid) {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        const id = 'board_' + Math.random().toString(36).slice(2, 9);
        console.log('Calling mermaid.render with id:', id);
        const { svg } = await mermaid.render(id, data.mermaidCode);
        console.log('Mermaid render returned, svg length:', svg?.length);
        
        svgBase64 = btoa(svg);
        console.log('Successfully rendered mermaid to SVG, base64 length:', svgBase64?.length);
      }
    } catch (error) {
      console.error('Failed to render mermaid for study board:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
    }
  }
  
  console.log('Final svgBase64 available:', !!svgBase64);
  
  const originX = 120;
  const originY = 160;
  const shapes: any[] = [];
  const assets: any[] = [];

  if (svgBase64) {
    const assetId = generateAssetId();
    const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;
    
    assets.push({
      id: assetId,
      type: 'image',
      typeName: 'asset',
      props: {
        name: `${title}.svg`,
        src: svgDataUri,
        w: 1600,
        h: 1200,
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
        w: 1600,
        h: 1200,
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
  console.log('=== buildShapesFromImport ===');
  console.log('Payload:', payload);
  console.log('Payload type:', typeof payload);
  console.log('Payload.kind:', payload?.kind);
  
  if (!payload || typeof payload !== 'object') {
    console.log('Invalid payload, returning empty');
    return { shapes: [], assets: [] };
  }
  
  if (payload.kind === 'mindmap') {
    console.log('Building mindmap shapes...');
    const result = await buildMindmapShapes(payload);
    console.log('Mindmap shapes result:', result);
    return result;
  }
  
  if (payload.kind === 'infographic') {
    console.log('Building infographic shapes...');
    return { shapes: buildInfographicShapes(payload.data), assets: [] };
  }
  
  console.log('Unknown payload kind, returning empty');
  return { shapes: [], assets: [] };
}
