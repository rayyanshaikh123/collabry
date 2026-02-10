// Board Template Definitions

export interface TemplateShape {
  type: string;
  typeName: string;
  x: number;
  y: number;
  props: any;
  parentId: string;
  index: string;
  rotation: number;
  isLocked: boolean;
  opacity: number;
  meta: Record<string, any>;
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'study' | 'planning' | 'brainstorm' | 'general';
  shapes: TemplateShape[];
  preview?: string;
}

// Helper to generate unique IDs
const generateId = (prefix: string = 'shape') => `${prefix}:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to create a complete geo shape with all required props
const createGeoShape = (overrides: Partial<TemplateShape> & { props: any }): TemplateShape => {
  const { text, ...restProps } = overrides.props || {};
  const richText = text ? {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }]
      }
    ]
  } : {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: []
      }
    ]
  };
  
  return {
    type: 'geo',
    typeName: 'shape',
    x: 0,
    y: 0,
    parentId: 'page:page',
    index: 'a1',
    rotation: 0,
    isLocked: false,
    opacity: 1,
    meta: {},
    ...overrides,
    props: {
      geo: 'rectangle',
      w: 200,
      h: 200,
      color: 'black',
      labelColor: 'black',
      fill: 'none',
      dash: 'draw',
      size: 'm',
      font: 'draw',
      richText,
      align: 'middle',
      verticalAlign: 'middle',
      scale: 1,
      growY: 0,
      url: '',
      ...restProps,
    },
  };
};

// Helper to create a text shape with all required props
const createTextShape = (overrides: Partial<TemplateShape> & { props: any }): TemplateShape => {
  const { text, ...restProps } = overrides.props || {};
  const richText = text ? {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }]
      }
    ]
  } : {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: []
      }
    ]
  };
  
  return {
    type: 'text',
    typeName: 'shape',
    x: 0,
    y: 0,
    parentId: 'page:page',
    index: 'a1',
    rotation: 0,
    isLocked: false,
    opacity: 1,
    meta: {},
    ...overrides,
    props: {
      richText,
      font: 'draw',
      size: 'm',
      color: 'black',
      textAlign: 'middle',
      w: 200,
      autoSize: true,
      scale: 1,
      ...restProps,
    },
  };
};

// Function to get template shapes with fresh IDs
export const getTemplateShapes = (template: BoardTemplate): any[] => {
  return template.shapes.map(shape => ({
    ...shape,
    id: generateId('shape'),
  }));
};

export const boardTemplates: BoardTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch with an empty board',
    icon: '🎨',
    category: 'general',
    shapes: [],
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: 'Organize tasks with To Do, In Progress, and Done columns',
    icon: '📋',
    category: 'planning',
    shapes: [
      createGeoShape({
        x: 100, y: 150, index: 'a1',
        props: { geo: 'rectangle', w: 250, h: 60, color: 'blue', fill: 'solid', text: '📝 To Do', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 100, y: 230, index: 'a2',
        props: { geo: 'rectangle', w: 250, h: 400, color: 'light-blue', fill: 'semi' },
      }),
      createGeoShape({
        x: 400, y: 150, index: 'a3',
        props: { geo: 'rectangle', w: 250, h: 60, color: 'yellow', fill: 'solid', text: '⚙️ In Progress', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 400, y: 230, index: 'a4',
        props: { geo: 'rectangle', w: 250, h: 400, color: 'yellow', fill: 'semi' },
      }),
      createGeoShape({
        x: 700, y: 150, index: 'a5',
        props: { geo: 'rectangle', w: 250, h: 60, color: 'green', fill: 'solid', text: '✅ Done', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 700, y: 230, index: 'a6',
        props: { geo: 'rectangle', w: 250, h: 400, color: 'light-green', fill: 'semi' },
      }),
    ],
  },
  {
    id: 'mindmap',
    name: 'Mind Map',
    description: 'Central idea with branching topics for brainstorming',
    icon: '🧠',
    category: 'brainstorm',
    shapes: [
      createGeoShape({
        x: 450, y: 350, index: 'a1',
        props: { geo: 'ellipse', w: 200, h: 120, color: 'violet', fill: 'solid', text: '💡 Main Topic', size: 'xl', font: 'sans' },
      }),
      createGeoShape({
        x: 200, y: 200, index: 'a2',
        props: { geo: 'ellipse', w: 150, h: 90, color: 'blue', fill: 'solid', text: 'Idea 1', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 700, y: 200, index: 'a3',
        props: { geo: 'ellipse', w: 150, h: 90, color: 'green', fill: 'solid', text: 'Idea 2', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 200, y: 500, index: 'a4',
        props: { geo: 'ellipse', w: 150, h: 90, color: 'orange', fill: 'solid', text: 'Idea 3', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 700, y: 500, index: 'a5',
        props: { geo: 'ellipse', w: 150, h: 90, color: 'red', fill: 'solid', text: 'Idea 4', size: 'l', font: 'sans' },
      }),
    ],
  },
  {
    id: 'study-grid',
    name: 'Study Grid',
    description: '2x2 grid for comparing concepts or taking notes',
    icon: '📚',
    category: 'study',
    shapes: [
      createTextShape({
        x: 350, y: 100, index: 'a1',
        props: { text: '📚 Study Session', font: 'sans', size: 'xl', w: 400 },
      }),
      createGeoShape({
        x: 100, y: 200, index: 'a2',
        props: { geo: 'rectangle', w: 350, h: 250, color: 'light-blue', fill: 'semi', text: '📝 Notes', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 500, y: 200, index: 'a3',
        props: { geo: 'rectangle', w: 350, h: 250, color: 'light-green', fill: 'semi', text: '💡 Key Concepts', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 100, y: 500, index: 'a4',
        props: { geo: 'rectangle', w: 350, h: 250, color: 'yellow', fill: 'semi', text: '❓ Questions', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 500, y: 500, index: 'a5',
        props: { geo: 'rectangle', w: 350, h: 250, color: 'light-red', fill: 'semi', text: '🎯 Action Items', size: 'l', font: 'sans' },
      }),
    ],
  },
  {
    id: 'flowchart',
    name: 'Flowchart',
    description: 'Process flow with decision points',
    icon: '📊',
    category: 'planning',
    shapes: [
      createGeoShape({
        x: 450, y: 100, index: 'a1',
        props: { geo: 'ellipse', w: 150, h: 80, color: 'green', fill: 'solid', text: '🚀 Start', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 425, y: 230, index: 'a2',
        props: { geo: 'rectangle', w: 200, h: 100, color: 'blue', fill: 'solid', text: 'Step 1', size: 'l', font: 'sans' },
      }),
      createGeoShape({
        x: 450, y: 380, index: 'a3',
        props: { geo: 'diamond', w: 150, h: 150, color: 'yellow', fill: 'solid', text: 'Decision?', size: 'm', font: 'sans' },
      }),
      createGeoShape({
        x: 450, y: 580, index: 'a4',
        props: { geo: 'ellipse', w: 150, h: 80, color: 'red', fill: 'solid', text: '🏁 End', size: 'l', font: 'sans' },
      }),
    ],
  },
  {
    id: 'weekly-planner',
    name: 'Weekly Planner',
    description: 'Plan your week with daily sections',
    icon: '📅',
    category: 'planning',
    shapes: [
      createTextShape({
        x: 400, y: 80, index: 'a1',
        props: { text: '📅 Weekly Study Plan', font: 'sans', size: 'xl', w: 500 },
      }),
      ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => 
        createGeoShape({
          x: 80 + (i * 150), y: 180, index: `a${i + 2}`,
          props: { geo: 'rectangle', w: 130, h: 400, color: i < 5 ? 'blue' : 'violet', fill: 'semi', text: day, size: 'l', font: 'sans' },
        })
      ),
    ],
  },
];

// Get template by ID
export const getTemplateById = (id: string): BoardTemplate | undefined => {
  return boardTemplates.find(t => t.id === id);
};

// Get templates by category
export const getTemplatesByCategory = (category: string): BoardTemplate[] => {
  return boardTemplates.filter(t => t.category === category);
};
