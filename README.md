# 🎓 Collabry - One Platform, All Your Study Needs

<div align="center">

![Collabry Banner](https://via.placeholder.com/800x200/4F46E5/FFFFFF?text=Collabry+-+Study+Smarter+Together)

### **Stop Juggling 10 Apps. Start Learning in One Intelligent Workspace.**

*AI that understands YOUR materials • Real-time collaboration • Gamified learning • Career-ready skills*

[![Next.js](https://img.shields.io/badge/Next.js-16.x-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-FastAPI-blue?logo=python)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb)](https://mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-black?logo=socket.io)](https://socket.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)

[🚀 Quick Start](#-quick-start) • [✨ Features](#-features) • [🏗️ Architecture](#️-architecture) • [📖 Documentation](#-api-endpoints)

</div>

---

## 🎯 The Problem: Learning is Broken

**Students today juggle 6-10 disconnected tools:**
- 📱 PDFs in Google Drive
- 📝 Notes in Notion
- 🤖 AI in ChatGPT (that doesn't know your materials)
- 📅 Plans in Todoist
- 💬 Collaboration in Discord
- 🎓 Courses scattered across 5 platforms

**The Result?**
- ⏰ **30% of study time** wasted switching contexts
- 🧠 **Isolated AI** that can't answer questions about your uploaded physics notes
- 📉 **60% of students** abandon study plans within a week
- 🎯 Learning becomes **scattered, inconsistent, and lonely**

---

## 💡 The Solution: Collabry

**One unified, AI-powered workspace where learning, collaboration, and growth happen together—not across 10 apps.**

### 🌟 Why Collabry is Different

| Traditional Approach | Collabry Approach |
|---------------------|------------------|
| Upload PDF to Drive → Copy to ChatGPT → Paste to Notion | Upload PDF → AI understands it → Ask questions, generate quizzes, get course suggestions—all in one notebook |
| Generic AI chatbot disconnected from your materials | **RAG-powered AI** that knows YOUR study content |
| Slack/Discord for collaboration | **Real-time study boards** synced via Socket.IO (think Figma meets Notion for studying) |
| Manual planning + no motivation tracking | **AI Planner + Gamification** (XP, 12 badges, streaks, leaderboards) |
| Study alone, find courses randomly | **Integrated SkillBridge** detects topics and surfaces relevant courses |

---

## 🎬 See It In Action

### 📓 **Smart Notebooks with Context-Aware AI**
```
1. Upload your Physics PDF on "Thermodynamics"
2. AI reads it using RAG (Retrieval-Augmented Generation)
3. Ask: "Explain the second law in simple terms"
4. Generate: Mind maps, quizzes, flashcards—instantly
5. Get: Udemy/Coursera courses on thermodynamics—automatically suggested
```
**No more copy-pasting between 5 tools.** Everything happens in one notebook.

### 🎨 **Real-Time Collaboration (Like Figma, But for Studying)**
- Shared infinite whiteboards with tldraw
- Live cursors, real-time sync via Socket.IO
- Group chat with AI assistance
- Collaborate on notes, diagrams, and problem-solving

### 🎮 **Gamification That Actually Motivates**
- **12+ Badges:** First Step, Week Warrior, Task Crusher, Quiz Master, Night Owl
- **XP System:** Earn points for real study activities (tasks, quizzes, sessions)
- **Daily Streaks:** Build consistency with visible progress
- **You vs. You:** Weekly performance comparison to track personal growth
- **Leaderboards:** Compete with friends or globally

### 🚀 **Built for Scale, Not Just Demo**
- **User-Isolated RAG:** Your documents stay private with metadata filtering
- **Real-time sync:** Sub-second latency with Socket.IO namespaces
- **SaaS-ready:** Subscription tiers, usage tracking, Razorpay integration complete
- **Production-grade:** JWT auth, rate limiting, MongoDB indexing, error handling

---

## ✨ Core Features

### 1️⃣ 🧠 Smart Notebooks - AI That Knows YOUR Content

**The Problem:** ChatGPT doesn't know your uploaded Physics notes. You copy-paste everything manually.

**Collabry's Solution:** RAG-Powered Context Intelligence
- 📄 **Upload PDFs, notes, documents** - Your study materials become AI's knowledge base
- 🎯 **Context-Aware Q&A** - "Explain Fourier Transform from my lecture notes" (AI reads YOUR file, not generic internet)
- 📝 **Smart Summaries** - Key points, concept extraction, definitions with examples
- 🧩 **Mind Maps** - Auto-generate Mermaid diagrams from content
- ❓ **Quiz Generation** - MCQs created from YOUR materials (PDF → Quiz in 30 seconds)
- 🎴 **Flashcards** - Spaced repetition-ready cards from documents
- 🌐 **SkillBridge Integration** - As you study thermodynamics, AI suggests relevant Udemy/Coursera courses
- 💬 **Multi-Session Memory** - AI remembers past conversations per notebook

**Technical Edge:** User-isolated FAISS vector stores with metadata filtering (your documents never leak to other users)

---

### 2️⃣ 🎨 Real-Time Study Boards - Figma Meets Notion

**The Problem:** Discord/Slack aren't built for studying. Screen sharing is clunky.

**Collabry's Solution:** Live Collaborative Whiteboards
- 🎯 **Infinite Canvas** - tldraw-powered whiteboard for diagrams, brainstorming, problem-solving
- 👥 **Real-time Sync** - See cursors, edits, and additions instantly (Socket.IO magic)
- 🔒 **Permission Control** - Owner, editor, viewer roles
- 💬 **Group Chat** - Integrated messaging without leaving the board
- 🎨 **Rich Tools** - Sticky notes, shapes, drawings, text, arrows
- 📜 **Version History** - Track board evolution

**Use Cases:** Math problem solving, concept mapping, project planning, collaborative notes

---

### 3️⃣ 📅 AI Study Planner - From Chaos to Structure

**The Problem:** Manual planners aren't adaptive. When you miss a day, everything breaks.

**Collabry's Solution:** Intelligent Planning with AI
- 🤖 **AI-Generated Plans** - "Create a 4-week plan for Data Structures" → Instant breakdown
- 🎯 **Task Decomposition** - Syllabi broken into daily actionable tasks
- ⏰ **Time Preferences** - Set daily hours, preferred time slots (morning/afternoon/evening/night)
- 📊 **Progress Tracking** - Completion %, missed tasks, active status
- 🔄 **Adaptive Planning** - (Structure ready for auto-adjustment)
- 📈 **Analytics** - See which topics take longest, track consistency

**Smart Categorization:** Exam prep, course-based, skill development, custom plans

---

### 4️⃣ ⏱️ Focus Mode + Gamification - Build Habits That Stick

**The Problem:** 60% of students quit plans within a week. No motivation tracking.

**Collabry's Solution:** Psychology-Backed Motivation Engine

**Focus Mode:**
- ⏰ **Pomodoro Timer** - 25-min focused sessions with breaks
- 📊 **Session Analytics** - Track total time, completed sessions
- 🔥 **Streak Tracking** - Current and longest streaks with date validation
- 🎯 **Daily Goals** - Visual progress indicators

**Gamification (Production-Grade):**
- ⭐ **XP System** - Earn points for real activities:
  - Complete task: 20 XP (+10 for high priority)
  - Create plan: 50 XP
  - Complete quiz: 30 XP
  - Study session: 15 XP per 5 min
  - Maintain streak: +2 XP per day
- 🏆 **12+ Badges** - First Steps, Week Warrior, Task Crusher, Quiz Master, Night Owl, Time Lord, Month Master
- 📈 **Level System** - Progress through levels based on XP
- 🏅 **Leaderboards** - Global rankings, friend-only boards
- 📊 **Rich Stats** - Study time, tasks completed, plans created, quizzes taken
- 📆 **You vs. You** - Weekly performance snapshots for personal growth comparison

**Psychology:** Extrinsic rewards (XP, badges) → Intrinsic motivation (consistent habits)

---

### 5️⃣ 👥 Social Learning - Study Together, Not Alone

**The Problem:** Learning is isolating. Group study requires 5 different apps.

**Collabry's Solution:** Integrated Social Features
- 👋 **Friend System** - Send requests, build study circles
- 🏘️ **Study Groups** - Create/join groups with shared resources
- 💬 **Real-time Chat** - One-on-one and group messaging
- 🔔 **20+ Notification Types:**
  - Task reminders, daily plans, quiz completions
  - Friend requests, group invitations, @mentions
  - Achievement unlocks, level ups, streak milestones
  - Subscription updates, payment confirmations
- 🎯 **Activity Feed** - See what friends are studying
- 🏆 **Compete** - Leaderboards for friendly competition

---

### 6️⃣ 🎓 SkillBridge - From Academics to Career

**The Problem:** Students study but don't know how to translate learning to skills.

**Collabry's Solution:** Contextual Course Recommendations
- 🔍 **Auto-Detection** - As you study "Data Structures," AI detects topics
- 🌐 **Smart Search** - Web search for relevant courses (Udemy, Coursera, edX)
- 🎯 **Structured Cards** - Platform, ratings, pricing, descriptions
- 🚀 **One-Click Access** - External links to enroll

**Integrated:** Appears contextually in notebooks, not as a separate tool

---

### 7️⃣ 💳 SaaS-Ready Infrastructure

**Built for scale from day one:**

**Subscription Tiers:**
- 🆓 **Free:** 50 AI questions/month, 2 notebooks, basic features
- ⚡ **Pro:** 500 questions/month, unlimited notebooks, advanced features
- 👑 **Premium:** Unlimited questions, all features, priority support

**Infrastructure:**
- 💰 **Razorpay Integration** - Secure payments, invoices, auto-renewal
- 📊 **Usage Tracking** - Real-time question counting, token monitoring
- 🚦 **Rate Limiting** - Tier-based enforcement with middleware
- 📈 **Analytics Dashboard** - Admin insights into usage patterns

---

## 🏗️ Architecture - Built for Scale

### Three-Tier Production Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         COLLABRY STACK                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐ │
│  │   FRONTEND      │   │    BACKEND      │   │   AI ENGINE     │ │
│  │   Next.js 16    │◄─►│   Express 5     │◄─►│   FastAPI       │ │
│  │   React 19      │   │   Node.js       │   │   Python 3.10+  │ │
│  │   Port 3000     │   │   Port 5000     │   │   Port 8000     │ │
│  │                 │   │                 │   │                 │ │
│  │  • TypeScript   │   │  • JWT Auth     │   │  • Hugging Face │ │
│  │  • Zustand      │   │  • Socket.IO    │   │  • LangChain    │ │
│  │  • TanStack Q   │   │  • Mongoose     │   │  • FAISS RAG    │ │
│  │  • Tailwind     │   │  • Razorpay     │   │  • HuggingFace  │ │
│  │  • Socket.IO    │   │  • Rate Limit   │   │  • Multi-tools  │ │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘ │
│          │                      │                      │          │
│          │                      │                      │          │
│          └──────────────────────┼──────────────────────┘          │
│                                 │                                 │
│                    ┌────────────▼──────────────┐                  │
│                    │      MongoDB Atlas        │                  │
│                    │    (Unified Data Store)   │                  │
│                    │  • Users & Auth           │                  │
│                    │  • Notebooks & Sources    │                  │
│                    │  • Boards & Elements      │                  │
│                    │  • Plans, Tasks, Quizzes  │                  │
│                    │  • Gamification & Stats   │                  │
│                    │  • Social & Notifications │                  │
│                    └───────────────────────────┘                  │
│                                                                    │
│                    ┌───────────────────────────┐                  │
│                    │   Socket.IO Real-time     │                  │
│                    │  • Board Namespace        │                  │
│                    │  • Chat Namespace         │                  │
│                    │  • Notification Namespace │                  │
│                    │  • JWT Authentication     │                  │
│                    └───────────────────────────┘                  │
└────────────────────────────────────────────────────────────────────┘
```

### 🎯 Why This Architecture Wins

#### **1. User-Isolated RAG (Privacy by Design)**
```python
# Each document tagged with user_id in metadata
# FAISS filters ensure no cross-user document leakage
vector_store.similarity_search(
    query="Explain thermodynamics",
    filter={"user_id": "user_123"}  # Only this user's docs
)
```

#### **2. Real-time at Scale**
- **Socket.IO Namespaces:** Separate channels for boards, chat, notifications
- **JWT on Sockets:** Authenticated connections from the start
- **Sub-second Latency:** Operational transform-style updates

#### **3. Stateless & Scalable**
- **Frontend:** Deployed on Vercel (serverless, auto-scaling)
- **Backend:** Horizontal scaling with MongoDB connection pooling
- **AI Engine:** Independent scaling based on AI load
- **Database:** MongoDB Atlas with proper indexing

#### **4. Production Security**
✅ JWT authentication  
✅ CSRF protection  
✅ Rate limiting (tier-based)  
✅ Input validation (express-validator)  
✅ MongoDB injection prevention  
✅ Helmet.js security headers  
✅ User data isolation

### Tech Stack Deep Dive

| Layer | Technologies | Purpose |
|-------|-------------|---------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS | SSR, routing, type safety, styling |
| **State** | Zustand, TanStack Query | Global state, server state management |
| **Real-time** | Socket.IO Client | Boards, chat, notifications |
| **UI** | Radix UI, Framer Motion, Mermaid | Accessible components, animations, diagrams |
| **Backend** | Express 5, Mongoose, JWT, bcrypt | API, DB access, auth, security |
| **Real-time** | Socket.IO Server | WebSocket management |
| **Payments** | Razorpay | Subscriptions, invoices |
| **AI Engine** | FastAPI, Hugging Face Inference API, LangChain | AI orchestration |
| **RAG** | FAISS, HuggingFace Embeddings | Vector search, similarity |
| **Tools** | Web search, OCR, document generation | Multi-agent capabilities |
| **Database** | MongoDB Atlas | Unified data store |
| **Whiteboard** | tldraw | Collaborative canvas |

---

## 🚀 Quick Start - Up and Running in 10 Minutes

### Prerequisites

Ensure you have these installed:
- ✅ **Node.js** v18+ ([Download](https://nodejs.org/))
- ✅ **Python** 3.10+ ([Download](https://python.org/))
- ✅ **MongoDB** ([Atlas free tier](https://mongodb.com/atlas) or local)
- ✅ **Git** ([Download](https://git-scm.com/))

### Installation Steps

#### 1️⃣ Clone & Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/collabry.git
cd collabry
```

#### 2️⃣ Backend Setup (Express + MongoDB)

```bash
cd backend
npm install

# Create environment file
cp .env.example .env

# Edit .env with your values:
# - MONGODB_URI (your MongoDB connection string)
# - JWT_SECRET (generate random string)
# - RAZORPAY credentials (optional for payments)

# Create admin user (optional)
npm run create-admin

# Start development server
npm run dev
# ✅ Backend running on http://localhost:5000
```

#### 3️⃣ Frontend Setup (Next.js)

```bash
cd ../frontend
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local:
# - NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
# - NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Start development server
npm run dev
# ✅ Frontend running on http://localhost:3000
```

#### 4️⃣ AI Engine Setup (FastAPI + Hugging Face)

```bash
cd ../ai-engine

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env:
# - MONGO_URI (match backend MongoDB)
# - JWT_SECRET_KEY (match backend JWT_SECRET)
# - GOOGLE_API_KEY (get from Google AI Studio)

# Start the AI server
python run_server.py
# ✅ AI Engine running on http://localhost:8000
# 📚 API Docs: http://localhost:8000/docs
```

#### 5️⃣ Verify Everything Works

Open your browser:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api/health
- **AI Engine:** http://localhost:8000/health
- **API Documentation:** http://localhost:8000/docs

### 🎉 You're Ready!

1. **Register** a new account at http://localhost:3000
2. **Create** your first notebook
3. **Upload** a PDF and ask AI questions
4. **Explore** study planner, focus mode, and gamification

---

## 🎮 Usage Examples

### Example 1: Smart Study Session
```
1. Create a new notebook: "Data Structures - Week 1"
2. Upload your lecture PDF on "Arrays & Linked Lists"
3. AI generates summary with key concepts
4. Ask: "Explain time complexity of array insertion"
5. Generate quiz: 10 MCQs on the topic
6. Get course suggestions: "Advanced Data Structures on Coursera"
```

### Example 2: Group Study
```
1. Create a study board: "GATE Prep - Algorithms"
2. Invite friends as collaborators
3. Draw flowcharts, write pseudocode together
4. Use group chat for discussions
5. AI assists with concept clarifications
```

### Example 3: Exam Preparation
```
1. Create study plan: "CAT Quant - 30 Days"
2. AI breaks syllabus into daily tasks
3. Complete tasks, earn XP and badges
4. Use Focus Mode for Pomodoro sessions
5. Track progress with analytics dashboard
```

---

## 📁 Project Structure - Clean & Scalable

```
collabry/
├── 📱 frontend/                 # Next.js 16 Frontend
│   ├── app/                     # App Router (Next.js 13+)
│   │   ├── (auth)/             # Auth pages (login, register, reset)
│   │   ├── (main)/             # Main app pages
│   │   │   ├── dashboard/      # User dashboard with analytics
│   │   │   ├── study-notebook/ # Smart notebooks with AI
│   │   │   ├── study-board/    # Collaborative whiteboards
│   │   │   ├── planner/        # AI study planner
│   │   │   ├── focus/          # Focus mode with Pomodoro
│   │   │   ├── visual-aids/    # Quizzes, mindmaps, flashcards
│   │   │   ├── social/         # Friends, groups, leaderboard
│   │   │   ├── profile/        # User profile & settings
│   │   │   └── subscription/   # Payment & usage tracking
│   │   └── (admin)/            # Admin panel
│   ├── components/             # Reusable React components
│   │   ├── UIElements.tsx      # Button, Card, Badge primitives
│   │   ├── FocusWidget.tsx     # Floating focus timer
│   │   ├── study-notebook/     # Notebook-specific components
│   │   └── ...
│   ├── hooks/                  # Custom React hooks
│   │   ├── useNotebook.ts      # Notebook CRUD operations
│   │   ├── useAuth.ts          # Authentication hooks
│   │   └── ...
│   ├── src/
│   │   ├── stores/             # Zustand global state
│   │   │   ├── auth.store.ts
│   │   │   ├── ui.store.ts
│   │   │   └── focusMode.store.ts
│   │   └── services/           # API service layer
│   │       ├── api.service.ts
│   │       ├── socket.service.ts
│   │       └── ...
│   └── views/                  # Page view components
│       ├── Landing.tsx
│       ├── Dashboard.tsx
│       ├── FocusMode.tsx
│       └── ...
│
├── 🔧 backend/                  # Express.js Backend
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── notebook.controller.js
│   │   │   ├── studyPlanner.controller.js
│   │   │   └── gamification.controller.js
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── User.js         # User with gamification
│   │   │   ├── Notebook.js     # Notebook with sources
│   │   │   ├── Board.js        # Collaborative boards
│   │   │   ├── StudyPlan.js    # Plans and tasks
│   │   │   ├── Quiz.js         # Quizzes and attempts
│   │   │   └── ...
│   │   ├── routes/             # API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── notebook.routes.js
│   │   │   ├── board.routes.js
│   │   │   ├── ai.routes.js    # Proxy to AI engine
│   │   │   └── ...
│   │   ├── services/           # Business logic
│   │   │   ├── gamification.service.js
│   │   │   ├── notification.service.js
│   │   │   └── ...
│   │   ├── middleware/         # Express middleware
│   │   │   ├── auth.middleware.js
│   │   │   ├── usageEnforcement.js
│   │   │   ├── validation.middleware.js
│   │   │   └── ...
│   │   ├── socket/             # Socket.IO handlers
│   │   │   ├── index.js
│   │   │   ├── boardNamespace.js
│   │   │   ├── chatNamespace.js
│   │   │   └── notificationNamespace.js
│   │   └── utils/              # Utility functions
│   │       ├── jwt.util.js
│   │       ├── email.util.js
│   │       └── ...
│   ├── scripts/                # Admin scripts
│   │   └── createAdmin.js
│   └── tests/                  # Backend tests
│       ├── auth.test.js
│       ├── studyPlanner.test.js
│       └── ...
│
└── 🤖 ai-engine/               # Python FastAPI AI Engine
    ├── core/                   # Core AI components
    │   ├── agent.py            # LangChain multi-tool agent
    │   ├── huggingface_service.py   # Hugging Face integration
    │   ├── local_llm.py        # LLM wrapper
    │   ├── memory.py           # Conversation memory
    │   ├── mongo_store.py      # MongoDB persistence
    │   ├── rag_retriever.py    # RAG with FAISS
    │   ├── embeddings.py       # HuggingFace embeddings
    │   ├── study_copilot.py    # Study AI assistant
    │   └── usage_tracker.py    # Token tracking
    ├── server/                 # FastAPI server
    │   ├── main.py             # App entry point
    │   ├── routes/             # API routes
    │   │   ├── chat.py
    │   │   ├── ingest.py
    │   │   ├── summarize.py
    │   │   ├── qa.py
    │   │   ├── mindmap.py
    │   │   └── studyplan.py
    │   ├── schemas.py          # Pydantic models
    │   ├── deps.py             # Dependencies
    │   └── middleware.py       # FastAPI middleware
    ├── tools/                  # AI tool modules
    │   ├── mindmap_generator.py
    │   ├── web_search.py
    │   ├── ocr_reader.py
    │   ├── ppt_generator.py
    │   ├── doc_generator.py
    │   └── ...
    ├── documents/              # RAG document store
    └── models/                 # ML model cache
```

---

## 🔧 Environment Variables

### Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/collabry

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=7d

# AI Engine
AI_ENGINE_URL=http://localhost:8000

# Razorpay (optional)
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_BASE_URL=https://colab-back.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://colab-back.onrender.com
NEXT_PUBLIC_AI_URL=http://localhost:8000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
```

### AI Engine (.env)

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB=collabry

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
OLLAMA_TIMEOUT=180

# JWT (must match backend)
JWT_SECRET_KEY=your-super-secret-key

# Optional: Web search
SERPER_API_KEY=xxx
```

---

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/forgot-password` | Request password reset |

### Study Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List user's boards |
| POST | `/api/boards` | Create new board |
| GET | `/api/boards/:id` | Get board details |
| PUT | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | AI chat conversation |
| POST | `/api/ai/summarize` | Summarize text |
| POST | `/api/ai/quiz` | Generate quiz |
| POST | `/api/ai/mindmap` | Generate mind map |
| POST | `/api/ai/upload` | Upload document for RAG |

### Study Planner
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/study-planner/plans` | Get study plans |
| POST | `/api/study-planner/plans` | Create plan |
| GET | `/api/study-planner/tasks` | Get tasks |
| PUT | `/api/study-planner/tasks/:id` | Update task |

### Gamification
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gamification/stats` | Get user stats |
| GET | `/api/gamification/badges` | Get user badges |
| GET | `/api/gamification/leaderboard` | Get leaderboard |

---

## 🎮 Gamification System - The Motivation Engine

### 🏆 How It Works

Every study action earns XP. XP unlocks levels. Levels unlock badges. Badges = bragging rights.

### XP Rewards Table

| Action | XP Earned | Why |
|--------|-----------|-----|
| ✅ Complete Task | 20 XP (+10 bonus for high priority) | Reward finishing what you planned |
| 📝 Create Study Plan | 50 XP | Big commitment deserves big reward |
| 📓 Create Notebook | 10 XP | Starting is half the battle |
| ❓ Complete Quiz | 30 XP | Testing knowledge = deep learning |
| ⏰ Study Session (5 min) | 15 XP | Consistency over intensity |
| 🔥 Daily Streak | +2 XP per day (max +20 at 10-day) | Compound rewards for habits |
| 🎯 Upload Document | 5 XP | Building your knowledge base |

**Level Formula:** `Level = floor(sqrt(totalXP / 100))`
- Level 1: 0 XP
- Level 2: 100 XP
- Level 5: 2,500 XP
- Level 10: 10,000 XP

### 🎖️ Badge Collection (12+ Unlockables)

| Badge | Name | How to Unlock | Category |
|-------|------|---------------|----------|
| 🎯 | First Steps | Complete your first task | Starter |
| 💪 | Task Crusher | Complete 50 tasks | Productivity |
| 🏆 | Study Champion | Complete 100 tasks | Productivity |
| 🔥 | Week Warrior | Maintain 7-day streak | Consistency |
| 👑 | Month Master | Maintain 30-day streak | Consistency |
| ⏰ | Time Lord | Study for 100+ hours | Focus |
| 📋 | Planner Pro | Create 10 study plans | Planning |
| 🎓 | Quiz Master | Complete 25 quizzes | Learning |
| 🌙 | Night Owl | Study between 10 PM - 2 AM (5 sessions) | Habits |
| 🌅 | Early Bird | Study between 5 AM - 8 AM (5 sessions) | Habits |
| 👥 | Social Butterfly | Add 10 friends | Social |
| 🧠 | Mindmap Genius | Create 10 mind maps | Visual Learning |

### 📊 Statistics Tracked

Your dashboard shows:
- 📈 **Total XP & Level** - Overall progress
- 🔥 **Current Streak** - Days of consecutive study
- 🏅 **Longest Streak** - Personal best
- ⏱️ **Total Study Time** - Hours invested
- ✅ **Tasks Completed** - Work done
- 📝 **Plans Created** - Organization level
- 📓 **Notebooks Created** - Content generated
- ❓ **Quizzes Completed** - Knowledge tested

### 🏅 Leaderboard System

**Two Modes:**
1. **Global Leaderboard** - Compete with all users
2. **Friends Only** - Compete with your study circle

**Ranking Based On:**
- Total XP (primary)
- Current streak (tiebreaker)
- Level achieved

**Updated:** Real-time via Socket.IO

### 📆 "You vs. You" Weekly Comparison

**The Problem:** Comparing with others demotivates. Comparing with yourself motivates.

**How It Works:**
- Every week, system captures snapshot: XP, streak, tasks, hours
- Next week, you see: "Last week: 350 XP, This week: 420 XP (+70 XP! 🎉)"
- Visual charts show growth over 4-8 weeks
- Focus on personal growth, not competition

**Psychology:** Growth mindset > Fixed mindset

---

## 🔔 Smart Notifications - Stay Connected

### 20+ Notification Types

#### 📚 Study Activities
- Task due reminders (1 hour before, 1 day before)
- Daily study plan ready
- Quiz completion confirmation
- Mind map generation complete
- Flashcard set created

#### 🎮 Gamification
- Achievement unlocked
- New badge earned
- Level up celebration
- Streak milestone (7, 30, 100 days)
- XP threshold reached

#### 👥 Social
- Friend request received
- Friend request accepted
- Group invitation
- New message in chat
- @mentioned in conversation
- Board collaborator added

#### 💳 System
- Subscription activated
- Payment successful
- Usage limit warning (80%, 90%, 100%)
- Subscription renewal reminder
- Welcome to Collabry

### Delivery Channels
- ✅ **In-app Notification Center** - Bell icon with unread count
- ✅ **Real-time Socket.IO** - Instant delivery while online
- ✅ **Browser Notifications** - Desktop alerts (PWA-ready)

### User Control
- Mark as read/unread
- Clear all notifications
- Filter by type
- Notification preferences (coming soon)

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Frontend Tests

```bash
cd frontend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### AI Engine Tests

```bash
cd ai-engine
python test_fastapi_server.py    # API tests
python test_agent_execution.py   # Agent tests
python test_memory_mongodb.py    # Memory tests
```

---

## 🚢 Deployment Guide

### Option 1: Docker Compose (Recommended)

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Cloud Deployment

#### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

#### Backend (Railway/Render)
```bash
cd backend
# Push to GitHub, connect to Railway/Render
# Set environment variables in dashboard
```

#### AI Engine (Railway with Python)
```bash
cd ai-engine
# Deploy to Railway Python environment
# Ensure Google API key is set
```

#### Database (MongoDB Atlas)
1. Create free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create database user
3. Get connection string
4. Update env vars: `MONGODB_URI=mongodb+srv://...`

### Environment Variables Checklist

**Backend:**
- ✅ `MONGODB_URI`
- ✅ `JWT_SECRET`
- ✅ `AI_ENGINE_URL`
- ✅ `RAZORPAY_KEY_ID` (optional)
- ✅ `RAZORPAY_KEY_SECRET` (optional)

**Frontend:**
- ✅ `NEXT_PUBLIC_API_BASE_URL`
- ✅ `NEXT_PUBLIC_SOCKET_URL`
- ✅ `NEXT_PUBLIC_AI_URL` (optional, defaults to backend proxy)

**AI Engine:**
- ✅ `MONGO_URI`
- ✅ `JWT_SECRET_KEY`
- ✅ `GOOGLE_API_KEY`

---

## 🔒 Security Features

### Authentication & Authorization
- ✅ **JWT Tokens** - Secure stateless auth (7-day expiry)
- ✅ **bcrypt Hashing** - Password security with 10 rounds
- ✅ **Role-Based Access** - Student, Admin, Mentor roles
- ✅ **Password Reset** - Secure token-based flow

### API Security
- ✅ **Rate Limiting** - Tier-based request limits
- ✅ **CSRF Protection** - Token validation
- ✅ **Input Validation** - express-validator on all inputs
- ✅ **MongoDB Injection** - Parameterized queries
- ✅ **Helmet.js** - Security headers (CSP, XSS protection)
- ✅ **CORS Configuration** - Whitelisted origins

### Data Privacy
- ✅ **User-Isolated RAG** - Document metadata filtering by user_id
- ✅ **Socket.IO Auth** - JWT verification on connections
- ✅ **Permission Checks** - Ownership validation on every route
- ✅ **Secure File Upload** - Type validation, size limits

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

**Test Coverage:**
- ✅ Authentication routes
- ✅ Study planner CRUD
- ✅ Gamification logic
- ✅ Notebook operations
- ✅ Board collaboration

### Frontend Tests
```bash
cd frontend
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

**Test Coverage:**
- ✅ Focus Mode Pomodoro timer
- ✅ Streak calculation logic
- ✅ Component rendering
- ✅ API service calls

### AI Engine Tests
```bash
cd ai-engine
python test_complete_fix.py      # Integration tests
python test_ollama_migration.py  # AI service tests (Hugging Face)
python verify_study_notebook.py  # RAG tests
```

---

## 🎯 What Makes This Special

### 1. **Not Just Another ChatGPT Wrapper**

**Typical Projects:**
```javascript
// Generic API call
const response = await openai.chat({ prompt: userInput });
```

**Collabry:**
```python
# RAG pipeline with user isolation
1. Upload PDF → Text extraction → Chunking → Embedding generation
2. Store in FAISS with user_id metadata
3. Query filters by user_id (no cross-user leakage)
4. Context-aware responses with source attribution
5. Multi-tool agent system (web search, OCR, generation)
```

### 2. **Production-Grade Gamification**

**Most Projects:** Basic points counter

**Collabry:**
- 12+ distinct badges with unlock conditions
- XP formula tied to real learning activities
- Weekly historical tracking for "You vs. You"
- Streak logic with date validation
- Friend-based leaderboards
- Achievement progress tracking

### 3. **Real-Time That Actually Works**

**Typical:** WebSocket connection, basic message passing

**Collabry:**
- Socket.IO namespaces (boards, chat, notifications)
- JWT authentication on socket handshake
- User presence tracking
- Typing indicators
- Operational transform-style updates
- Sub-second latency

### 4. **Full SaaS Infrastructure**

**Typical:** Just feature code

**Collabry:**
- Subscription tier system
- Usage tracking middleware
- Rate limiting enforcement
- Payment integration (Razorpay)
- Invoice generation
- Admin analytics dashboard

### 5. **Integrated Experience**

**Problem:** Most learning platforms are collections of separate tools

**Collabry:** Every feature connects
- Study notebook → AI detects topics → Suggests courses
- Complete task → Earn XP → Unlock badge → Share with friends
- Create plan → Tasks appear → Focus mode for execution → Track streaks
- Upload PDF → Generate quiz → Take quiz → Earn XP → Level up

---

## 💡 Future Roadmap

### Phase 1: Polish (2-4 weeks)
- [ ] Tab-switch detection in Focus Mode
- [ ] Focus lock mode (browser-level)
- [ ] AI-generated motivation prompts
- [ ] Enhanced adaptive plan regeneration
- [ ] PDF live annotations

### Phase 2: Accessibility (1-2 months)
- [ ] Voice input (OpenAI Whisper)
- [ ] Text-to-speech for summaries
- [ ] Multi-language AI output
- [ ] Keyboard navigation
- [ ] Screen reader optimization

### Phase 3: Advanced Features (2-3 months)
- [ ] AI voice tutor (conversational)
- [ ] Mobile app (React Native)
- [ ] Video call integration (Daily.co)
- [ ] LMS integration (Moodle, Canvas)
- [ ] Advanced analytics dashboard

### Phase 4: Scale & Monetize (3-6 months)
- [ ] Educator dashboard
- [ ] Institution-level deployment
- [ ] Content marketplace
- [ ] API for third-party integration
- [ ] White-label solution

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Authors

- **Aditya Makwana** - *Full Stack Developer + AI Engineer*
- **Nirmal Darekar** - *Full Stack Developer *
- **Rayyan Shaikh** - *Full Stack Developer + AI Engineer*
---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React Framework
- [Ollama](https://ollama.ai/) - Local LLM Runtime
- [LangChain](https://langchain.com/) - AI Orchestration
- [tldraw](https://tldraw.com/) - Collaborative Whiteboard
- [Razorpay](https://razorpay.com/) - Payment Gateway
- [Socket.IO](https://socket.io/) - Real-time Communication

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ for students everywhere

</div>
