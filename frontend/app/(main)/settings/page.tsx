'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/src/stores/auth.store';
import { useUIStore } from '@/src/stores/ui.store';
import { authService } from '@/src/services/auth.service';
import type { Session } from '@/src/types';
import { 
  User, 
  Bell, 
  Lock, 
  Palette, 
  Globe,
  Shield,
  Eye,
  Moon,
  Sun,
  Monitor,
  Save,
  AlertCircle,
  Smartphone,
  Laptop,
  Trash2,
  RefreshCw
} from 'lucide-react';

type ThemeType = 'indigo' | 'blue' | 'amber' | 'emerald' | 'rose';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme } = useUIStore();
  
  // Profile Settings
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: '',
    location: '',
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    friendRequests: true,
    groupInvites: true,
    communityUpdates: true,
    studyReminders: true,
    weeklyDigest: false,
  });

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showActivity: true,
    allowFriendRequests: true,
    allowGroupInvites: true,
  });

  // Appearance Settings
  const [appearance, setAppearance] = useState({
    theme: theme || 'indigo',
    darkMode: 'system',
    fontSize: 'medium',
    compactMode: false,
  });

  // Security Settings
  const [security, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Session management state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState('');

  const fetchSessions = async () => {
    setSessionsLoading(true);
    setSessionError('');
    try {
      const data = await authService.getActiveSessions();
      setSessions(data);
    } catch (err: any) {
      setSessionError(err.message || 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await authService.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      setSessionError(err.message || 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    if (!userAgent) return <Globe size={18} />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone size={18} />;
    }
    return <Laptop size={18} />;
  };

  const getDeviceName = (userAgent: string) => {
    if (!userAgent) return 'Unknown device';
    const ua = userAgent;
    // Extract browser
    let browser = 'Unknown browser';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    // Extract OS
    let os = '';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    return `${browser}${os ? ' on ' + os : ''}`;
  };

  // Fetch sessions when Security tab loads
  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSave = () => {
    setSaveStatus('saving');
    // Simulate API call
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800 px-8 py-6 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Manage your account preferences and settings
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="bg-linear-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black border-b-4 border-indigo-700"
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Saving...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Save size={18} className="mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid grid-cols-5 w-full mb-8">
              <TabsTrigger value="profile" className="font-bold">
                <User size={16} className="mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="font-bold">
                <Bell size={16} className="mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" className="font-bold">
                <Lock size={16} className="mr-2" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="appearance" className="font-bold">
                <Palette size={16} className="mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="security" className="font-bold">
                <Shield size={16} className="mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-black">Profile Information</CardTitle>
                  <CardDescription>Update your personal information and profile details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-bold">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="font-bold">Bio</Label>
                    <Input
                      id="bio"
                      placeholder="Tell us about yourself"
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="font-bold">Location</Label>
                    <Input
                      id="location"
                      placeholder="City, Country"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      className="font-semibold"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-black">Notification Preferences</CardTitle>
                  <CardDescription>Choose what notifications you want to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Email Notifications</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Push Notifications</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Receive push notifications in browser</p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushNotifications: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Friend Requests</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Get notified when someone sends a friend request</p>
                    </div>
                    <Switch
                      checked={notifications.friendRequests}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, friendRequests: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Group Invites</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Get notified when invited to a group</p>
                    </div>
                    <Switch
                      checked={notifications.groupInvites}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, groupInvites: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Community Updates</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Get notified about community posts and updates</p>
                    </div>
                    <Switch
                      checked={notifications.communityUpdates}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, communityUpdates: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Study Reminders</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Get reminders for scheduled study sessions</p>
                    </div>
                    <Switch
                      checked={notifications.studyReminders}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, studyReminders: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Weekly Digest</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Receive weekly summary of your activities</p>
                    </div>
                    <Switch
                      checked={notifications.weeklyDigest}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyDigest: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-black">Privacy Settings</CardTitle>
                  <CardDescription>Control who can see your information and interact with you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Profile Visibility</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Who can view your profile</p>
                    </div>
                    <select 
                      value={privacy.profileVisibility}
                      onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
                      className="px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                    >
                      <option value="public">Everyone</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Only Me</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Show Email</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Display email on your profile</p>
                    </div>
                    <Switch
                      checked={privacy.showEmail}
                      onCheckedChange={(checked) => setPrivacy({ ...privacy, showEmail: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Show Activity</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Display your study activity to others</p>
                    </div>
                    <Switch
                      checked={privacy.showActivity}
                      onCheckedChange={(checked) => setPrivacy({ ...privacy, showActivity: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Allow Friend Requests</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Let others send you friend requests</p>
                    </div>
                    <Switch
                      checked={privacy.allowFriendRequests}
                      onCheckedChange={(checked) => setPrivacy({ ...privacy, allowFriendRequests: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Allow Group Invites</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Let others invite you to groups</p>
                    </div>
                    <Switch
                      checked={privacy.allowGroupInvites}
                      onCheckedChange={(checked) => setPrivacy({ ...privacy, allowGroupInvites: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-black">Appearance Preferences</CardTitle>
                  <CardDescription>Customize how Collabry looks for you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label className="font-bold">Theme Color</Label>
                    <div className="flex gap-3">
                      {(['indigo', 'blue', 'amber', 'emerald', 'rose'] as const).map(color => (
                        <button
                          key={color}
                          onClick={() => setAppearance({ ...appearance, theme: color as ThemeType })}
                          className={`w-16 h-16 rounded-2xl bg-${color}-500 border-4 transition-all ${
                            appearance.theme === color 
                              ? 'border-slate-800 dark:border-slate-200 scale-110' 
                              : 'border-slate-200 dark:border-slate-700 hover:scale-105'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="font-bold">Dark Mode</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setAppearance({ ...appearance, darkMode: 'light' })}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          appearance.darkMode === 'light'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Sun size={24} />
                        <span className="font-semibold text-sm">Light</span>
                      </button>
                      <button
                        onClick={() => setAppearance({ ...appearance, darkMode: 'dark' })}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          appearance.darkMode === 'dark'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Moon size={24} />
                        <span className="font-semibold text-sm">Dark</span>
                      </button>
                      <button
                        onClick={() => setAppearance({ ...appearance, darkMode: 'system' })}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          appearance.darkMode === 'system'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Monitor size={24} />
                        <span className="font-semibold text-sm">System</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Compact Mode</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Use smaller spacing and elements</p>
                    </div>
                    <Switch
                      checked={appearance.compactMode}
                      onCheckedChange={(checked) => setAppearance({ ...appearance, compactMode: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-black">Security Settings</CardTitle>
                  <CardDescription>Manage your password and security preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="font-bold">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={security.currentPassword}
                      onChange={(e) => setSecurityData({ ...security, currentPassword: e.target.value })}
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="font-bold">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={security.newPassword}
                      onChange={(e) => setSecurityData({ ...security, newPassword: e.target.value })}
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-bold">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={security.confirmPassword}
                      onChange={(e) => setSecurityData({ ...security, confirmPassword: e.target.value })}
                      className="font-semibold"
                    />
                  </div>
                  <Button variant="outline" className="w-full font-bold">
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              {/* Active Sessions */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-black">Active Sessions</CardTitle>
                      <CardDescription>Devices where you&apos;re currently logged in</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchSessions}
                      disabled={sessionsLoading}
                      className="font-semibold"
                    >
                      <RefreshCw size={14} className={`mr-1.5 ${sessionsLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {sessionError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-4">
                      <AlertCircle size={14} />
                      {sessionError}
                    </div>
                  )}

                  {sessionsLoading && sessions.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No active sessions found</p>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                              {getDeviceIcon(session.userAgent)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                {getDeviceName(session.userAgent)}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                {session.ipAddress || 'Unknown IP'} &middot; {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeSession(session.id)}
                            disabled={revokingSessionId === session.id}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold shrink-0 ml-2"
                          >
                            {revokingSessionId === session.id ? (
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-rose-300 border-t-rose-600" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-black">Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Enable 2FA</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Require a code in addition to your password</p>
                    </div>
                    <Switch
                      checked={security.twoFactorEnabled}
                      onCheckedChange={(checked) => setSecurityData({ ...security, twoFactorEnabled: checked })}
                    />
                  </div>
                  {security.twoFactorEnabled && (
                    <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="text-indigo-600 dark:text-indigo-400 mt-0.5" size={20} />
                        <div>
                          <p className="font-bold text-indigo-900 dark:text-indigo-100">2FA is enabled</p>
                          <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                            You'll need to use your authenticator app to log in
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-rose-200 dark:border-rose-800">
                <CardHeader>
                  <CardTitle className="font-black text-rose-600 dark:text-rose-400">Danger Zone</CardTitle>
                  <CardDescription>Irreversible account actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
