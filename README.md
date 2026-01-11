# 🎓 Collabry - AI-Powered Collaborative Learning Platform

<div align="center">

![Collabry Banner](https://via.placeholder.com/800x200/4F46E5/FFFFFF?text=Collabry+-+Study+Smarter+Together)

**An intelligent, collaborative study environment where students learn together, stay focused, and grow skills — powered by AI**

[![Next.js](https://img.shields.io/badge/Next.js-16.x-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-FastAPI-blue?logo=python)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb)](https://mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-black?logo=socket.io)](https://socket.io/)

[Demo](#-demo) • [Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 📖 About

Collabry is a **web-based, AI-powered collaborative study hub** designed for college students, competitive exam aspirants, and study groups. It bridges the gap between studying and understanding, collaboration and productivity, academics and career-oriented upskilling.

### 🎯 Problems We Solve

- 📚 **Scattered Resources** - Learning materials spread across multiple platforms
- 🤖 **Isolated AI Tools** - Existing AI tools lack collaboration features
- 📈 **Low Motivation** - Students lack consistency and structured planning
- 🎯 **Distractions** - Reduced study effectiveness due to interruptions
- 🌐 **Accessibility Gaps** - Regional language and accessibility barriers

---

## ✨ Features

### 🤖 AI-Powered Learning Engine
- **PDF & Document Upload** - Upload study materials for AI analysis
- **Smart Summarization** - AI-generated summaries and key points
- **Context-Aware Q&A** - Ask questions about your uploaded materials
- **Quiz Generation** - Auto-generate quizzes from your notes
- **Mind Map Creation** - Visual concept maps from documents
- **Flashcard Generation** - Create study flashcards automatically

### 👥 Collaborative Study Workspace
- **Shared Study Boards** - Real-time collaborative whiteboard (tldraw)
- **Group Chat** - Real-time messaging with AI assistance
- **Live Annotations** - Collaborative highlighting and notes
- **Voice Chat** - Built-in voice communication for study sessions

### 📅 Study Planning & Productivity
- **AI Study Planner** - Intelligent daily/weekly study schedules
- **Task Management** - Break down syllabus into actionable tasks
- **Progress Tracking** - Visual progress indicators
- **Adaptive Planning** - Automatic plan adjustment when sessions are missed

### 🎯 Focus Mode (FocusMode+)
- **Pomodoro Timer** - Built-in focus sessions
- **Distraction Detection** - Tab-switch monitoring
- **Motivation Prompts** - AI-generated encouragement
- **Session Analytics** - Track your focus patterns

### 🎮 Gamification System
- **XP & Leveling** - Earn experience points for study activities
- **Daily Streaks** - Maintain consistency with streak tracking
- **Badges & Achievements** - 12+ unique badges to unlock
- **Leaderboards** - Compete with friends and globally
- **Rich Statistics** - Track study time, tasks completed, and more

### 🔔 Smart Notifications
- **20+ Notification Types** - Stay informed on all activities
- **Real-time Alerts** - Instant Socket.IO notifications
- **Scheduled Reminders** - Task due alerts, daily plans
- **Browser Notifications** - PWA-ready notifications

### 💳 SaaS Subscription (Razorpay)
- **Tiered Plans** - Free, Pro, and Premium options
- **Usage Tracking** - Monitor AI usage and limits
- **Payment Integration** - Secure Razorpay checkout
- **Invoice Management** - Download payment history

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         COLLABRY                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │    │   Backend    │    │  AI Engine   │      │
│  │   (Next.js)  │◄──►│  (Express)   │◄──►│  (FastAPI)   │      │
│  │   Port 3000  │    │   Port 5000  │    │   Port 8000  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│                    ┌────────┴────────┐                          │
│                    │    MongoDB      │                          │
│                    │   Port 27017    │                          │
│                    └─────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand, Socket.IO Client |
| **Backend** | Node.js, Express 5, Socket.IO, JWT, Mongoose |
| **AI Engine** | Python, FastAPI, LangChain, Ollama (LLaMA 3.1), FAISS, Sentence Transformers |
| **Database** | MongoDB |
| **Payments** | Razorpay |
| **Real-time** | Socket.IO |
| **Whiteboard** | tldraw |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ 
- **Python** 3.10+
- **MongoDB** (local or Atlas)
- **Ollama** (for local AI)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/collabry.git
cd collabry
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your values (MongoDB URI, JWT secret, etc.)

# Start development server
npm run dev
```

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with API URLs

# Start development server
npm run dev
```

### 4️⃣ AI Engine Setup

```bash
cd ai-engine

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.\.venv\Scripts\Activate.ps1

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your values

# Start Ollama and pull model
ollama pull llama3.1

# Start the AI server
python run_server.py
```

### 5️⃣ Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **AI Engine**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📁 Project Structure

```
collabry/
├── frontend/                 # Next.js Frontend
│   ├── app/                  # App Router pages
│   │   ├── (auth)/          # Authentication pages
│   │   ├── (main)/          # Main app pages
│   │   │   ├── dashboard/   # User dashboard
│   │   │   ├── study-board/ # Collaborative boards
│   │   │   ├── study-buddy/ # AI chat assistant
│   │   │   ├── planner/     # Study planner
│   │   │   ├── focus/       # Focus mode
│   │   │   ├── flashcards/  # Flashcard system
│   │   │   └── ...
│   │   └── (admin)/         # Admin panel
│   ├── components/          # Reusable components
│   ├── hooks/               # Custom React hooks
│   ├── src/
│   │   ├── stores/          # Zustand stores
│   │   └── services/        # API services
│   └── views/               # Page views
│
├── backend/                  # Express.js Backend
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   ├── socket/          # Socket.IO handlers
│   │   └── utils/           # Utility functions
│   └── scripts/             # Admin scripts
│
└── ai-engine/               # Python AI Engine
    ├── core/                # Core AI components
    │   ├── agent.py         # LangChain agent
    │   ├── local_llm.py     # Ollama wrapper
    │   ├── memory.py        # Conversation memory
    │   ├── rag_retriever.py # RAG pipeline
    │   └── study_copilot.py # Study AI assistant
    ├── server/              # FastAPI server
    ├── tools/               # AI tool modules
    └── documents/           # RAG document store
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
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
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

## 🎮 Gamification Details

### XP Rewards

| Action | XP Earned |
|--------|-----------|
| Complete Task | 20 XP (+10 for high priority) |
| Create Study Plan | 50 XP |
| Create Note | 10 XP |
| Complete Quiz | 30 XP |
| Study Session | 15 XP per 5 min |
| Maintain Streak | +2 XP per day (max +20) |

### Badges

- 🎯 **First Step** - Complete your first task
- 💪 **Task Crusher** - Complete 50 tasks
- 🏆 **Study Champion** - Complete 100 tasks
- 🔥 **Week Warrior** - 7-day streak
- 👑 **Month Master** - 30-day streak
- ⏰ **Time Lord** - Study for 100+ hours
- 📋 **Planner Pro** - Create 10 study plans
- 🎓 **Quiz Master** - Complete 25 quizzes

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

## 🚢 Deployment

### Docker (Recommended)

```bash
# Build and run all services
docker-compose up -d

# Or build individually
docker build -t collabry-frontend ./frontend
docker build -t collabry-backend ./backend
docker build -t collabry-ai ./ai-engine
```

### Manual Deployment

1. **Frontend**: Deploy to Vercel or any static host
2. **Backend**: Deploy to Railway, Render, or AWS
3. **AI Engine**: Deploy to a GPU-enabled server or use cloud LLM APIs
4. **Database**: Use MongoDB Atlas for managed database

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Authors

- **Nirmal** - *Lead Developer*

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
