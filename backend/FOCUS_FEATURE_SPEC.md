# Backend Focus Feature Implementation

## Overview
Implementing Pomodoro-style focus session tracking with gamification integration.

## Database Models

### FocusSession Schema
Location: `backend/src/models/FocusSession.js`

```javascript
{
  user: { type: ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['work', 'shortBreak', 'longBreak'], 
    required: true 
  },
  duration: { type: Number, required: true }, // minutes
  startTime: { type: Date, required: true },
  endTime: Date,
  pausedAt: Date,
  pauseDuration: { type: Number, default: 0 }, // milliseconds
  status: { 
    type: String, 
    enum: ['active', 'paused', 'completed', 'cancelled'], 
    default: 'active' 
  },
  pomodoroNumber: Number, // Which pomodoro in the cycle (1-4)
  distractions: { type: Number, default: 0 },
  notes: String,
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### FocusSettings Schema
Location: `backend/src/models/FocusSettings.js`

```javascript
{
  user: { type: ObjectId, ref: 'User', required: true, unique: true },
  workDuration: { type: Number, default: 25 }, // minutes
  shortBreakDuration: { type: Number, default: 5 },
  longBreakDuration: { type: Number, default: 15 },
  longBreakInterval: { type: Number, default: 4 }, // After how many pomodoros
  autoStartBreaks: { type: Boolean, default: false },
  autoStartPomodoros: { type: Boolean, default: false },
  notifications: { type: Boolean, default: true },
  soundEnabled: { type: Boolean, default: true },
  dailyGoal: { type: Number, default: 8 }, // Number of pomodoros
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

## API Endpoints

### Session Management

#### GET /api/focus/sessions
Get all sessions for authenticated user with optional filters
```typescript
Query params:
  - status?: 'active' | 'paused' | 'completed' | 'cancelled'
  - startDate?: ISO date string
  - endDate?: ISO date string
  - type?: 'work' | 'shortBreak' | 'longBreak'
  - limit?: number (default: 50)
  - skip?: number (default: 0)

Response: {
  success: true,
  data: FocusSession[],
  pagination: { total, limit, skip, hasMore }
}
```

#### GET /api/focus/sessions/:id
Get single session by ID
```typescript
Response: {
  success: true,
  data: FocusSession
}
```

#### POST /api/focus/sessions
Start new focus session
```typescript
Body: {
  type: 'work' | 'shortBreak' | 'longBreak',
  duration?: number, // Optional, uses settings default if not provided
  pomodoroNumber?: number
}

Response: {
  success: true,
  data: FocusSession
}
```

#### PATCH /api/focus/sessions/:id
Update session (general updates)
```typescript
Body: {
  notes?: string,
  distractions?: number
}

Response: {
  success: true,
  data: FocusSession
}
```

#### POST /api/focus/sessions/:id/pause
Pause active session
```typescript
Response: {
  success: true,
  data: FocusSession // with pausedAt timestamp
}
```

#### POST /api/focus/sessions/:id/resume
Resume paused session
```typescript
Response: {
  success: true,
  data: FocusSession // pauseDuration updated
}
```

#### POST /api/focus/sessions/:id/complete
Complete session (awards XP via gamification)
```typescript
Body: {
  notes?: string,
  distractions?: number
}

Response: {
  success: true,
  data: {
    session: FocusSession,
    xpAwarded: number,
    newLevel?: number,
    achievements?: Achievement[]
  }
}
```

#### POST /api/focus/sessions/:id/cancel
Cancel session (no XP awarded)
```typescript
Response: {
  success: true,
  data: FocusSession
}
```

### Settings Management

#### GET /api/focus/settings
Get focus settings for authenticated user
```typescript
Response: {
  success: true,
  data: FocusSettings
}
```

#### PATCH /api/focus/settings
Update focus settings
```typescript
Body: Partial<FocusSettings>

Response: {
  success: true,
  data: FocusSettings
}
```

### Statistics

#### GET /api/focus/stats
Get focus statistics for authenticated user
```typescript
Query params:
  - period?: 'today' | 'week' | 'month' | 'year' | 'all' (default: 'all')

Response: {
  success: true,
  data: {
    totalSessions: number,
    completedSessions: number,
    totalFocusTime: number, // minutes
    totalBreakTime: number, // minutes
    averageSessionDuration: number, // minutes
    completionRate: number, // percentage
    currentStreak: number, // consecutive days
    longestStreak: number,
    todaysSessions: number,
    todaysGoalProgress: number, // percentage
    pomodorosCompleted: number,
    totalDistractions: number,
    averageDistractions: number,
    byType: {
      work: { count: number, totalTime: number },
      shortBreak: { count: number, totalTime: number },
      longBreak: { count: number, totalTime: number }
    },
    recentSessions: FocusSession[] // Last 10
  }
}
```

## Service Layer
Location: `backend/src/services/focus.service.js`

### Methods

```javascript
// Session management
async startSession(userId, { type, duration, pomodoroNumber })
async pauseSession(sessionId, userId)
async resumeSession(sessionId, userId)
async completeSession(sessionId, userId, { notes, distractions })
async cancelSession(sessionId, userId)
async updateSession(sessionId, userId, updates)
async getSession(sessionId, userId)
async getSessions(userId, filters)

// Settings
async getSettings(userId)
async updateSettings(userId, updates)
async getOrCreateSettings(userId) // Helper

// Statistics
async getStats(userId, period)
async calculateStreak(userId)
async getTodayProgress(userId)

// Gamification integration
async awardSessionXP(userId, session)
```

### XP Calculation
```javascript
- Completed work session (25 min): 50 XP
- Completed work session (50 min): 100 XP
- Complete without distractions: +20 XP bonus
- Complete all 4 pomodoros in cycle: +50 XP bonus
- Reach daily goal: +100 XP bonus
```

## Controller Layer
Location: `backend/src/controllers/focus.controller.js`

Maps service methods to HTTP handlers with:
- Input validation (using express-validator)
- Error handling
- Response formatting
- Permission checks (user can only access own sessions)

## Routes Setup
Location: `backend/src/routes/focus.routes.js`

```javascript
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const focusController = require('../controllers/focus.controller');
const { validate, validateSession } = require('../middlewares/validation');

router.use(protect); // All routes require authentication

// Session routes
router.route('/sessions')
  .get(focusController.getSessions)
  .post(validate.focusSession, focusController.startSession);

router.route('/sessions/:id')
  .get(validateSession, focusController.getSession)
  .patch(validateSession, focusController.updateSession);

router.post('/sessions/:id/pause', validateSession, focusController.pauseSession);
router.post('/sessions/:id/resume', validateSession, focusController.resumeSession);
router.post('/sessions/:id/complete', validateSession, focusController.completeSession);
router.post('/sessions/:id/cancel', validateSession, focusController.cancelSession);

// Settings routes
router.route('/settings')
  .get(focusController.getSettings)
  .patch(validate.focusSettings, focusController.updateSettings);

// Stats routes
router.get('/stats', focusController.getStats);

module.exports = router;
```

Register in `backend/src/index.js`:
```javascript
const focusRoutes = require('./routes/focus.routes');
app.use('/api/focus', focusRoutes);
```

## Validation Middleware
Location: `backend/src/middlewares/validation.js`

```javascript
const { body, param, query } = require('express-validator');

exports.validate = {
  focusSession: [
    body('type').isIn(['work', 'shortBreak', 'longBreak']).withMessage('Invalid session type'),
    body('duration').optional().isInt({ min: 1, max: 120 }).withMessage('Duration must be 1-120 minutes'),
    body('pomodoroNumber').optional().isInt({ min: 1, max: 4 }).withMessage('Pomodoro number must be 1-4')
  ],
  
  focusSettings: [
    body('workDuration').optional().isInt({ min: 1, max: 60 }),
    body('shortBreakDuration').optional().isInt({ min: 1, max: 30 }),
    body('longBreakDuration').optional().isInt({ min: 1, max: 60 }),
    body('longBreakInterval').optional().isInt({ min: 2, max: 10 }),
    body('dailyGoal').optional().isInt({ min: 1, max: 20 })
  ]
};

exports.validateSession = [
  param('id').isMongoId().withMessage('Invalid session ID')
];
```

## Testing Plan
Location: `backend/tests/focus/`

### Unit Tests (`focus.service.test.js`)
- ✓ Start session creates record with correct defaults
- ✓ Pause session records pausedAt timestamp
- ✓ Resume session calculates pauseDuration correctly
- ✓ Complete session updates status and awards XP
- ✓ Cancel session doesn't award XP
- ✓ Calculate streak correctly across days
- ✓ Settings created with defaults on first access

### Integration Tests (`focus.routes.test.js`)
- ✓ POST /sessions creates active session
- ✓ POST /sessions/:id/complete awards gamification XP
- ✓ GET /sessions returns user's sessions only
- ✓ GET /stats calculates correct totals
- ✓ PATCH /settings persists changes
- ✓ Cannot access other user's sessions (403)
- ✓ Invalid session type returns 400
- ✓ Pausing already paused session returns error

## Implementation Order

1. **Models** (30 min)
   - Create FocusSession.js
   - Create FocusSettings.js

2. **Service Layer** (2 hours)
   - Implement session CRUD
   - Implement pause/resume/complete logic
   - Implement settings management
   - Implement stats calculation
   - Add gamification integration

3. **Controller Layer** (1 hour)
   - Create focus.controller.js
   - Map all endpoints
   - Add error handling

4. **Routes & Validation** (30 min)
   - Create focus.routes.js
   - Add validation middleware
   - Register in main app

5. **Testing** (2 hours)
   - Write unit tests
   - Write integration tests
   - Test gamification flow

6. **Documentation** (30 min)
   - Add JSDoc comments
   - Update API documentation
   - Create usage examples

## Gamification Integration

### Existing Service Integration
`backend/src/services/gamification.service.js` already has:
```javascript
FOCUS_SESSION: { base: 50, description: 'Completed a focus session' }

async awardStudyTimeXP(userId, minutes) {
  const xp = Math.floor(minutes * 2); // 2 XP per minute
  return await this.awardXP(userId, xp, 'FOCUS_SESSION', {
    duration: minutes
  });
}
```

### Focus Service Integration
```javascript
async completeSession(sessionId, userId, data) {
  // Mark session as complete
  const session = await FocusSession.findOneAndUpdate(
    { _id: sessionId, user: userId, status: { $in: ['active', 'paused'] } },
    {
      status: 'completed',
      completedAt: new Date(),
      endTime: new Date(),
      notes: data.notes,
      distractions: data.distractions
    },
    { new: true }
  );

  if (!session) {
    throw new Error('Session not found or already completed');
  }

  // Award XP via gamification service
  const gamificationService = require('./gamification.service');
  const xpResult = await gamificationService.awardStudyTimeXP(
    userId,
    session.duration - (session.pauseDuration / 60000) // Subtract paused time
  );

  return {
    session,
    xpAwarded: xpResult.xpAwarded,
    newLevel: xpResult.leveledUp ? xpResult.newLevel : undefined,
    achievements: xpResult.achievements
  };
}
```

## Notes

- Session timer runs on frontend, backend validates state transitions
- Pause duration accumulated to subtract from actual focus time
- Streaks calculated based on days with at least one completed session
- Settings are per-user, created on first access with defaults
- XP only awarded for completed work sessions, not breaks
- Concurrent sessions not allowed per user (validate on start)
