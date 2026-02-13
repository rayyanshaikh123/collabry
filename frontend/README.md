# Collabry Frontend

**Modern Next.js web application for collaborative learning with AI-powered study tools.**

## 🚀 Features

### Core Features
- **AI Study Chat**: Real-time AI tutoring with streaming responses
- **Study Notebooks**: Collaborative note-taking with AI assistance
- **Study Board**: Interactive whiteboard with Google Drive integration
- **Focus Mode**: Distraction-free study sessions with Pomodoro timer
- **Study Planner**: Schedule management and task tracking
- **Gamification**: Points, badges, and leaderboards for motivation

### AI-Powered Tools
- **Quiz Generator**: Create custom quizzes from study materials
- **Flashcards**: Generate flashcards automatically
- **Mind Maps**: Visual concept mapping
- **Summarization**: Extract key points from documents
- **Q&A**: Ask questions about uploaded materials

### Collaboration
- **Real-time Sync**: Live collaboration on study boards and notebooks
- **User Presence**: See who's online and what they're working on
- **Chat**: Communicate with study partners
- **Notifications**: Stay updated on study group activities

---

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm
- Backend server running (see `/backend`)
- AI Engine running (see `/ai-engine`)

### 1. Clone Repository
```bash
git clone https://github.com/your-org/collabry.git
cd collabry/frontend
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

**Required Environment Variables:**

```env
# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api

# Socket.IO URL for real-time features
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# AI Engine URL (proxied through backend)
NEXT_PUBLIC_AI_ENGINE_URL=http://localhost:5000/api/ai

# Payment Gateway (Razorpay)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Project Structure

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Authentication pages
│   ├── (main)/              # Main application pages
│   │   ├── dashboard/       # User dashboard
│   │   ├── study-notebook/  # AI study notebooks
│   │   ├── study-board/     # Collaborative whiteboard
│   │   ├── focus/           # Focus mode
│   │   ├── planner/         # Study planner
│   │   └── voice-tutor/     # Voice AI tutor
│   └── (admin)/             # Admin pages
│
├── components/               # React components
│   ├── ui/                  # shadcn/ui components
│   ├── study-notebook/      # Notebook components
│   ├── study-board/         # Board components
│   ├── dashboard/           # Dashboard components
│   └── ...
│
├── hooks/                    # Custom React hooks
│   ├── useAuth.ts           # Authentication
│   ├── useNotebook.ts       # Notebook state
│   ├── useStudioSave.ts     # Artifact management
│   └── ...
│
├── lib/                      # Utilities and services
│   ├── api.ts               # API client (axios)
│   ├── socket.ts            # Socket.IO client
│   ├── services/            # API service layers
│   ├── stores/              # Zustand stores
│   └── utils.ts             # Helper functions
│
├── types/                    # TypeScript type definitions
├── public/                   # Static assets
└── __tests__/               # Unit tests
```

---

## 🔧 Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run tests
npm test

# Type checking
npm run type-check
```

### Code Quality

```bash
# Format code with Prettier
npm run format

# Lint and fix
npm run lint:fix

# Run all checks before commit
npm run pre-commit
```

### Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand, React Query
- **Real-time**: Socket.IO
- **Forms**: React Hook Form
- **Validation**: Zod
- **Testing**: Jest, React Testing Library

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# From project root
docker-compose up -d

# Or build specific service
docker-compose up -d frontend
```

### Standalone Docker

```bash
# Build image
docker build -t collabry-frontend .

# Run container
docker run -d \
  --name frontend \
  -p 3000:3000 \
  --env-file .env.local \
  collabry-frontend
```

---

## ☁️ Cloud Deployment

### Deploy to Vercel (Recommended for Next.js)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import your GitHub repository
   - Select `frontend` directory

2. **Configure Build**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Environment Variables**
   - Add all variables from `.env.example`
   - Set `NEXT_PUBLIC_API_BASE_URL` to your backend URL
   - Set `NEXT_PUBLIC_AI_ENGINE_URL` to your AI engine URL

4. **Deploy**
   - Vercel auto-deploys on push to main branch
   - Preview deployments for pull requests

### Deploy to Netlify

1. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Functions directory: `netlify/functions`

2. **Environment Variables**
   - Add all `NEXT_PUBLIC_*` variables
   - Configure redirects in `netlify.toml`

3. **Deploy**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

### Deploy to Render

1. **Create Web Service**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

2. **Environment Variables**
   - Add all required variables
   - Set `NODE_ENV=production`

3. **Auto-deploy**
   - Render deploys automatically on push

---

## 🔐 Authentication

The frontend uses JWT-based authentication:

1. User logs in via `/login` or Google OAuth
2. Backend returns access token and refresh token
3. Access token stored in HTTP-only cookie (secure)
4. Refresh token used for token renewal
5. Protected routes check authentication via middleware

**Protected Routes:**
- `/dashboard/*`
- `/study-notebook/*`
- `/study-board/*`
- `/focus/*`
- `/planner/*`

---

## 🎨 Customization

### Theme

Edit `app/globals.css` for global styles:
```css
@layer base {
  :root {
    --primary: 222.2 47.4% 11.2%;
    --secondary: 210 40% 96.1%;
    /* ... */
  }
}
```

### Components

UI components use shadcn/ui and can be customized via `components.json`:
```json
{
  "style": "default",
  "tailwind": {
    "baseColor": "slate"
  }
}
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

**Test Structure:**
```
__tests__/
├── components/        # Component tests
├── hooks/            # Hook tests
└── utils/            # Utility function tests
```

---

## 📊 Performance

### Build Optimization

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Font Optimization**: next/font with variable fonts
- **Bundle Analysis**: Run `npm run analyze`

### Production Checklist

- [ ] All environment variables configured
- [ ] API endpoints use production URLs
- [ ] Google Analytics configured (optional)
- [ ] Error tracking enabled (Sentry recommended)
- [ ] Sitemap generated
- [ ] robots.txt configured
- [ ] Meta tags optimized for SEO
- [ ] Images optimized and lazy-loaded

---

## 🐛 Troubleshooting

### Development Issues

**Issue**: Module not found errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

**Issue**: Port 3000 already in use
```bash
# Kill process on port 3000
npx kill-port 3000
# Or run on different port
PORT=3001 npm run dev
```

**Issue**: TypeScript errors
```bash
# Regenerate type definitions
npm run type-check
```

### Build Issues

**Issue**: Build fails with memory errors
```bash
# Increase Node memory limit
NODE_OPTIONS="--max_old_space_size=4096" npm run build
```

**Issue**: Image optimization errors
- Check Next.js image domains in `next.config.ts`
- Ensure external image URLs are allowed

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [React Query](https://tanstack.com/query/latest)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Code Style:**
- Follow TypeScript best practices
- Use functional components with hooks
- Write meaningful component tests
- Document complex logic with comments

---

## 📝 License

MIT License - see [LICENSE](../LICENSE) file for details

---

## 📞 Support

- **Documentation**: See project docs in `/docs`
- **Issues**: [GitHub Issues](https://github.com/your-org/collabry/issues)
- **Email**: support@collabry.com

---

**Built with ❤️ using Next.js and modern web technologies**

*Last Updated: February 2026*
