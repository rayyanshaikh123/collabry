# 🎮 Collabry Gamification System

A comprehensive gamification system for Collabry that rewards students for learning activities and creates a competitive, engaging learning environment.

## 🌟 Features

### 1. **XP & Leveling System**
- Earn XP for completing tasks, creating study plans, and studying
- Automatic level-ups when reaching XP thresholds
- Level formula: `level = floor(sqrt(xp / 100)) + 1`
- Visual progress bars showing progress to next level

### 2. **Streak Tracking**
- Daily study streaks to encourage consistency
- Tracks current streak and longest streak
- Bonus XP for maintaining streaks
- Visual streak calendar on dashboard

### 3. **Badges & Achievements**
- 12+ unique badges to unlock
- Progress-based achievements with completion tracking
- Beautiful badge display in profile
- Achievements for tasks, study time, streaks, and more

### 4. **Leaderboards**
- Global leaderboard for all users
- Friend-only leaderboard for social competition
- Multiple ranking types: XP, Level, Streak, Tasks
- Real-time rankings with user highlighting

### 5. **Rich Statistics**
- Total study time tracking
- Tasks completed counter
- Study plans created
- Notes and quizzes completed
- All stats visible in profile and dashboard

## 📊 XP Rewards System

| Action | Base XP | Bonus Conditions |
|--------|---------|------------------|
| Complete Task | 20 XP | +10 for high priority |
| Create Study Plan | 50 XP | - |
| Create Note | 10 XP | - |
| Complete Quiz | 30 XP | - |
| Study Session | 15 XP per 5 min | - |
| Maintain Streak | +2 XP per day | Max +20 bonus |

## 🏆 Badges

### Task Badges
- **First Step** 🎯 - Complete your first task
- **Task Crusher** 💪 - Complete 50 tasks
- **Study Champion** 🏆 - Complete 100 tasks

### Streak Badges
- **Week Warrior** 🔥 - Maintain a 7-day streak
- **Consistent Learner** 📈 - Study every day for 14 days
- **Month Master** 👑 - Maintain a 30-day streak

### Time Badges
- **Time Lord** ⏰ - Study for 100+ hours

### Other Badges
- **Planner Pro** 📋 - Create 10 study plans
- **Knowledge Keeper** 📚 - Create 50 notes
- **Quiz Master** 🎓 - Complete 25 quizzes
- **Early Bird** 🌅 - Study before 8 AM 10 times
- **Night Owl** 🦉 - Study after 10 PM 10 times

## 🎯 Achievements

### Task Achievements
- **Task Novice** - Complete 10 tasks (100 XP)
- **Task Expert** - Complete 25 tasks (250 XP)

### Streak Achievements
- **Streak Starter** - Build a 3-day streak (50 XP)
- **Streak Builder** - Build a 10-day streak (200 XP)

### Study Time Achievements
- **Study Starter** - Study for 10 hours (150 XP)
- **Study Devotee** - Study for 50 hours (500 XP)

### Planning Achievements
- **Plan Creator** - Create 5 study plans (100 XP)

## 🔌 API Endpoints

### Get User Stats
```
GET /api/gamification/stats
Authorization: Bearer <token>
```

Returns user's XP, level, streaks, badges, achievements, and statistics.

### Get Global Leaderboard
```
GET /api/gamification/leaderboard?type=xp&limit=10
Authorization: Bearer <token>
```

Query Parameters:
- `type`: xp | level | streak | tasks (default: xp)
- `limit`: number of entries (default: 10)

### Get Friend Leaderboard
```
GET /api/gamification/leaderboard/friends
Authorization: Bearer <token>
```

Returns leaderboard of user and their friends only.

### Award XP (Admin Only)
```
POST /api/gamification/award-xp
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_id",
  "amount": 100,
  "reason": "Special event"
}
```

## 💻 Frontend Components

### AchievementsDisplay
```tsx
import AchievementsDisplay from '@/components/gamification/AchievementsDisplay';

<AchievementsDisplay />
```

Shows user's level, badges, achievements, and statistics.

### Leaderboard
```tsx
import Leaderboard from '@/components/gamification/Leaderboard';

// Global leaderboard
<Leaderboard type="xp" limit={10} />

// Friend leaderboard
<Leaderboard friendsOnly={true} />
```

## 🎨 Dashboard Integration

The new dynamic dashboard includes:
- Real-time XP and level display
- Current streak tracker with visual calendar
- Active study plans with progress
- Today's tasks list
- Friend leaderboard preview
- Quick stats cards (tasks, study time, badges, streak)

## 🚀 Usage Example

### Awarding XP for Task Completion
```javascript
// Backend automatically awards XP when task is completed
// In studyTask.controller.js
const gamificationResult = await GamificationService.awardTaskCompletionXP(userId, {
  priority: task.priority,
});

// Returns:
// {
//   xpEarned: 20,
//   totalXP: 1250,
//   level: 12,
//   leveledUp: false,
//   streak: 5,
//   newBadges: []
// }
```

### Frontend Service Usage
```typescript
import { gamificationService } from '@/services/gamification.service';

// Get user stats
const stats = await gamificationService.getUserStats();

// Get leaderboard
const leaderboard = await gamificationService.getLeaderboard('xp', 10);

// Get friend leaderboard
const friendLeaderboard = await gamificationService.getFriendLeaderboard();
```

## 🎭 Notifications

The system automatically creates notifications for:
- Level ups
- Badge unlocks
- Achievement completions

Notifications are sent via Socket.IO in real-time.

## 🔄 Automatic Streak Updates

Streaks are automatically updated when:
- User completes a task (via `updateStreak()` method)
- User logs study time
- User performs any learning activity

Streak logic:
- Same day: No change
- Consecutive day: Increment by 1
- Gap > 1 day: Reset to 1

## 📈 Future Enhancements

Ideas for expansion:
- [ ] Weekly/Monthly challenges
- [ ] Team competitions
- [ ] Seasonal events with limited-time badges
- [ ] Bonus XP weekends
- [ ] Achievement tiers (Bronze, Silver, Gold)
- [ ] Custom avatars unlocked at level milestones
- [ ] Virtual rewards store (spend XP on themes, features)
- [ ] Social sharing of achievements
- [ ] Mentor/mentee XP bonuses

## 🐛 Troubleshooting

### Gamification data not loading
Check that:
1. User has `gamification` field initialized (new users get it automatically)
2. Backend routes are properly registered in `app.js`
3. Frontend service is using correct API URL
4. User is authenticated (token in localStorage)

### XP not being awarded
Verify:
1. Task completion endpoint is calling `GamificationService.awardTaskCompletionXP()`
2. User model has gamification methods defined
3. No errors in backend console

### Streak not updating
Ensure:
1. `updateStreak()` is called on task completion
2. Dates are properly compared (timezone issues)
3. User's `lastStudyDate` is being saved

## 📝 Database Schema

The User model now includes:
```javascript
gamification: {
  xp: Number,
  level: Number,
  streak: {
    current: Number,
    longest: Number,
    lastStudyDate: Date
  },
  badges: [{ id, name, description, icon, unlockedAt }],
  achievements: [{ id, name, description, progress, target, completed }],
  stats: {
    totalStudyTime: Number,
    tasksCompleted: Number,
    plansCreated: Number,
    notesCreated: Number,
    quizzesCompleted: Number
  }
}
```

## 🎉 Success!

Your learning platform now has a complete gamification system that:
- ✅ Rewards students for learning activities
- ✅ Creates friendly competition via leaderboards
- ✅ Encourages daily study habits with streaks
- ✅ Provides visual progress tracking
- ✅ Makes learning fun and engaging!

Happy learning! 🚀
