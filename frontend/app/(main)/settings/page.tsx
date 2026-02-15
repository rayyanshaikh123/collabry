'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { authService } from '@/lib/services/auth.service';
import { apiClient } from '@/lib/api';
import type { Session } from '@/types/user.types';
import type { ThemeType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  Shield,
  Moon,
  Sun,
  Monitor,
  Save,
  AlertCircle,
  Smartphone,
  Laptop,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';

import NotificationHistory from '@/components/NotificationHistory';
import ApiKeyCard from '@/components/settings/ApiKeyCard';

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, setUser } = useAuthStore();
  const { theme, setTheme, darkMode, setDarkMode } = useUIStore();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';

  // Profile Settings
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // BYOK (Bring Your Own Key) State
  const [apiKeys, setApiKeys] = useState<Record<string, any>>({});
  const [byokSettings, setByokSettings] = useState({
    enabled: false,
    activeProvider: null,
    fallbackToSystem: true
  });
  const [byokLoading, setByokLoading] = useState(false);

  // Security Settings
  const [security, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
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
      toast({ title: 'Success', description: 'Session revoked successfully' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to revoke session' });
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
    fetchApiKeys();
  }, []);

  // Fetch API keys
  const fetchApiKeys = async () => {
    try {
      const response = await apiClient.get('/apikeys');
      
      if (response.success) {
        const keysMap: Record<string, any> = {};
        response.data.keys.forEach((key: any) => {
          keysMap[key.provider] = key;
        });
        setApiKeys(keysMap);
        setByokSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const handleAddKey = async (provider: string, apiKey: string) => {
    try {
      const response = await apiClient.post('/apikeys', { provider, apiKey });
      
      if (response.success) {
        toast({ title: 'Success', description: `${provider} API key added successfully` });
        fetchApiKeys();
      } else {
        throw new Error(response.message || 'Failed to add API key');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      throw error;
    }
  };

  const handleActivateKey = async (provider: string) => {
    try {
      const response = await apiClient.put(`/apikeys/${provider}`, { isActive: true });
      
      if (response.success) {
        toast({ title: 'Success', description: `${provider} is now active` });
        fetchApiKeys();
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDeleteKey = async (provider: string) => {
    try {
      const response = await apiClient.delete(`/apikeys/${provider}`);
      
      if (response.success) {
        toast({ title: 'Success', description: 'API key deleted' });
        fetchApiKeys();
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleValidateKey = async (provider: string) => {
    try {
      const response = await apiClient.post(`/apikeys/${provider}/validate`);
      
      if (response.success) {
        if (response.data.isValid) {
          toast({ title: 'Valid', description: 'API key is working correctly' });
        } else {
          toast({ variant: 'destructive', title: 'Invalid', description: 'API key validation failed' });
        }
        fetchApiKeys();
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleToggleByok = async (enabled: boolean) => {
    try {
      const response = await apiClient.post('/apikeys/settings', { enabled });
      
      if (response.success) {
        setByokSettings(response.data);
        toast({ 
          title: enabled ? 'BYOK Enabled' : 'BYOK Disabled',
          description: enabled 
            ? 'You are now using your own API keys'
            : 'Switched back to platform limits'
        });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleProfileSave = async () => {
    setSaveStatus('saving');
    try {
      const updatedUser = await authService.updateProfile({ name: profileData.name });
      setUser(updatedUser);
      setSaveStatus('saved');
      toast({ title: 'Success', description: 'Profile updated successfully' });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      setSaveStatus('error');
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update profile' });
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handlePasswordUpdate = async () => {
    if (security.newPassword !== security.confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match' });
      return;
    }

    try {
      await authService.changePassword(security.currentPassword, security.newPassword);
      toast({ title: 'Success', description: 'Password updated successfully. Please login again.' });
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Ideally redirect to login or logout
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update password' });
    }
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
          {/* Only show save button on profile tab */}
          <Button
            onClick={handleProfileSave}
            disabled={saveStatus === 'saving' || (user?.name === profileData.name)}
            className={`bg-linear-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black border-b-4 border-indigo-700 ${saveStatus === 'saved' ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-700' : ''}`}
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
                Save Profile
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="grid grid-cols-5 w-full mb-8">
              <TabsTrigger value="profile" className="font-bold">
                <User size={16} className="mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="font-bold">
                <Bell size={16} className="mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance" className="font-bold">
                <Palette size={16} className="mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="security" className="font-bold">
                <Shield size={16} className="mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="apikeys" className="font-bold">
                <Key size={16} className="mr-2" />
                API Keys
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-black">Profile Information</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
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
                      disabled
                      className="font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500"
                    />
                    <p className="text-xs text-slate-400">Email cannot be changed directly.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              {/* Notification History */}
              <div className="mt-8">
                <NotificationHistory />
              </div>
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
                    <div className="grid grid-cols-6 gap-3">
                      {(['indigo', 'blue', 'amber', 'emerald', 'rose', 'purple', 'cyan', 'pink', 'teal', 'violet', 'orange', 'yellow'] as const).map(color => (
                        <button
                          key={color}
                          onClick={() => setTheme(color as ThemeType)}
                          className={`w-16 h-16 rounded-2xl bg-${color}-500 border-4 transition-all ${theme === color
                            ? 'border-slate-800 dark:border-slate-200 scale-110'
                            : 'border-slate-200 dark:border-slate-700 hover:scale-105'
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="font-bold">Dark Mode</Label>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      <button
                        onClick={() => setDarkMode(false)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${!darkMode
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                      >
                        <Sun size={24} />
                        <span className="font-semibold text-sm">Light</span>
                      </button>
                      <button
                        onClick={() => setDarkMode(true)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${darkMode
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                      >
                        <Moon size={24} />
                        <span className="font-semibold text-sm">Dark</span>
                      </button>
                    </div>
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
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword.current ? "text" : "password"}
                        value={security.currentPassword}
                        onChange={(e) => setSecurityData({ ...security, currentPassword: e.target.value })}
                        className="font-semibold pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="font-bold">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword.new ? "text" : "password"}
                        value={security.newPassword}
                        onChange={(e) => setSecurityData({ ...security, newPassword: e.target.value })}
                        className="font-semibold pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-bold">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPassword.confirm ? "text" : "password"}
                        value={security.confirmPassword}
                        onChange={(e) => setSecurityData({ ...security, confirmPassword: e.target.value })}
                        className="font-semibold pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <Button onClick={handlePasswordUpdate} variant="outline" className="w-full font-bold text-slate-50 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
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
                      className="font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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

              <Card className="border-rose-200 dark:border-rose-800">
                <CardHeader>
                  <CardTitle className="font-black text-rose-600 dark:text-rose-400">Danger Zone</CardTitle>
                  <CardDescription>Irreversible account actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full font-bold text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="apikeys" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-black">Bring Your Own API Keys</CardTitle>
                  <CardDescription>
                    Use your own AI provider API keys to bypass usage limits. Your keys are encrypted and secure.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* BYOK Enable/Disable Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-800">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">Enable Custom API Keys</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Use your own keys instead of platform limits
                      </p>
                    </div>
                    <Switch
                      checked={byokSettings.enabled}
                      onCheckedChange={handleToggleByok}
                    />
                  </div>

                  {/* Provider Cards */}
                  <div className="space-y-4">
                    {(['openai', 'groq', 'gemini'] as const).map(provider => (
                      <ApiKeyCard
                        key={provider}
                        provider={provider}
                        keyData={apiKeys[provider]}
                        isActive={byokSettings.activeProvider === provider}
                        onAdd={handleAddKey}
                        onActivate={handleActivateKey}
                        onDelete={handleDeleteKey}
                        onValidate={handleValidateKey}
                      />
                    ))}
                  </div>

                  {/* Info Alert */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
                    <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      <p className="font-bold mb-1">How it works:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                        <li>Your API keys are encrypted with AES-256-GCM</li>
                        <li>Keys are never stored in plain text</li>
                        <li>When enabled, all AI features use your key</li>
                        <li>Your usage won't count against platform limits</li>
                        <li>You'll be billed directly by the AI provider</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
