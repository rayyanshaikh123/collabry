# 🎮 How to Add Gamification to Your Profile Page

## Quick Integration Guide

### 1. Import the Components

Add to your Profile page (e.g., `frontend/views/Profile.tsx`):

```tsx
import AchievementsDisplay from '../components/gamification/AchievementsDisplay';
import Leaderboard from '../components/gamification/Leaderboard';
```

### 2. Add Tabs or Sections

```tsx
const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile'); // or 'achievements', 'leaderboard'

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <Button 
          variant={activeTab === 'profile' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </Button>
        <Button 
          variant={activeTab === 'achievements' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('achievements')}
        >
          Achievements
        </Button>
        <Button 
          variant={activeTab === 'leaderboard' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'profile' && (
        <div>
          {/* Your existing profile content */}
        </div>
      )}

      {activeTab === 'achievements' && (
        <AchievementsDisplay />
      )}

      {activeTab === 'leaderboard' && (
        <div className="space-y-8">
          <Leaderboard type="xp" />
          <Leaderboard friendsOnly={true} />
        </div>
      )}
    </div>
  );
};
```

### 3. Or Add Directly Below Profile

```tsx
const Profile = () => {
  return (
    <div className="space-y-12">
      {/* Existing Profile Section */}
      <section>
        <h2>My Profile</h2>
        {/* Your profile content */}
      </section>

      {/* Gamification Section */}
      <section>
        <h2 className="text-3xl font-black mb-6">My Achievements</h2>
        <AchievementsDisplay />
      </section>

      {/* Leaderboard Section */}
      <section>
        <h2 className="text-3xl font-black mb-6">Rankings</h2>
        <Leaderboard type="xp" limit={10} />
      </section>
    </div>
  );
};
```

## Component Props

### AchievementsDisplay
```tsx
<AchievementsDisplay />
// No props needed - automatically fetches current user's data
```

### Leaderboard
```tsx
// Global leaderboard by XP
<Leaderboard type="xp" limit={10} />

// Global leaderboard by Level
<Leaderboard type="level" limit={10} />

// Global leaderboard by Streak
<Leaderboard type="streak" limit={10} />

// Global leaderboard by Tasks Completed
<Leaderboard type="tasks" limit={10} />

// Friend leaderboard (shows only friends + you)
<Leaderboard friendsOnly={true} />
```

## Example: Full Profile with Gamification

```tsx
'use client';

import React, { useState } from 'react';
import { Card, Button, Badge } from '../components/UIElements';
import { ICONS } from '../constants';
import { useAuthStore } from '../src/stores/auth.store';
import AchievementsDisplay from '../components/gamification/AchievementsDisplay';
import Leaderboard from '../components/gamification/Leaderboard';

const Profile = () => {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Profile Header */}
      <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <div className="flex items-center gap-6">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-black">
              {user?.name?.split(' ').map(n => n[0]).join('')}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black">{user?.name}</h1>
            <p className="text-indigo-100">{user?.email}</p>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeSection === 'overview' ? 'primary' : 'outline'}
          onClick={() => setActiveSection('overview')}
          className="gap-2"
        >
          <ICONS.User size={16} />
          Overview
        </Button>
        <Button
          variant={activeSection === 'achievements' ? 'primary' : 'outline'}
          onClick={() => setActiveSection('achievements')}
          className="gap-2"
        >
          <ICONS.Trophy size={16} />
          Achievements
        </Button>
        <Button
          variant={activeSection === 'leaderboard' ? 'primary' : 'outline'}
          onClick={() => setActiveSection('leaderboard')}
          className="gap-2"
        >
          <ICONS.Users size={16} />
          Leaderboard
        </Button>
      </div>

      {/* Content Sections */}
      {activeSection === 'overview' && (
        <div>
          <h2 className="text-2xl font-black mb-6">Account Information</h2>
          {/* Your existing profile content */}
        </div>
      )}

      {activeSection === 'achievements' && (
        <div>
          <h2 className="text-2xl font-black mb-6">Achievements & Progress</h2>
          <AchievementsDisplay />
        </div>
      )}

      {activeSection === 'leaderboard' && (
        <div className="space-y-12">
          <div>
            <h2 className="text-2xl font-black mb-6">Friend Rankings</h2>
            <Leaderboard friendsOnly={true} />
          </div>
          <div>
            <h2 className="text-2xl font-black mb-6">Global Leaderboard</h2>
            <Leaderboard type="xp" limit={20} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
```

## Testing the Integration

1. **View Dashboard** - See your XP, level, and streak
2. **Complete a Task** - Earn 20+ XP
3. **Check Notifications** - Get level-up/badge notifications
4. **View Profile** - See all achievements and badges
5. **Check Leaderboard** - See your ranking

## Styling Tips

The components use your existing design system:
- Tailwind CSS classes
- Dark mode support
- Responsive design
- Matches your app's color scheme

## Need Help?

Check the full documentation:
- `GAMIFICATION_SYSTEM.md` - Complete system documentation
- `GAMIFICATION_QUICK_SUMMARY.md` - Quick overview

Enjoy the gamification! 🎉
