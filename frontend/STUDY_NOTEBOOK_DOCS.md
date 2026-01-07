# Study Notebook - Unified Learning Interface

## Overview

The Study Notebook is a unified, NotebookLM-inspired interface that combines AI chat, visual aids, and source management into a single collaborative workspace.

## Architecture

### 3-Column Layout

```
┌─────────────────────────────────────────────────────────────┐
│                        Top Bar                               │
│                   Study Notebook Title                       │
├──────────────┬──────────────────────┬──────────────────────┤
│              │                      │                       │
│   Sources    │      AI Chat         │      Studio          │
│   (Left)     │     (Center)         │     (Right)          │
│              │                      │                       │
│   - Add      │   - Messages         │   - Action Buttons   │
│   - Select   │   - Input            │   - Generated Items  │
│   - List     │   - Controls         │   - Artifact List    │
│              │                      │                       │
└──────────────┴──────────────────────┴──────────────────────┘
```

## File Structure

```
frontend/
├── app/(main)/study-notebook/
│   ├── page.tsx                 # Default redirect page
│   └── [id]/page.tsx            # Main notebook page with state management
│
└── components/study-notebook/
    ├── index.ts                 # Export all components
    ├── NotebookLayout.tsx       # 3-column layout container
    ├── SourcesPanel.tsx         # Left: Source management
    ├── ChatPanel.tsx            # Center: AI chat interface
    ├── StudioPanel.tsx          # Right: Artifact generation
    └── ArtifactViewer.tsx       # Modal for viewing artifacts
```

## Components

### 1. NotebookLayout
Main container that orchestrates the 3-column layout.

**Props:**
- Sources: management callbacks
- Chat: messaging callbacks  
- Studio: artifact generation callbacks

**Features:**
- Responsive 3-column grid
- Fixed widths for side panels (320px each)
- Flexible center panel

### 2. SourcesPanel
Left panel for managing study sources.

**Features:**
- Add source button with type selector (PDF, Text, Website, Notes)
- Source list with checkboxes
- Visual indicators for source type
- Selected source counter
- Delete functionality

**Source Types:**
- 📄 PDF Documents
- 📝 Text/Notes
- 🌐 Websites
- 📓 Rich Notes

**State:**
```typescript
interface Source {
  id: string;
  type: 'pdf' | 'text' | 'website' | 'notes';
  name: string;
  size?: string;
  dateAdded: string;
  selected: boolean;
}
```

### 3. ChatPanel
Center panel for AI-powered conversations.

**Features:**
- Message history with markdown support
- User/AI message differentiation
- Loading states
- Regenerate & Clear controls
- Multi-line input (Shift+Enter)
- Auto-scroll to bottom

**Empty States:**
- No sources: "Add a source to get started"
- Sources added: "Ready to help you study!"

**State:**
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isLoading?: boolean;
}
```

### 4. StudioPanel
Right panel for generating learning artifacts.

**Features:**
- 8 action buttons (2x4 grid)
- Generated artifact list
- Toggle to show/hide artifacts
- Generation status indicator

**Artifact Types:**
- 🎧 Audio Overview (Available)
- 🎥 Video Overview (Coming Soon)
- 🎴 Flashcards (Available)
- 📝 Quiz (Available)
- 🧠 Mind Map (Available)
- 📊 Reports (Coming Soon)
- 📈 Infographic (Coming Soon)
- 🎞️ Slide Deck (Coming Soon)

**State:**
```typescript
interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  createdAt: string;
  data?: any; // Type-specific content
}
```

### 5. ArtifactViewer
Modal component for viewing generated artifacts.

**Features:**
- Full-screen modal overlay
- Header with artifact metadata
- Content area (type-specific rendering)
- Export & Share actions
- Close button

## Data Flow

```
Sources Selected → Chat Context → Studio Generation
     ↓                  ↓                  ↓
  Context           AI Response        Artifacts
```

### State Management

Main page ([id]/page.tsx) manages all state:

```typescript
// Sources
const [sources, setSources] = useState<Source[]>([])

// Chat
const [messages, setMessages] = useState<ChatMessage[]>([])
const [isChatLoading, setIsChatLoading] = useState(false)

// Studio
const [artifacts, setArtifacts] = useState<Artifact[]>([])
const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null)
const [isGenerating, setIsGenerating] = useState(false)
```

## Integration Points

### TODO: Backend Integration

#### 1. Sources
```typescript
// Upload PDF
POST /api/notebooks/{id}/sources/pdf
FormData: { file: File }

// Add text
POST /api/notebooks/{id}/sources/text
Body: { content: string, title: string }

// Add website
POST /api/notebooks/{id}/sources/website
Body: { url: string }

// Get sources
GET /api/notebooks/{id}/sources
```

#### 2. Chat
```typescript
// Send message
POST /api/notebooks/{id}/chat
Body: { 
  message: string,
  sourceIds: string[],
  useRAG: boolean 
}

// Stream response (SSE)
GET /api/notebooks/{id}/chat/stream?message=...&sourceIds=...
```

#### 3. Artifacts
```typescript
// Generate artifact
POST /api/notebooks/{id}/artifacts
Body: {
  type: ArtifactType,
  sourceIds: string[],
  chatContext: ChatMessage[],
  options: Record<string, any>
}

// Get artifacts
GET /api/notebooks/{id}/artifacts

// Get specific artifact
GET /api/notebooks/{id}/artifacts/{artifactId}
```

## Features Comparison

### Before (Separated)
- Study Buddy: `/study-buddy` - Chat only
- Visual Aids: `/visual-aids` - Quiz/Flashcards/Mind maps

### After (Unified)
- Study Notebook: `/study-notebook/[id]`
  - ✅ Source management
  - ✅ AI chat with context
  - ✅ Artifact generation
  - ✅ All tools in one place
  - ✅ Consistent state

## Styling

Uses existing UI components:
- `Card` - Containers
- `Button` - Actions
- `Badge` - Labels
- `Input` - Text fields

Color scheme:
- Primary: Indigo (`indigo-600`, `indigo-50`)
- Success: Emerald (`emerald-500`)
- Warning: Amber (`amber-500`)
- Danger: Red (`red-500`)
- Neutral: Slate (`slate-100` to `slate-800`)

## User Experience

### Empty States
1. **No Sources**: Center message prompting to add sources
2. **No Chat**: Welcome message when sources are added
3. **No Artifacts**: Creative prompt to generate content

### Loading States
1. **Chat Loading**: Animated dots + "Thinking..." message
2. **Generating**: Spinner in Studio footer + "Generating..." text

### Interactions
1. **Source Selection**: Click card to toggle checkbox
2. **Chat Input**: Type + Enter to send, Shift+Enter for newline
3. **Artifact Generation**: Click action button → 2s generation → Added to list
4. **View Artifact**: Click list item → Opens modal viewer

## Next Steps

### Phase 1: Backend Connection
- [ ] Connect to AI engine for chat
- [ ] Implement source upload/processing
- [ ] Add artifact generation endpoints

### Phase 2: Enhanced Features
- [ ] Rich artifact viewers (flashcards flip, quiz interface, mind map viz)
- [ ] Real-time collaboration
- [ ] Source highlighting/annotation
- [ ] Export/share functionality

### Phase 3: Advanced Tools
- [ ] Audio overview generation
- [ ] Video summary creation
- [ ] Report generation
- [ ] Infographic designer
- [ ] Slide deck builder

## Migration Guide

### From Study Buddy
```typescript
// Old
import StudyBuddyNew from '@/views/StudyBuddyNew';

// New
import NotebookLayout from '@/components/study-notebook/NotebookLayout';
```

### From Visual Aids
```typescript
// Old
import VisualAidsView from '@/views/VisualAids';

// New - Artifacts are now part of Studio panel
import { StudioPanel } from '@/components/study-notebook';
```

## Routes

- `/study-notebook` - Redirects to default notebook
- `/study-notebook/[id]` - Specific notebook view
- `/study-notebook/new` - Create new notebook (TODO)

## Keyboard Shortcuts (Planned)

- `Cmd/Ctrl + K` - Focus search/chat
- `Cmd/Ctrl + N` - New notebook
- `Cmd/Ctrl + S` - Save (auto-save enabled)
- `Cmd/Ctrl + /` - Toggle sources panel
- `Escape` - Close modals

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management in modals
- Screen reader friendly messages

---

**Status**: ✅ Core Implementation Complete
**Next**: Backend Integration & Rich Artifact Viewers
