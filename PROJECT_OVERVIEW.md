# Collabry — Complete Project Overview

> **One Platform, All Your Study Needs.**
> AI-powered collaborative study workspace built for the **OpenAI Academy × NxtWave Buildathon** (AI for Education).

**Live Demo:** https://collabry-ai.vercel.app/

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Repository Structure](#4-repository-structure)
5. [Module 1: Frontend](#5-module-1-frontend)
6. [Module 2: Backend](#6-module-2-backend)
7. [Module 3: AI Engine](#7-module-3-ai-engine)
8. [Real-Time Collaboration](#8-real-time-collaboration)
9. [SaaS & Subscription System](#9-saas--subscription-system)
10. [Authentication & Security](#10-authentication--security)
11. [Gamification System](#11-gamification-system)
12. [Deployment & Environment Variables](#12-deployment--environment-variables)
13. [Database Schema Reference](#13-database-schema-reference)
14. [API Reference — All Endpoints](#14-api-reference--all-endpoints)
15. [Key Architectural Decisions](#15-key-architectural-decisions)
16. [Known Limitations](#16-known-limitations)

---

## 1. Project Summary

### The Problem
Students juggle 6–10 disconnected tools (Google Drive, Notion, ChatGPT, Todoist, Discord, Coursera, etc.). This fragmentation wastes ~30% of study time on context-switching, produces isolated AI that can't reason over the student's own materials, and leads to 60% abandonment of study plans within a week.

### The Solution
Collabry is a **unified, AI-powered study workspace** that replaces the need for separate apps by combining:

| Capability | What Collabry Provides |
|---|---|
| **AI Study Assistant** | RAG-powered chatbot that understands YOUR uploaded PDFs, notes, and documents |
| **Study Notebooks** | Upload sources → AI generates quizzes, flashcards, mind maps, summaries, infographics, and course recommendations from your content |
| **Study Boards** | Real-time collaborative whiteboards (tldraw + Yjs CRDT) — think "Figma for studying" |
| **Study Planner** | AI-generated study plans with adaptive scheduling, exam countdown mode, and strategy optimization |
| **Focus Mode** | Pomodoro timer with session tracking and productivity analytics |
| **Visual Aids** | AI-generated quizzes, mind maps, and flashcard sets with spaced repetition |
| **Social Features** | Friends, groups, direct/group chat, leaderboards |
| **Gamification** | XP, levels, streaks, 12+ badges, achievements, weekly leaderboards |
| **SaaS Model** | Freemium with Razorpay (INR) — Free / Basic (₹9/mo) / Pro (₹29/mo) / Enterprise |
| **Admin Dashboard** | Full admin panel with user management, board governance, analytics, audit logs, coupon system |

### Core Innovation
The AI doesn't just chat generically — it uses **Retrieval-Augmented Generation (RAG)** over the student's own uploaded materials. When a student asks "explain the photoelectric effect," the AI retrieves relevant chunks from their uploaded physics PDF, grounds its answer in that specific textbook, and can generate quizzes/flashcards/mind maps from that same source material.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                              │
│  Next.js 16 / React 19 / Tailwind v4 / tldraw v4 / Zustand / RQ   │
│  Port 3000                                                          │
└──────────┬─────────────────┬──────────────────┬─────────────────────┘
           │ HTTP/REST        │ Socket.IO         │ WebSocket (Yjs)
           ▼                  ▼                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       NODE.JS BACKEND                                │
│  Express 5 / Mongoose 9 / Socket.IO 4 / Yjs + ws                    │
│  Port 5000                                                           │
│                                                                      │
│  ┌────────────┐ ┌───────────┐ ┌────────────┐ ┌───────────────────┐  │
│  │ REST API   │ │ Socket.IO │ │ Yjs WS     │ │ Cron Workers      │  │
│  │ (23 route  │ │ (4 name-  │ │ (board     │ │ • Recycle cleanup  │  │
│  │  groups)   │ │  spaces)  │ │  CRDT sync)│ │ • Sub expiry       │  │
│  └─────┬──────┘ └───────────┘ └─────┬──────┘ │ • Task reminders   │  │
│        │                             │        └───────────────────┘  │
│        ▼                             ▼                               │
│  ┌──────────────────────────────────────────┐                       │
│  │           MongoDB Atlas                   │                       │
│  │  (26+ collections, Yjs state stored as   │                       │
│  │   Buffer, refresh tokens, audit logs)     │                       │
│  └──────────────────────────────────────────┘                       │
│        │                                                             │
│        │ HTTP proxy (/api/ai/* → AI Engine)                          │
└────────┼─────────────────────────────────────────────────────────────┘
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       PYTHON AI ENGINE                               │
│  FastAPI / LangChain / LangGraph / OpenAI / FAISS                    │
│  Port 8000                                                           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Agent Pipeline (Linear, NOT ReAct):                         │   │
│  │  User → Router LLM → Validator → Tool/Retrieval → Formatter │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ ┌───────────────┐  │
│  │ FAISS    │ │ MongoDB  │ │ Redis (optional) │ │ 9 AI Tools    │  │
│  │ (vectors)│ │ (convos) │ │ (rate limit,     │ │ (quiz, flash- │  │
│  │          │ │          │ │  cache, sessions) │ │  cards, etc.) │  │
│  └──────────┘ └──────────┘ └──────────────────┘ └───────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Frontend** makes all API calls to the **Backend** (`/api/*`).
2. **Backend** handles auth, business logic, database operations, and real-time communication.
3. AI requests (`/api/ai/*`) are **proxied** by the Backend to the **AI Engine** (port 8000) with the user's JWT forwarded.
4. **Whiteboard collaboration** uses a separate **Yjs WebSocket** connection (raw `ws://`) for CRDT sync, bypassing Socket.IO entirely.
5. **Chat, notifications, and notebook collaboration** use **Socket.IO** namespaces on the same HTTP server.

---

## 3. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.1 | App Router, SSR, file-based routing |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | new-york variant | Component primitives (Radix-based) |
| tldraw | 4.2.3 | Collaborative whiteboard/drawing |
| Yjs + y-websocket | 13.6.29 / 3.0.0 | CRDT for real-time board sync |
| Zustand | 5.0.9 | Client state management (5 stores) |
| TanStack React Query | 5.x | Server state management |
| Socket.IO Client | 4.8.3 | Real-time events (chat, notifications) |
| Axios | 1.13.2 | HTTP client with interceptors |
| Recharts | 3.6.0 | Charts and analytics |
| Mermaid | 11.12.2 | Diagram rendering (mind maps) |
| Framer Motion | 12.x | Animations |
| LiveKit Components React | 2.9.19 | Video/audio for AI classroom |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Express | 5.2.1 | Web framework |
| Mongoose | 9.1.1 | MongoDB ODM |
| Socket.IO | 4.8.3 | WebSocket (chat, notifications, presence) |
| ws | 8.19.0 | Raw WebSocket for Yjs board sync |
| Yjs | 13.6.29 | CRDT collaboration framework |
| y-websocket | 3.0.0 | Yjs WebSocket transport |
| jsonwebtoken | 9.0.3 | JWT authentication |
| Razorpay | 2.9.6 | Payment gateway (INR) |
| Resend | 6.9.2 | Transactional email |
| Redis | 4.7.1 | Rate limiting, caching (optional) |
| node-cron | 4.2.1 | Scheduled jobs |
| PDFKit | 0.17.2 | Invoice PDF generation |
| Helmet | 8.1.0 | Security headers |
| Multer | 2.0.2 | File uploads |

### AI Engine
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.115.0 | Async web framework |
| Uvicorn | — | ASGI server |
| OpenAI SDK | 1.54.0 | LLM provider (GPT-4o-mini default) |
| LangChain | 0.3.15 | LLM orchestration |
| LangGraph | — | Agent state management |
| FAISS | — | Vector similarity search |
| pymongo | 4.8.0 | MongoDB for conversations |
| python-jose | — | JWT verification |
| pypdf / python-docx | — | Document parsing |

### Infrastructure
| Service | Purpose |
|---|---|
| MongoDB Atlas | Primary database (cluster0.sunt7fe.mongodb.net) |
| Redis | Rate limiting, session state caching, AI response caching |
| Vercel | Frontend hosting |
| Render / Railway | Backend + AI Engine hosting |
| Razorpay | Payment processing (INR) |
| Resend | Transactional email delivery |

---

## 4. Repository Structure

```
collabry/
├── frontend/          # Next.js 16 app (port 3000)
│   ├── app/           # App Router pages (3 route groups: auth, main, admin)
│   ├── views/         # Page-level view components (16 files)
│   ├── components/    # Reusable UI components (~80 files)
│   ├── hooks/         # Custom React hooks (19 files)
│   ├── lib/           # API client, stores, services, utils
│   │   ├── stores/    # 5 Zustand stores
│   │   ├── services/  # 24 API service files
│   │   └── guards/    # AuthGuard, RoleGuard
│   └── types/         # TypeScript type definitions (8 files)
│
├── backend/           # Express 5 server (port 5000)
│   └── src/
│       ├── config/    # DB, env, plans, Razorpay, Redis configs
│       ├── models/    # 22+ Mongoose models
│       ├── routes/    # 23 route groups
│       ├── controllers/ # 32 controller files
│       ├── services/  # 27 service files + strategies/
│       ├── middlewares/ # Auth, CSRF, rate limiting, validation
│       ├── middleware/  # Usage enforcement, subscription checks
│       ├── socket/    # Socket.IO (4 namespaces) + Yjs WebSocket
│       ├── jobs/      # Cron jobs (cleanup, expiry)
│       ├── workers/   # Standalone cron worker
│       └── utils/     # JWT, email, encryption, logging
│
├── ai-engine/         # FastAPI Python service (port 8000)
│   ├── core/          # Agent, router, LLM, memory, embeddings, RAG
│   │   ├── verification/ # Verified knowledge pipeline (8 files)
│   │   └── verified_knowledge/ # Verified KB store & ingestion
│   ├── server/        # FastAPI app, middleware, routes, schemas
│   │   └── routes/    # 10 route files
│   ├── tools/         # 9 AI tools (quiz, flashcards, mindmap, etc.)
│   └── rag/           # Vector store, retriever, ingestion pipeline
│
└── meet/              # (Planned) LiveKit-based video study rooms
```

---

## 5. Module 1: Frontend

### 5.1 App Router Structure

The frontend uses Next.js App Router with three route groups:

| Route Group | Layout | Purpose |
|---|---|---|
| `(auth)` | Centered, no sidebar | Login, register, forgot/reset password, email verification |
| `(main)` | Sidebar + top nav | All protected student/mentor pages |
| `(admin)` | Admin sidebar + RoleGuard | Admin dashboard |

### 5.2 All Routes

| Path | Auth | Description |
|---|---|---|
| `/` | No | Marketing landing page |
| `/login` | No | Login form |
| `/register` | No | Registration form |
| `/verify-email` | No | Email verification |
| `/forgot-password` | No | Password reset request |
| `/reset-password` | No | Password reset form |
| `/role-selection` | No | Student vs Admin path |
| `/dashboard` | Yes | Main dashboard with stats, leaderboard, today's tasks |
| `/study-board` | Yes | Board listing (search, archive, duplicate, create) |
| `/study-board/[id]` | Yes | tldraw whiteboard editor (real-time collab via Yjs) |
| `/study-notebook` | Yes | Notebook listing |
| `/study-notebook/[id]` | Yes | AI notebook editor (sources, chat, artifacts) |
| `/planner` | Yes | Study planner with AI generation, calendar, strategy panel |
| `/flashcards` | Yes | Flashcard sets with spaced repetition |
| `/focus` | Yes | Pomodoro timer with productivity stats |
| `/visual-aids` | Yes | Quizzes, mind maps, flashcard management |
| `/study-buddy` | Yes | AI chat assistant (multi-mode: chat, summarize, QA, mindmap) |
| `/social` | Yes | Friends, groups, direct/group chat |
| `/profile` | Yes | User profile, badges, achievements |
| `/settings` | Yes | BYOK API key management |
| `/usage` | Yes | Usage analytics and plan limits |
| `/subscription` | Yes | Subscription management |
| `/pricing` | Yes | Pricing plans with Razorpay checkout |
| `/recycle-bin` | Yes | Soft-deleted items (30-day retention) |
| `/notifications` | — | Notification history |
| `/admin` | Admin | Admin dashboard (tabbed: users, boards, reports, analytics, settings) |

### 5.3 State Management

**5 Zustand Stores:**

| Store | Key State | Persistence |
|---|---|---|
| `auth.store` | user, accessToken, csrfToken, isAuthenticated | user + isAuthenticated (localStorage) |
| `ui.store` | theme, darkMode, sidebar state, modals, alerts | theme, darkMode, sidebar (localStorage) |
| `studyBoard.store` | currentBoard, boards[], participants, cursors, syncStatus | None |
| `focusMode.store` | activeSession, settings, stats, timer state | None |
| `collaboration.store` | connected, usersOnline, currentRoom, syncStatus | None |

**Server State:** TanStack React Query (5min stale, 10min cache, 1 retry)

### 5.4 API Client Architecture

- **Axios-based** `ApiClient` class with interceptors
- **Access token** stored in Zustand memory (NOT localStorage)
- **Refresh token** in httpOnly cookie
- **CSRF token** in header (`x-csrf-token`) via double-submit cookie pattern
- **Auto-refresh:** On 401, queues concurrent requests, refreshes token, retries all queued
- **Base URL:** `NEXT_PUBLIC_API_BASE_URL` (default: backend on Render)

### 5.5 Key Views (Page Components)

| View | Lines | Description |
|---|---|---|
| `StudyBuddyNew.tsx` | 1376 | AI chat with multi-mode (chat/summarize/QA/mindmap), session management, streaming |
| `PlannerNew.tsx` | 1399 | Full study planner with AI generation, calendar, tasks, events, strategy panel |
| `Admin.tsx` | 896 | Tabbed admin: users, boards, reports, deep analytics, settings, coupons, audit logs |
| `VisualAids.tsx` | 867 | Quiz/mindmap/flashcard management with AI generation and "send to board" |
| `Usage.tsx` | 661 | Usage analytics with charts (Recharts: area, pie, bar) |
| `Profile.tsx` | 560 | Profile editing, badges, achievements |
| `Pricing.tsx` | 484 | Subscription plans with Razorpay integration |
| `StudyBoardNew.tsx` | 440 | tldraw whiteboard with Yjs sync, viewer readonly, AI import |

### 5.6 Hooks (19 Custom Hooks)

| Hook | Purpose |
|---|---|
| `useAuth` | Auth state + login/register/logout mutations |
| `useAI` | AI engine operations (chat, summarize, QA, mindmap) |
| `useYjsSync` | CRDT sync between tldraw and Yjs WebSocket (shapes, assets, bindings, cursors) |
| `useNotebookChat` | SSE streaming AI chat within notebooks |
| `useNotebookCollab` | Real-time notebook collaboration via Socket.IO |
| `useStudyPlanner` | Full planner CRUD with React Query (largest hook, 477 lines) |
| `useVisualAids` | Flashcards, quizzes, mind maps CRUD + AI generation |
| `useFocusMode` | Pomodoro timer + session CRUD |
| `useCollaboration` | Socket presence + room management |
| `useNotebook` | Notebook CRUD + sources + artifacts + invitations |
| `useSessions` | Study buddy chat session management |
| `useBoardShapes` | Build tldraw shapes from AI data (mind maps, infographics) |
| `useNotifications` | Notification queries + real-time socket |
| `usePlannerHandlers` | Planner action handlers (AI gen, task CRUD) |
| `useArtifactGenerator` | Generate artifacts from notebook sources |
| `useStudioSave` | Save artifacts to notebook |
| `useScheduledClasses` | AI classroom scheduling (LiveKit) |
| `useAlert` | Local alert modal state |
| `use-toast` | shadcn toast reducer |

### 5.7 Services (24 Files)

Each service wraps the API client for a specific domain. Key services:

| Service | Methods |
|---|---|
| `studyPlanner.service` (970 lines) | Plans CRUD, tasks CRUD, events, AI generation, strategies, analytics |
| `visualAids.service` (414 lines) | Flashcards (sets + cards), mind maps (+ versions), quizzes (+ attempts), subjects, AI generation |
| `aiEngine.service` (316 lines) | Chat (streaming/non-streaming), summarize, QA, quiz/flashcard/mindmap generation, document ingestion |
| `notebook.service` | Notebooks CRUD, sources, artifacts, collaboration, share links, invitations |
| `studyBoard.service` | Boards CRUD, search, members, archive, duplicate, thumbnails |
| `auth.service` | Login, register, logout, refresh, profile, password, verification, sessions |

---

## 6. Module 2: Backend

### 6.1 Server Architecture

- **Entry:** `src/server.js` creates HTTP server, connects to MongoDB, initializes Redis (optional), Socket.IO, and Yjs WebSocket.
- **App:** `src/app.js` — Express middleware stack (see section 10 for security middleware order).
- **Graceful shutdown:** Handles SIGTERM/SIGINT, closes HTTP, Socket.IO, Redis, MongoDB.

### 6.2 All Route Groups (23)

| # | Prefix | Routes | Auth | Key Features |
|---|---|---|---|---|
| 1 | `/health` | 2 | No | Health + readiness checks |
| 2 | `/api/auth` | 11 | Mixed | Register, login, refresh, logout, password reset, email verification, sessions |
| 3 | `/api/users` | 4 | Yes | Profile CRUD, change password, delete account |
| 4 | `/api/admin` | 35+ | Admin | Dashboard, user CRUD, board governance, reports, deep analytics, audit logs, notifications, subscriptions, coupons |
| 5 | `/api/boards` | 12 | Yes | Board CRUD, members, invite, archive, duplicate, search |
| 6 | `/api/ai` | 25+ | Mixed | Proxy to AI Engine with usage tracking & limits |
| 7 | `/api/notebook` | 22 | Yes | Notebook CRUD, sources (upload), artifacts, collaboration, invitations, share links |
| 8 | `/api/study-planner` | 40+ | Yes | Plans CRUD, tasks CRUD, events, analytics, exam mode, strategies, auto-schedule, behavior profiles, heatmaps |
| 9 | `/api/friends` | 11 | Yes | Friend requests, friendships, block/unblock, search |
| 10 | `/api/groups` | 12 | Yes | Group CRUD, members, admins, invite codes |
| 11 | `/api/chat` | 7 | Yes | Send/get/edit/delete messages, conversations, mark read |
| 12 | `/api/notifications` | 7 | Yes | Notification CRUD, read/unread management |
| 13 | `/api/subscriptions` | 8 | Mixed | Plans (public), subscription management, Razorpay integration |
| 14 | `/api/webhooks` | 1 | No | Razorpay webhook (raw body, signature verification) |
| 15 | `/api/invoices` | 4 | Yes | Generate, email, download PDF invoices |
| 16 | `/api/usage` | 5 | Mixed | Usage summary, history, limits, reset time |
| 17 | `/api/coupons` | 11 | Mixed | Validate (public), admin CRUD, campaigns, stats |
| 18 | `/api/gamification` | 5 | Yes | Stats, personal progress, leaderboard, friend leaderboard, admin XP award |
| 19 | `/api/focus` | 11 | Yes | Pomodoro sessions CRUD, settings, stats |
| 20 | `/api/recycle-bin` | 4 | Yes | List, restore, permanent delete, empty |
| 21 | `/api/reports` | 8 | Mixed | Create (user), admin: list, review, resolve, dismiss |
| 22 | `/api/visual-aids` | 20+ | Yes | Mind maps (CRUD + versioning), quizzes (CRUD + attempts + stats + from-flashcards), subjects, AI generation |
| 23 | `/api/apikeys` | 6 | Yes | BYOK API key CRUD, validation, settings |

### 6.3 Controllers (32 Files)

Every route group has a dedicated controller. Notable controllers:
- `studyPlan.controller.js` — Plans, analytics, exam mode, strategies, auto-schedule, heatmap, behavior profile
- `studyTask.controller.js` — Tasks, completion, rescheduling, adaptive reschedule
- `admin.controller.js` — Full admin dashboard, user management, board governance, platform settings
- `board.controller.js` — Board CRUD, members, invite (validates registered users), archive, duplicate, search

### 6.4 Services (27 Files + Strategy Pattern)

Key services:
- `subscription.service.js` — Razorpay order creation, payment verification, subscription lifecycle
- `gamification.service.js` — XP awards, leveling formula, badge checks, streak management, leaderboards
- `invoice.service.js` — PDF generation with PDFKit
- `adaptiveScheduling.service.js` — Reschedule missed/overdue tasks intelligently
- `behaviorLearning.service.js` — Analyze study patterns → UserBehaviorProfile
- `schedulerEngine.service.js` + `slotEngine.service.js` — Time-block allocation for study plans

**Strategy Pattern (7 files in `services/strategies/`):**
- `BalancedStrategy` — Default balanced scheduling
- `AdaptiveStrategy` — Uses behavior data for optimization
- `EmergencyStrategy` — Exam crunch time mode
- `StrategyFactory` — Selects strategy based on context
- `PlannerModeResolver` — Resolves which mode/strategy to use

### 6.5 Socket Architecture (7 Files)

| File | Namespace/Protocol | Purpose |
|---|---|---|
| `socket/index.js` | `/` (base) | Initializes Socket.IO, sets up all namespaces |
| `socket/boardNamespace.js` | `/boards` | JWT auth, element CRUD, cursor movement, presence (rate-limited: 60 mutations/sec, 30 cursor/sec) |
| `socket/chatNamespace.js` | `/chat` | DM/group messaging, typing indicators, read receipts |
| `socket/notificationNamespace.js` | `/notifications` | Real-time notification delivery, unread count |
| `socket/notebookCollabNamespace.js` | `/notebook-collab` | Notebook collaboration (typing, AI tokens, chat messages) |
| `socket/yjsServer.js` | WebSocket `/yjs/{boardId}` | Raw WebSocket (NOT Socket.IO) for Yjs CRDT board sync |
| `socket/yjsPersistence.js` | — | Custom Yjs persistence: debounced save to MongoDB, legacy migration, shapeCount tracking |

### 6.6 Cron Jobs (3)

| Job | Schedule | Purpose |
|---|---|---|
| Recycle Bin Cleanup | Daily 00:00 UTC | Permanently delete items with `deletedAt > 30 days` |
| Subscription Expiry | Hourly | Downgrade expired subscriptions (3-day grace), auto-archive excess boards |
| Notification Scheduler | Configurable | Task reminders, streak alerts |

---

## 7. Module 3: AI Engine

### 7.1 Agent Architecture

The AI Engine uses a **linear pipeline** (not ReAct):

```
User Message
  → Router LLM (GPT-4o-mini: decides action, task type, retrieval policy/mode)
  → Retrieval Validator (pure Python rule engine — corrects routing plan)
  → Tool Execution OR Hybrid Retrieval + Conversation
  → Response Manager (coerces output to frontend-expected JSON schema)
  → SSE stream back to client
```

### 7.2 Router Decisions

The Router LLM classifies each message into:

| Dimension | Options |
|---|---|
| **Action** | `START_TASK`, `MODIFY_PARAM`, `ASK_ARTIFACT`, `ANSWER_GENERAL`, `CLARIFY` |
| **Task** | `QUIZ`, `FLASHCARDS`, `MINDMAP`, `SUMMARY`, `STUDY_PLAN`, `COURSE_SEARCH`, `NONE` |
| **Retrieval Policy** | `STRICT_SELECTED` (only selected sources), `PREFER_SELECTED` (prefer selected, expand if needed), `AUTO_EXPAND` (auto-select sources), `GLOBAL` (all user docs) |
| **Retrieval Mode** | `CHUNK_SEARCH` (FAISS similarity search), `FULL_DOCUMENT` (fetch entire source from backend), `MULTI_DOC_SYNTHESIS` (combine multiple sources), `NONE` |

### 7.3 AI Tools (9 Registered)

| Tool | Output | Key Feature |
|---|---|---|
| `search_web` | Formatted text with links | Serper → Tavily → fallback URLs |
| `search_sources` | Source excerpts grouped by file | FAISS search with user/notebook/source filtering |
| `summarize_notes` | Markdown summary | Hybrid context retrieval + LLM summarization |
| `generate_quiz` | JSON: `{questions: [{question, options, correct_answer, explanation}]}` | Multi-choice from RAG context |
| `generate_flashcards` | JSON: `{cards: [{front, back, tags}]}` | Spaced-repetition-ready |
| `generate_mindmap` | JSON tree: `{id, label, children}` | Hierarchical concept maps |
| `generate_study_plan` | JSON: `{tasks: [{day, title, duration, topics, goals}], milestones}` | Duration 1–90 days, 0.5–12 hrs/day |
| `generate_report` | Pure Markdown | Comprehensive study reports |
| `generate_infographic` | JSON: `{sections: [{type, title, items}]}` | Stats, timeline, comparison sections |

### 7.4 RAG Pipeline

```
Document Upload (PDF/DOCX/TXT/MD)
  → Text Extraction (pypdf / python-docx)
  → Chunking (RecursiveCharacterTextSplitter, 1000 chars, 200 overlap)
  → Embedding (OpenAI text-embedding-3-small)
  → FAISS Index (with metadata: user_id, notebook_id, source_id)
  → Retrieval (similarity search with user isolation + source filtering)
```

**Key properties:**
- **User isolation:** Every document is tagged with `user_id`. Queries are filtered to only retrieve the requesting user's documents.
- **Source filtering:** Can filter by `notebook_id` and specific `source_ids`.
- **Over-retrieval:** FAISS doesn't support native metadata filtering, so the system over-retrieves (k×50 for filtered queries) and post-filters.
- **Fallback:** If notebook filter returns 0 results, retries user-wide with strict source_id enforcement.

### 7.5 Verified Knowledge System

A multi-phase pipeline for fact-checked study assistance:

```
Query → User RAG Retrieval → Draft Answer (LLM #1)
  → Claim Extraction (regex + LLM #2)
  → Batch Verification against Verified KB (FAISS similarity, no LLM)
  → Deterministic Validation (arithmetic via SymPy, consistency checks, misinformation patterns)
  → Confidence Scoring (weighted formula, 0–100)
  → Response Formatting (LLM #3, optional)
```

**Confidence formula:**
$$\text{score} = 0.35 \times \text{verified} + 0.25 \times \text{authority} + 0.15 \times \text{consistency} + 0.10 \times \text{arithmetic} + 0.10 \times (1 - \text{misinfo}) + 0.05 \times \text{coverage}$$

### 7.6 Multi-Provider LLM Support

| Provider | Models | Config |
|---|---|---|
| OpenAI (default) | GPT-4o-mini, GPT-4o | `OPENAI_API_KEY` + `OPENAI_BASE_URL` |
| Groq | LLaMA models | Via `LLM_PROVIDER=groq` |
| Ollama | Local models | Via `LLM_PROVIDER=ollama` |
| Together AI | Open-source models | Via `LLM_PROVIDER=together` |

**BYOK (Bring Your Own Key):** Users can configure their own API keys through the settings page. Keys are encrypted with AES-256-GCM (per-user PBKDF2 key derivation) and forwarded to the AI engine via headers.

### 7.7 All AI Engine Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health`, `/ready` | No | Health + readiness |
| POST | `/ai/chat` | Yes | Non-streaming chat |
| POST | `/ai/chat/stream` | Yes | SSE streaming chat |
| GET/POST | `/ai/sessions/*/chat/stream` | Yes | Session-scoped streaming |
| CRUD | `/ai/sessions/*` | Yes | Session management |
| POST | `/ai/upload` | Yes | Document ingestion (PDF/DOCX/TXT/MD) |
| POST | `/ai/summarize[/stream]` | Yes | Text summarization |
| POST | `/ai/qa[/stream]` | Yes | RAG-based Q&A |
| POST | `/ai/qa/generate[/stream]` | Yes | Quiz generation from sources |
| POST | `/ai/mindmap/render` | Yes | JSON → Mermaid/SVG rendering |
| GET | `/ai/usage/*` | Mixed | Usage statistics |
| POST | `/ai/generate-study-plan` | Yes | AI study plan generation |
| POST | `/ai/v2/planning-strategy` | Yes | Strategy-only (no timestamps) |
| CRUD | `/verified-knowledge/*` | Yes | Verified KB ingestion (URL/text/PDF) |

---

## 8. Real-Time Collaboration

### 8.1 Study Board (Yjs CRDT)

The whiteboard uses **Yjs** for conflict-free real-time collaboration:

| Component | Technology | Role |
|---|---|---|
| Editor | tldraw v4.2.3 | Whiteboard rendering + user interaction |
| CRDT | Yjs | Shared data structures (Y.Map for shapes, assets, bindings) |
| Transport | y-websocket + raw `ws` | Binary WebSocket protocol |
| Persistence | Custom `yjsPersistence.js` | Debounced save to MongoDB (2s), `Board.yjsState` Buffer field |
| Cursors | Yjs Awareness protocol | Broadcast cursor positions in page-space coordinates |

**Synced types:** `shape:*`, `asset:*`, `binding:*` — all stored in a single Y.Map.

**Viewer enforcement:** Viewers get `isReadonly: true` on the tldraw editor instance. Invite/settings/export buttons are hidden for viewers. The `allowExport` board setting is also enforced.

### 8.2 Chat & Notifications (Socket.IO)

| Namespace | Events | Auth |
|---|---|---|
| `/chat` | `join:conversation`, `message:send`, `typing:start/stop`, `message:edit/delete`, `messages:mark-read` | JWT handshake |
| `/notifications` | `mark-as-read`, `mark-all-read` | JWT handshake |
| `/notebook-collab` | `notebook:join`, `user:typing`, `source:update`, `ai:token`, `chat:message` | JWT handshake |
| `/boards` | `board:join/leave`, element CRUD, `cursor:move`, presence | JWT per-namespace |

### 8.3 Notebook Collaboration

Notebooks support real-time collaboration through Socket.IO:
- Multiple users can view/edit the same notebook
- AI chat responses are streamed to all participants via `ai:token` events
- Typing indicators and presence tracking
- Role-based permissions (owner/editor/viewer) with granular capabilities

---

## 9. SaaS & Subscription System

### 9.1 Plan Tiers

| Feature | Free | Basic (₹9/mo) | Pro (₹29/mo) | Enterprise (₹99,999) |
|---|---|---|---|---|
| AI Questions/Day | 10 | 100 | Unlimited | Unlimited |
| Study Boards | 1 | 5 | Unlimited | Unlimited |
| Notebooks | 3 | 20 | Unlimited | Unlimited |
| Group Members | 5 | 20 | 50 | Unlimited |
| Storage | 100 MB | 5 GB | 50 GB | 500 GB |
| File Uploads/Day | 5 | 50 | Unlimited | Unlimited |

### 9.2 Enforcement Points

**Every limit is enforced in middleware:**

| Limit | Enforcement Location |
|---|---|
| `aiQuestionsPerDay` | `checkAIUsageLimit` — atomic `findOneAndUpdate` with `$lt` condition (prevents race conditions) |
| `boards` | `checkBoardLimit` — counts non-deleted, non-archived boards |
| `notebooks` | `checkNotebookLimit` — counts non-deleted notebooks |
| `storageGB` | `checkStorageLimit` — checks `User.storageUsed` |
| `fileUploadsPerDay` | `checkFileUploadLimit` — checks daily Usage document |

**BYOK bypass:** Users with their own API keys (`byokSettings.enabled && activeProvider`) bypass `checkAIUsageLimit`.

### 9.3 Payment Flow

```
User selects plan → Frontend calls POST /api/subscriptions/create-order
  → Backend creates Razorpay order
  → Frontend opens Razorpay checkout modal
  → User pays → Frontend calls POST /api/subscriptions/verify-payment
  → Backend verifies signature, activates subscription, updates User.subscriptionTier
  → Razorpay webhook (POST /api/webhooks/razorpay) handles async events
```

### 9.4 Subscription Lifecycle

- **Expiry:** Hourly cron checks `currentPeriodEnd + 3 days grace`. Downgrades to free on expiry.
- **Downgrade enforcement:** `enforceDowngradeLimits()` auto-archives excess boards beyond the new plan's limit (keeps N most-recently-active).
- **Cancellation:** Sets `cancelAtPeriodEnd: true`. Access continues until period ends.
- **Reactivation:** Possible if still within period.

### 9.5 Coupon System

- Percentage or fixed discounts
- Per-plan applicability
- Max usage (total + per user)
- Campaign tracking
- First-time-only option
- Admin CRUD + bulk creation

---

## 10. Authentication & Security

### 10.1 Auth Flow

```
Register → Email verification (Resend) → Login
  → Access token (JWT, 15min) + Refresh token (httpOnly cookie, 7d)
  → Every request: Authorization header + x-csrf-token header
  → On 401: Auto-refresh via /api/auth/refresh → retry original request
```

### 10.2 Token Architecture

| Token | Storage | TTL | Purpose |
|---|---|---|---|
| Access Token | Zustand memory (NOT localStorage) | 15 min | API authorization |
| Refresh Token | httpOnly secure cookie | 7 days | Token renewal |
| CSRF Token | Double-submit cookie + header | Session | Prevent CSRF attacks |

**Refresh tokens** are stored in MongoDB as SHA-256 hashes with `jti` (unique ID), `family` (rotation chain), and `expiresAt` (TTL auto-delete). Token rotation + family tracking prevents reuse attacks.

### 10.3 Middleware Stack (Order Matters)

1. CORS (dynamic origin validation)
2. Helmet (CSP, security headers)
3. Global rate limiter (100/15min production)
4. **Webhook routes** (mounted BEFORE `express.json` — needs raw body)
5. Cookie parser
6. JSON body parser (50MB limit)
7. URL-encoded parser (50MB limit)
8. Morgan logger
9. CSRF protection (double-submit cookie)
10. Route mounting
11. 404 handler
12. Global error handler

### 10.4 Rate Limiting

| Limiter | Config (Production) | Scope |
|---|---|---|
| Global | 100 req/15min | All `/api/` routes |
| Auth | 5 req/15min | `/api/auth/*` (keyed by IP+email) |
| Coupon | 20 req/hour | `/api/coupons/validate` |
| AI Engine | Configurable per-user via Redis | `/ai/*` endpoints |
| Board Socket | 60 mutations/sec, 30 cursor/sec | Socket.IO board namespace |

### 10.5 AI Engine Security

| Layer | What It Does |
|---|---|
| Prompt injection filtering | Sanitizes conversation history, detects injection patterns |
| Router Pydantic validation | Validates all router outputs with strict schema |
| Parameter validation | Dangerous pattern detection, length limits, type validation |
| Source boundary validation | Prevents cross-user document access |
| Vector store hardening | Input validation, metadata sanitization, content size limits (50KB/doc, 1000 docs) |
| BYOK encryption | AES-256-GCM with per-user PBKDF2 key derivation |

---

## 11. Gamification System

### 11.1 XP & Leveling

- **XP Sources:** Task completion, study sessions, quiz scores, streak maintenance, board activity
- **Level Formula:** Progressive XP requirements per level
- **Weekly snapshots:** Track weekly progress for comparisons

### 11.2 Achievements & Badges

12+ badges with progress tracking (e.g., "Complete 10 tasks", "7-day streak", "First quiz perfect score").

### 11.3 Leaderboards

- **Global leaderboard:** All users ranked by XP
- **Friend leaderboard:** Only friends, encourages healthy competition
- **Weekly reset tracking:** Weekly history with snapshots

### 11.4 Streaks

- Current streak + longest streak
- `lastStudyDate` tracking
- Streak-based notifications via cron scheduler
- Streak reliability factored into behavior profile

---

## 12. Deployment & Environment Variables

### 12.1 Deployment Targets

| Module | Platform | URL |
|---|---|---|
| Frontend | Vercel | `collabry-ai.vercel.app` |
| Backend | Render | `colab-back.onrender.com` |
| AI Engine | Render / Railway | Proxied via backend |
| Database | MongoDB Atlas | `cluster0.sunt7fe.mongodb.net` |

### 12.2 Backend Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | — | `development` or `production` |
| `PORT` | No | 5000 | Server port |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `REDIS_URL` | No | — | Redis for rate limiting (optional) |
| `AI_ENGINE_URL` | No | `http://localhost:8000` | AI engine URL |
| `JWT_ACCESS_SECRET` | **Yes** | — | JWT access token secret |
| `JWT_REFRESH_SECRET` | **Yes** | — | JWT refresh token secret |
| `JWT_ACCESS_EXPIRES_IN` | No | 15m | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | 7d | Refresh token TTL |
| `ENCRYPTION_MASTER_KEY` | No | — | AES-256-GCM for BYOK (64 hex chars) |
| `FRONTEND_URL` | No | — | Frontend URL for email links |
| `RAZORPAY_KEY_ID` | No | — | Razorpay key |
| `RAZORPAY_KEY_SECRET` | No | — | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | No | — | Webhook signature verification |
| `RESEND_API_KEY` | No | — | Email delivery |
| `CORS_ORIGIN` | No | — | Allowed origins (comma-separated) |

### 12.3 AI Engine Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | **Yes** | — | OpenAI API key |
| `LLM_MODEL` | No | `gpt-4o-mini` | Default LLM model |
| `LLM_PROVIDER` | No | `openai` | Provider: openai/groq/ollama/together |
| `OPENAI_BASE_URL` | No | — | Custom base URL for LLM |
| `EMBEDDING_MODEL` | No | `text-embedding-3-small` | Embedding model |
| `VECTOR_STORE` | No | `faiss` | Vector store: faiss/chroma/pinecone/qdrant |
| `MONGODB_URI` | **Yes** | — | MongoDB for conversations |
| `REDIS_URL` | No | — | Caching, rate limiting, session state |
| `JWT_SECRET_KEY` | **Yes** | — | JWT verification (must match backend) |
| `BACKEND_URL` | No | — | Backend URL for API calls |
| `HOST` | No | `0.0.0.0` | Bind address |
| `PORT` | No | 8000 | Server port |

### 12.4 Frontend Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | No | `https://colab-back.onrender.com/api` | Backend API URL |

---

## 13. Database Schema Reference

### 13.1 Core Models

| Model | Collection | Key Fields | Indexes |
|---|---|---|---|
| **User** | users | name, email, password, role(student/admin/mentor), subscriptionTier, storageUsed, gamification{xp, level, streak, badges, achievements}, apiKeys(Map), byokSettings | email(unique) |
| **Board** | boards | title, description, owner, members[{userId, role}], elements[], yjsState(Buffer), settings{bg, grid, allowComments, allowExport}, thumbnail, tags, isArchived, shapeCount, deletedAt | owner+createdAt, members.userId, text(title+description) |
| **Notebook** | notebooks | userId, title, sources[{type, content, filePath}], aiSessionId, artifacts[{type, referenceId, data}], collaborators[{userId, role, permissions}], shareCode, settings | userId+createdAt, collaborators.userId |
| **Subscription** | subscriptions | user(unique), plan, status, razorpay IDs, currentPeriodStart/End, amount, currency, interval | |
| **Payment** | payments | user, subscription, razorpay_payment_id(unique), amount, status, method, couponCode, discountApplied | |

### 13.2 Study & Planning Models

| Model | Key Fields |
|---|---|
| **StudyPlan** | userId, title, subject, topics, startDate/endDate, dailyStudyHours, planType, examMode, currentExamPhase, adaptiveMetadata, weeklyTimetableBlocks |
| **StudyTask** | planId, userId, title, scheduledDate, duration, priority, difficulty, status, completionNotes, difficultyRating, understandingLevel |
| **StudyEvent** | userId, planId, taskId, title, startTime/endTime, energyTag, type(deep_work/practice/review/exam_prep), deepWork, aiGenerated |
| **DailyStudyStats** | userId, date, totalStudyMinutes, tasksCompleted, focusSessionsCount, intensityScore, hourlyBreakdown |
| **UserBehaviorProfile** | userId(unique), productivityPeakHours, completionRateByTimeSlot, optimalTasksPerDay, consistencyScore, streakReliability |

### 13.3 Social Models

| Model | Key Fields |
|---|---|
| **Message** | sender, conversationType(direct/group), participants[], content, messageType, attachments, replyTo, readBy |
| **Group** | name, creator, admins[], members[{user, role}], inviteCode, settings |
| **FriendRequest** | from, to, status(pending/accepted/rejected). Unique: {from, to} |
| **Friendship** | user1, user2, status(active/blocked), blockedBy. Unique: {user1, user2} |

### 13.4 Visual Aid Models

| Model | Key Fields |
|---|---|
| **Quiz** | title, subject, questions[{question, options, correctAnswer, explanation, difficulty, points}], createdBy, sourceType, timeLimit, passingScore |
| **QuizAttempt** | quizId, userId, answers[{questionId, userAnswer, isCorrect, timeSpent}], score, passed |
| **MindMap** | title, topic, subject, nodes[{id, label, position, style}], edges[{from, to, relation}], version, mermaidCode, svgBase64 |

### 13.5 System Models

| Model | Key Fields |
|---|---|
| **Notification** | userId, type(26 enum values), title, message, priority, isRead, expiresAt(TTL) |
| **Usage** | user, date(YYYY-MM-DD), aiQuestions, aiTokensUsed, boardsCreated, storageUsed, fileUploads. Unique: {user, date} |
| **Coupon** | code(unique), discountType, discountValue, applicablePlans[], maxUsageTotal, maxUsagePerUser, campaign |
| **FocusSession** | user, type(work/shortBreak/longBreak), duration, status, pomodoroNumber |
| **RefreshToken** | tokenHash(SHA-256), jti(unique), user, family, expiresAt(TTL) |
| **AuthAuditLog** | event(14 types), userId, ipAddress, success. TTL: 90 days |
| **PlatformSettings** | Singleton: platform config, email, AI, feature toggles, storage, security |
| **Report** | reportedBy, contentType, reason, status, reviewedBy, action |

---

## 14. API Reference — All Endpoints

### 14.1 Auth (`/api/auth`)
```
POST /register          — Register (name, email, password)
POST /login             — Login → access token + refresh cookie
POST /refresh           — Refresh access token
POST /logout            — Logout (clear cookie)
POST /logout-all        — Revoke all sessions [auth]
POST /verify-email      — Verify email token
POST /resend-verification — Resend verification email
POST /forgot-password   — Request password reset
POST /reset-password    — Reset password with token
GET  /sessions          — List active sessions [auth]
DELETE /sessions/:id    — Revoke specific session [auth]
```

### 14.2 Users (`/api/users`)
```
GET    /me              — Get profile [auth]
PATCH  /me              — Update profile [auth]
POST   /change-password — Change password [auth]
DELETE /me              — Delete account [auth]
```

### 14.3 Boards (`/api/boards`)
```
GET    /search          — Full-text search boards [auth]
GET    /                — List user's boards [auth]
POST   /                — Create board [auth, checkBoardLimit]
GET    /:id             — Get board [auth]
PATCH  /:id             — Update board [auth]
DELETE /:id             — Soft-delete board [auth]
POST   /:id/invite      — Invite member by email [auth]
POST   /:id/members     — Add member by userId [auth]
DELETE /:id/members/:uid — Remove member [auth]
PATCH  /:id/members/:uid — Update member role [auth]
PATCH  /:id/archive     — Toggle archive [auth]
POST   /:id/duplicate   — Duplicate board [auth, checkBoardLimit]
```

### 14.4 Notebooks (`/api/notebook`)
```
GET    /notebooks                              — List notebooks [auth]
POST   /notebooks                              — Create notebook [auth, checkNotebookLimit]
GET    /notebooks/:id                          — Get notebook [auth]
PUT    /notebooks/:id                          — Update notebook [auth]
DELETE /notebooks/:id                          — Delete notebook [auth]
POST   /notebooks/:id/sources                  — Upload source (PDF/text/URL) [auth, checkStorage]
DELETE /notebooks/:id/sources/:sid             — Remove source [auth]
PATCH  /notebooks/:id/sources/:sid             — Toggle source selection [auth]
GET    /notebooks/:id/sources/:sid/content     — Get source content [auth]
POST   /notebooks/:id/artifacts                — Link artifact [auth]
DELETE /notebooks/:id/artifacts/:aid           — Unlink artifact [auth]
GET    /notebooks/:id/context                  — Get notebook context [auth]
GET    /notebooks/:id/collaborators            — List collaborators [auth]
POST   /notebooks/:id/collaborators/invite     — Invite collaborator [auth]
DELETE /notebooks/:id/collaborators/:uid       — Remove collaborator [auth]
PATCH  /notebooks/:id/collaborators/:uid/role  — Update collaborator role [auth]
POST   /notebooks/:id/share-link               — Generate share link [auth]
POST   /notebooks/join/:shareCode              — Join via share code [auth]
GET    /invitations/pending                    — Pending invitations [auth]
POST   /notebooks/:id/invitations/accept       — Accept invitation [auth]
POST   /notebooks/:id/invitations/reject       — Reject invitation [auth]
```

### 14.5 AI (Proxied to AI Engine, `/api/ai`)
```
POST   /chat                       — Non-streaming AI chat [auth, checkAIUsage]
POST   /chat/stream                — Streaming AI chat (SSE) [auth, checkAIUsage]
POST   /sessions/:id/chat/stream   — Session-scoped streaming [auth, checkAIUsage]
POST   /summarize[/stream]         — Summarize text [auth, checkAIUsage]
POST   /qa[/stream]                — RAG Q&A [auth, checkAIUsage]
POST   /mindmap                    — Generate mindmap [auth, checkAIUsage]
POST   /upload                     — Ingest document [auth, checkStorage]
POST   /generate-study-plan        — AI study plan [auth, checkAIUsage]
CRUD   /sessions/*                 — Chat session management [auth]
GET    /usage/*                    — Usage statistics [auth/admin]
```

### 14.6 Study Planner (`/api/study-planner`)
```
CRUD   /plans                      — Plan CRUD [auth]
GET    /plans/:id/analytics        — Plan analytics [auth]
GET    /analytics                  — User analytics & behavior [auth]
CRUD   /tasks                      — Task CRUD + bulk create [auth]
GET    /tasks/today|upcoming|overdue — Filtered task views [auth]
POST   /tasks/:id/complete         — Mark task complete [auth]
POST   /tasks/:id/reschedule       — Reschedule task [auth]
PATCH  /plans/:id/exam-mode        — Enable exam mode [auth]
GET    /plans/:id/exam-strategy    — Get exam strategy [auth]
POST   /plans/:id/execute-strategy — Execute scheduling strategy [auth]
POST   /plans/:id/auto-schedule    — Auto-schedule plan [auth]
POST   /plans/:id/recover-missed   — Recover missed tasks [auth]
GET    /analytics/behavior-profile — User behavior profile [auth]
GET    /analytics/heatmap          — Heatmap data [auth]
GET    /analytics/optimal-slots    — Optimal study time slots [auth]
GET    /plans/:id/schedule         — Unified schedule view [auth]
CRUD   /study-events/*             — Calendar events [auth]
```

### 14.7 Subscriptions (`/api/subscriptions`)
```
GET    /plans                      — Get available plans (public)
GET    /current                    — Current subscription [auth]
POST   /create-order               — Create Razorpay order [auth]
POST   /verify-payment             — Verify payment signature [auth]
POST   /cancel                     — Cancel subscription [auth]
POST   /reactivate                 — Reactivate [auth]
GET    /payment-history            — Payment history [auth]
GET    /feature-access/:feature    — Check feature access [auth]
```

### 14.8 Social (`/api/friends`, `/api/groups`, `/api/chat`)
```
# Friends
POST   /friends/requests           — Send friend request [auth]
GET    /friends/requests/pending   — Pending requests [auth]
PUT    /friends/requests/:id/accept — Accept [auth]
GET    /friends/                   — List friends [auth]
GET    /friends/search             — Search users [auth]

# Groups
POST   /groups/                    — Create group [auth]
GET    /groups/                    — List groups [auth]
POST   /groups/:id/members         — Add member [auth]
POST   /groups/join                — Join with code [auth]

# Chat
POST   /chat/messages              — Send message [auth]
GET    /chat/messages              — Get messages [auth]
GET    /chat/conversations         — List conversations [auth]
POST   /chat/messages/read         — Mark as read [auth]
```

### 14.9 Other Endpoints
```
# Gamification — /api/gamification
GET  /stats, /personal-progress, /leaderboard, /leaderboard/friends

# Focus — /api/focus
CRUD /sessions (start/pause/resume/complete/cancel), /settings, /stats

# Visual Aids — /api/visual-aids
CRUD /mindmaps (+ versioning + archive)
CRUD /quizzes (+ attempts + stats + from-flashcards)
POST /generate/quiz, /generate/mindmap [AI]
CRUD /subjects

# Notifications — /api/notifications
GET /, /unread-count | PATCH /read-all, /:id/read | DELETE /:id, /read

# Usage — /api/usage
GET /limits, /reset-time (public) | GET /summary, /history [auth]

# Recycle Bin — /api/recycle-bin  
GET / | PATCH /:type/:id/restore | DELETE /:type/:id, /empty

# Reports — /api/reports
POST / [auth] | Admin: GET /, PUT /:id/review|resolve|dismiss

# Invoices — /api/invoices
GET /my-invoices | POST /generate/:id, /email/:id | GET /download/:id

# BYOK API Keys — /api/apikeys
GET / | POST / | PUT /:provider | DELETE /:provider | POST /:provider/validate

# Coupons — /api/coupons
POST /validate [auth] | GET /:code (public) | Admin CRUD

# Admin — /api/admin (35+ endpoints)
Dashboard, User CRUD, Board governance, Reports, Deep analytics,
Audit logs, Broadcast notifications, Subscription management
```

---

## 15. Key Architectural Decisions

### 15.1 Why Yjs over Socket.IO for Boards?

**Socket.IO** is event-based and requires manual conflict resolution. **Yjs** is a CRDT (Conflict-free Replicated Data Type) — it automatically merges concurrent edits without conflicts. Since tldraw natively supports Yjs, this gives us true real-time collaboration with:
- Automatic conflict resolution
- Offline-first capability (sync when reconnected)
- Binary WebSocket protocol (efficient bandwidth)
- Awareness protocol (cursors, presence)

### 15.2 Why Linear Agent Pipeline (Not ReAct)?

ReAct agents (reason → act → observe → repeat) can loop unpredictably. The linear pipeline gives:
- **Predictable latency** — exactly 1 router call + 1 tool call + 1 format call
- **Easier debugging** — each step is isolated and logged
- **Cost control** — fixed LLM calls per request (not unbounded loops)
- **Validation gate** — the pure Python validator catches router mistakes before tool execution

### 15.3 Why Access Token in Memory?

Storing JWT access tokens in localStorage is vulnerable to XSS. Storing in memory (Zustand) means:
- Access token is lost on page refresh (by design — forces refresh via httpOnly cookie)
- XSS can't steal the access token from storage
- Refresh token in httpOnly cookie can't be accessed by JavaScript at all

### 15.4 Why FAISS over Pinecone/Weaviate?

- **Cost:** FAISS is free and runs in-process
- **Latency:** No network roundtrip for vector search
- **Simplicity:** No external service dependency for the MVP
- **Trade-off:** No native metadata filtering (compensated by over-retrieval + post-filter)

### 15.5 Why Express 5 (Not Fastify/Hono)?

Express 5 was chosen for its massive ecosystem and team familiarity. The async error handling improvements in v5 eliminate the need for `express-async-handler` in most cases.

---

## 16. Known Limitations

| Area | Limitation | Impact |
|---|---|---|
| `allowComments` | Setting exists but no comment system implemented | UI toggle has no effect |
| Share link | Board share links don't validate visibility settings | Security gap |
| FAISS scaling | In-process FAISS doesn't scale horizontally | Single-instance AI engine limit |
| Meet module | `meet/` directory doesn't exist yet | Video study rooms not implemented |
| agent.py | Has git merge conflict markers in `run_agent()` | Needs manual resolution |
| Subscription `$or` | Tautological `$or` in expiry cron query | Minor inefficiency |
| File storage | Sources stored on local disk, not cloud storage | Won't persist across deploys on some platforms |

---

*This document was auto-generated from a comprehensive codebase audit. Last updated: June 2025.*
