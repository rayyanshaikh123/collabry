'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, ProgressBar, Input } from '../components/UIElements';
import { ICONS } from '../constants';
import { useAuthStore } from '@/lib/stores/auth.store';
import { gamificationService, GamificationStats } from '@/lib/services/gamification.service';
import { authService } from '@/lib/services/auth.service';

// Modal component
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl border-4 border-indigo-50 dark:border-indigo-900/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ICONS.X size={20} />
        </button>
        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-6">{title}</h3>
        {children}
      </div>
    </div>
  );
};

// Default badges for display
const DEFAULT_BADGES = [
  { id: 'first_step', name: 'First Step', icon: '🎯', color: 'bg-yellow-100 dark:bg-yellow-900/30', description: 'Complete your first task' },
  { id: 'streak_7', name: 'Week Warrior', icon: '🔥', color: 'bg-orange-100 dark:bg-orange-900/30', description: '7-day streak' },
  { id: 'task_crusher', name: 'Task Crusher', icon: '💪', color: 'bg-rose-100 dark:bg-rose-900/30', description: 'Complete 50 tasks' },
  { id: 'time_lord', name: 'Time Lord', icon: '⏰', color: 'bg-indigo-100 dark:bg-indigo-900/30', description: '100+ study hours' },
  { id: 'planner_pro', name: 'Planner Pro', icon: '📋', color: 'bg-emerald-100 dark:bg-emerald-900/30', description: 'Create 10 plans' },
  { id: 'quiz_master', name: 'Quiz Master', icon: '🎓', color: 'bg-sky-100 dark:bg-sky-900/30', description: '25 quizzes completed' },
];

const ProfileView: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  
  // Form states
  const [editName, setEditName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  
  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const userInitials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U';
  const joinedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : 'Unknown';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user?.name) {
      setEditName(user.name);
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load gamification stats
      const gamificationStats = await gamificationService.getUserStats();
      setStats(gamificationStats);
      
      // Load subscription
      const authStorage = localStorage.getItem('auth-storage');
      let token = '';
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        token = state?.accessToken || '';
      }
      
      if (token) {
        const subResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://colab-back.onrender.com/api'}/subscriptions/current`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const subData = await subResponse.json();
        if (subData.success) {
          setSubscription(subData.data);
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async () => {
    if (!editName.trim()) {
      setActionError('Name is required');
      return;
    }

    setActionLoading(true);
    setActionError('');
    
    try {
      await authService.updateProfile({ name: editName.trim() });
      setActionSuccess('Profile updated successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      setEditProfileOpen(false);
      // Refresh user data
      window.location.reload();
    } catch (error: any) {
      setActionError(error.message || 'Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setActionError('All fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setActionError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setActionError('Password must be at least 6 characters');
      return;
    }

    setActionLoading(true);
    setActionError('');
    
    try {
      await authService.changePassword(currentPassword, newPassword);
      setActionSuccess('Password changed successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      setChangePasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setActionError(error.message || 'Failed to change password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setActionError('Password is required to delete account');
      return;
    }

    setActionLoading(true);
    setActionError('');
    
    try {
      await authService.deleteAccount(deletePassword);
      logout();
      router.push('/');
    } catch (error: any) {
      setActionError(error.message || 'Failed to delete account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShareProfile = () => {
    const profileUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${user?.name}'s Profile - Collabry`,
        text: `Check out ${user?.name}'s learning journey on Collabry!`,
        url: profileUrl,
      });
    } else {
      navigator.clipboard.writeText(profileUrl);
      setActionSuccess('Profile link copied to clipboard!');
      setTimeout(() => setActionSuccess(''), 3000);
    }
  };

  // Get user's unlocked badges or show placeholders
  const userBadges = stats?.badges && stats.badges.length > 0 
    ? stats.badges.map(badge => ({
        ...badge,
        color: 'bg-amber-100 dark:bg-amber-900/30',
      }))
    : DEFAULT_BADGES.slice(0, 6).map(badge => ({
        ...badge,
        locked: true,
      }));

  // Calculate experience/progress data
  const experienceData = stats ? [
    { 
      label: 'Study Time', 
      progress: Math.min(100, (stats.stats.totalStudyTime / 6000) * 100), // 100 hours = 100%
      color: 'bg-indigo-500',
      value: `${Math.round(stats.stats.totalStudyTime / 60)} hrs`
    },
    { 
      label: 'Tasks Completed', 
      progress: Math.min(100, (stats.stats.tasksCompleted / 100) * 100), // 100 tasks = 100%
      color: 'bg-emerald-500',
      value: stats.stats.tasksCompleted.toString()
    },
    { 
      label: 'Quizzes', 
      progress: Math.min(100, (stats.stats.quizzesCompleted / 25) * 100), // 25 quizzes = 100%
      color: 'bg-rose-500',
      value: stats.stats.quizzesCompleted.toString()
    },
  ] : [];

  // Get plan display name
  const getPlanName = () => {
    if (subscription?.plan) {
      const planNames: Record<string, string> = {
        'free': 'FREE EXPLORER',
        'basic': 'BASIC LEARNER',
        'pro': 'PRO EXPLORER',
        'enterprise': 'ENTERPRISE',
      };
      return planNames[subscription.plan] || subscription.plan.toUpperCase();
    }
    return user?.subscriptionTier?.toUpperCase() || 'FREE';
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Success Toast */}
      {actionSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg font-bold">
          {actionSuccess}
        </div>
      )}

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-4 border-indigo-50 dark:border-indigo-900/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-indigo-500/10 dark:bg-indigo-500/20 z-0" />
        <div className="relative z-10 shrink-0">
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-8 border-white dark:border-slate-800 shadow-2xl object-cover" 
              alt={user.name} 
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-8 border-white dark:border-slate-800 shadow-2xl bg-linear-to-br from-indigo-400 to-indigo-600 dark:from-indigo-500 dark:to-indigo-700 flex items-center justify-center text-white font-black text-5xl">
              {userInitials}
            </div>
          )}
          <button 
            onClick={() => setEditProfileOpen(true)}
            className="absolute -bottom-2 -right-2 bg-indigo-600 dark:bg-indigo-500 text-white p-3 rounded-2xl shadow-lg border-4 border-white dark:border-slate-800 bouncy-hover"
          >
            <ICONS.Plus size={18} strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 text-center md:text-left z-10 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <h2 className="text-4xl font-black text-slate-800 dark:text-slate-200">{user?.name || 'User'}</h2>
            <Badge variant="indigo" className="capitalize">{user?.role || 'Student'}</Badge>
            {stats && (
              <Badge variant="amber" className="flex items-center gap-1">
                <span>Level {stats.level}</span>
                <span className="text-xs">({stats.xp} XP)</span>
              </Badge>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-bold">{user?.email || 'No email available'}</p>
          {stats && stats.streak.current > 0 && (
            <p className="text-amber-500 font-bold flex items-center justify-center md:justify-start gap-2">
              🔥 {stats.streak.current} day streak!
            </p>
          )}
          <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
            <Button variant="primary" className="gap-2 px-8 shadow-indigo-100" onClick={() => setEditProfileOpen(true)}>
              <ICONS.Profile size={18} /> Edit Profile
            </Button>
            <Link href="/usage">
              <Button variant="outline" className="gap-2 px-8">
                <ICONS.Focus size={18} /> View AI Usage
              </Button>
            </Link>
            <Button variant="outline" className="gap-2 px-8" onClick={handleShareProfile}>
              <ICONS.Share size={18} /> Share Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Achievements & Badges */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Achievement Hall</h3>
              {stats && (
                <Badge variant="indigo">{stats.badges?.length || 0} Unlocked</Badge>
              )}
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                {userBadges.map((badge: any, i) => (
                  <div 
                    key={badge.id || i} 
                    className={`flex flex-col items-center gap-3 bouncy-hover cursor-pointer group ${badge.locked ? 'opacity-40' : ''}`}
                    title={badge.description}
                  >
                    <div className={`w-20 h-20 ${badge.color} rounded-[2rem] flex items-center justify-center text-4xl shadow-md border-b-4 border-slate-200 dark:border-slate-700 group-hover:border-indigo-400 dark:group-hover:border-indigo-600 relative`}>
                      {badge.icon}
                      {badge.locked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-500/20 rounded-[2rem]">
                          <ICONS.Lock size={24} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase text-center">
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-6">Experience Tracker</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : stats ? (
              <div className="space-y-6">
                {experienceData.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
                    </div>
                    <ProgressBar progress={item.progress} color={item.color} />
                  </div>
                ))}
                
                {/* Level Progress */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Level Progress</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {stats.xp} / {stats.xpToNextLevel} XP
                    </span>
                  </div>
                  <ProgressBar progress={stats.levelProgress} color="bg-amber-500" />
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">Start studying to track your progress!</p>
            )}
          </Card>
        </div>

        {/* Account Settings */}
        <div className="space-y-8">
          <Card className="border-indigo-50 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-900/20">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Private Info</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest ml-1">Email</label>
                <Input value={user?.email || 'Not available'} disabled />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest ml-1">Joined Date</label>
                <Input value={joinedDate} disabled />
              </div>
              <div className="pt-4 space-y-3">
                <Button variant="secondary" className="w-full text-xs py-3" onClick={() => setChangePasswordOpen(true)}>
                  Change Password
                </Button>
                <Button variant="danger" className="w-full text-xs py-3" onClick={() => setDeleteAccountOpen(true)}>
                  Delete Journey
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-linear-to-br from-amber-400 dark:from-amber-500 to-amber-500 dark:to-amber-600 text-slate-900 dark:text-slate-200 border-none">
            <div className="flex items-center gap-3 mb-4">
              <ICONS.Trophy size={28} strokeWidth={3} />
              <h3 className="text-xl font-black">Membership</h3>
            </div>
            <p className="text-sm font-bold opacity-80 mb-6">
              You're on the <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg">{getPlanName()}</span> plan. 
              {subscription?.plan === 'pro' || subscription?.plan === 'enterprise' ? ' All features unlocked!' : ' Upgrade for more features!'}
            </p>
            <Link href="/subscription">
              <Button variant="secondary" className="w-full text-amber-600 dark:text-amber-400">Manage Plan</Button>
            </Link>
          </Card>

          {/* Stats Summary */}
          {stats && (
            <Card>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.stats.plansCreated}</p>
                  <p className="text-xs font-bold text-slate-500">Plans Created</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.stats.notesCreated}</p>
                  <p className="text-xs font-bold text-slate-500">Notes Created</p>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl">
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.streak.longest}</p>
                  <p className="text-xs font-bold text-slate-500">Best Streak</p>
                </div>
                <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/30 rounded-2xl">
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.level}</p>
                  <p className="text-xs font-bold text-slate-500">Current Level</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={editProfileOpen} onClose={() => { setEditProfileOpen(false); setActionError(''); }} title="Edit Profile">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Name</label>
            <Input 
              value={editName} 
              onChange={(e) => setEditName(e.target.value)} 
              placeholder="Your name"
            />
          </div>
          {actionError && <p className="text-red-500 text-sm font-bold">{actionError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setEditProfileOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleEditProfile} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={changePasswordOpen} onClose={() => { setChangePasswordOpen(false); setActionError(''); }} title="Change Password">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Current Password</label>
            <Input 
              type="password"
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
              placeholder="Enter current password"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">New Password</label>
            <Input 
              type="password"
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Confirm New Password</label>
            <Input 
              type="password"
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Confirm new password"
            />
          </div>
          {actionError && <p className="text-red-500 text-sm font-bold">{actionError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setChangePasswordOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleChangePassword} disabled={actionLoading}>
              {actionLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={deleteAccountOpen} onClose={() => { setDeleteAccountOpen(false); setActionError(''); }} title="Delete Account">
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl">
            <p className="text-red-600 dark:text-red-400 font-bold text-sm">
              ⚠️ This action is irreversible! All your data, progress, and achievements will be permanently deleted.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Enter Password to Confirm</label>
            <Input 
              type="password"
              value={deletePassword} 
              onChange={(e) => setDeletePassword(e.target.value)} 
              placeholder="Enter your password"
            />
          </div>
          {actionError && <p className="text-red-500 text-sm font-bold">{actionError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteAccountOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteAccount} disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfileView;

