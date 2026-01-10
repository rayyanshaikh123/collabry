'use client';


import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, ProgressBar, Input } from '../components/UIElements';
import { ICONS } from '../constants';
import { AppRoute } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area } from 'recharts';
import { adminService, type UserFormData } from '../src/services/admin.service';
import { usageService, type GlobalUsage, type RealtimeStats } from '../src/services/usage.service';
import { reportService, type Report, type ReportStats } from '../src/services/report.service';
import { adminBoardService, type AdminBoard, type BoardStats } from '../src/services/adminBoard.service';
import { settingsService, type PlatformSettings } from '../src/services/settings.service';
import type { User } from '../src/types/user.types';
import AlertModal from '../components/AlertModal';
import { useAlert } from '../src/hooks/useAlert';

interface AdminDashboardProps {
  currentSubRoute: AppRoute;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentSubRoute }) => {
  // Alert modal
  const { alertState, showAlert, hideAlert } = useAlert();
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'student',
    isActive: true,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Usage tracking state
  const [globalUsage, setGlobalUsage] = useState<GlobalUsage | null>(null);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  // Moderation state
  const [reports, setReports] = useState<Report[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState('none');

  // Board governance state
  const [boards, setBoards] = useState<AdminBoard[]>([]);
  const [boardStats, setBoardStats] = useState<BoardStats | null>(null);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardSearchTerm, setBoardSearchTerm] = useState('');
  const [boardPage, setBoardPage] = useState(1);
  const [boardTotalPages, setBoardTotalPages] = useState(1);

  // Platform settings state
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsEditing, setSettingsEditing] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState<PlatformSettings | null>(null);

  // Load users when viewing users section
  useEffect(() => {
    if (currentSubRoute === AppRoute.ADMIN_USERS) {
      loadUsers();
    }
  }, [currentSubRoute, currentPage, searchTerm]);

  // Load boards when viewing board governance section
  useEffect(() => {
    if (currentSubRoute === AppRoute.ADMIN_BOARDS) {
      loadBoards();
      loadBoardStats();
    }
  }, [currentSubRoute, boardPage, boardSearchTerm]);

  // Load settings when viewing settings section
  useEffect(() => {
    if (currentSubRoute === AppRoute.ADMIN_SETTINGS) {
      loadSettings();
    }
  }, [currentSubRoute]);

  // Load reports when viewing moderation section
  useEffect(() => {
    if (currentSubRoute === AppRoute.ADMIN_MODERATION) {
      loadReports();
      loadReportStats();
    }
  }, [currentSubRoute]);

  // Load total user count on mount
  useEffect(() => {
    loadTotalUsers();
  }, []);

  // Load usage data for AI monitoring section
  useEffect(() => {
    if (currentSubRoute === AppRoute.ADMIN_AI) {
      loadUsageData();
    }
  }, [currentSubRoute]);

  // Poll realtime stats every 30 seconds when on dashboard or AI page
  useEffect(() => {
    if (currentSubRoute === AppRoute.ADMIN || currentSubRoute === AppRoute.ADMIN_AI) {
      loadRealtimeStats();
      const interval = setInterval(loadRealtimeStats, 30000);
      return () => clearInterval(interval);
    }
  }, [currentSubRoute]);

  const loadTotalUsers = async () => {
    try {
      // Get total user count from the database
      const data = await adminService.getUsers({ page: 1, limit: 1 });
      setTotalUsers(data.total || 0);
    } catch (error) {
      console.error('Failed to load user count:', error);
    }
  };

  const loadUserNames = async (userIds: string[]) => {
    try {
      // Fetch all users to get their names
      const data = await adminService.getUsers({ page: 1, limit: 100 });
      const nameMap: Record<string, string> = {};
      
      data.users.forEach((user: User) => {
        if (userIds.includes(user.id)) {
          nameMap[user.id] = user.name;
        }
      });
      
      setUserNames(nameMap);
    } catch (error) {
      console.error('Failed to load user names:', error);
    }
  };

  const loadUsageData = async () => {
    try {
      setUsageLoading(true);
      
      // Get health with realtime stats (no auth required)
      try {
        const health = await usageService.getHealth();
        if (health.usage_stats) {
          setRealtimeStats(health.usage_stats);
        }
      } catch (healthError: any) {
        console.warn('AI engine unavailable, health check failed');
        setRealtimeStats(null);
      }
      
      // Try to get public stats (no auth required)
      try {
        const usage = await usageService.getPublicStats(7);
        setGlobalUsage(usage);
        
        // Fetch user names for top users
        if (usage.top_users && usage.top_users.length > 0) {
          const userIds = usage.top_users.map(u => u.user_id);
          await loadUserNames(userIds);
        }
      } catch (statsError: any) {
        console.warn('Could not load public stats, trying authenticated endpoint');
        // Fallback to authenticated endpoint
        try {
          const usage = await usageService.getGlobalUsage(7);
          setGlobalUsage(usage);
          
          // Fetch user names for top users
          if (usage.top_users && usage.top_users.length > 0) {
            const userIds = usage.top_users.map(u => u.user_id);
            await loadUserNames(userIds);
          }
        } catch (authError: any) {
          console.warn('AI engine unavailable, usage stats not loaded');
          setGlobalUsage(null);
        }
      }
    } catch (error: any) {
      console.warn('Failed to load usage data, AI engine may be offline');
      setGlobalUsage(null);
      setRealtimeStats(null);
    } finally {
      setUsageLoading(false);
    }
  };

  const loadRealtimeStats = async () => {
    try {
      const health = await usageService.getHealth();
      if (health.usage_stats) {
        setRealtimeStats(health.usage_stats);
      }
    } catch (error: any) {
      console.warn('AI engine unavailable, realtime stats not loaded');
      setRealtimeStats(null);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers({
        page: currentPage,
        limit: 10,
        search: searchTerm,
      });
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'student',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editingUser) {
        await adminService.updateUser(editingUser.id, formData);
      } else {
        if (!formData.password) {
          showAlert({
            type: 'warning',
            title: 'Missing Password',
            message: 'Password is required for new users'
          });
          return;
        }
        await adminService.createUser(formData);
      }
      setShowModal(false);
      loadUsers();
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Operation Failed',
        message: error.message || 'Operation failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;

    try {
      setLoading(true);
      await adminService.deleteUser(user.id);
      loadUsers();
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Delete Failed',
        message: error.message || 'Failed to delete user'
      });
    } finally {
      setLoading(false);
    }
  };

  // Report/Moderation functions
  const loadReports = async () => {
    try {
      setReportsLoading(true);
      const data = await reportService.getReports({
        status: 'pending',
        limit: 50
      });
      setReports(data.reports || []);
    } catch (error: any) {
      console.error('Failed to load reports:', error.message || error);
      setReports([]);
      showAlert({
        type: 'error',
        title: 'Load Failed',
        message: 'Could not load reports. Please check your connection.'
      });
    } finally {
      setReportsLoading(false);
    }
  };

  const loadReportStats = async () => {
    try {
      const stats = await reportService.getReportStats();
      setReportStats(stats);
    } catch (error: any) {
      console.error('Failed to load report stats:', error.message || error);
      setReportStats(null);
    }
  };

  const handleDismissReport = async (report: Report) => {
    try {
      setReportsLoading(true);
      await reportService.dismissReport(report._id, 'Not a violation');
      showAlert({
        type: 'success',
        title: 'Report Dismissed',
        message: 'Report has been dismissed successfully'
      });
      loadReports();
      loadReportStats();
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Operation Failed',
        message: error.message || 'Failed to dismiss report'
      });
    } finally {
      setReportsLoading(false);
    }
  };

  const handleTakeAction = (report: Report) => {
    setSelectedReport(report);
    setShowReportModal(true);
    setActionNotes('');
    setSelectedAction('none');
  };

  const handleSubmitAction = async () => {
    if (!selectedReport) return;

    try {
      setReportsLoading(true);
      await reportService.resolveReport(selectedReport._id, {
        action: selectedAction,
        reviewNotes: actionNotes
      });
      showAlert({
        type: 'success',
        title: 'Action Taken',
        message: 'Report has been resolved successfully'
      });
      setShowReportModal(false);
      loadReports();
      loadReportStats();
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Operation Failed',
        message: error.message || 'Failed to resolve report'
      });
    } finally {
      setReportsLoading(false);
    }
  };

  // Board governance functions
  const loadBoards = async () => {
    try {
      setBoardsLoading(true);
      const data = await adminBoardService.getAllBoards({
        page: boardPage,
        limit: 20,
        search: boardSearchTerm
      });
      setBoards(data.boards || []);
      setBoardTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setBoardsLoading(false);
    }
  };

  const loadBoardStats = async () => {
    try {
      const stats = await adminBoardService.getBoardStats();
      setBoardStats(stats);
    } catch (error: any) {
      console.error('Failed to load board stats:', error.message || error);
      setBoardStats(null);
    }
  };

  const handleSuspendBoard = async (board: AdminBoard) => {
    const reason = prompt(`Enter reason for suspending "${board.title}":`);
    if (!reason) return;

    try {
      setBoardsLoading(true);
      await adminBoardService.suspendBoard(board._id, reason);
      showAlert({
        type: 'success',
        title: 'Board Suspended',
        message: `"${board.title}" has been suspended`
      });
      loadBoards();
      loadBoardStats();
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Operation Failed',
        message: error.message || 'Failed to suspend board'
      });
    } finally {
      setBoardsLoading(false);
    }
  };

  const handleForceDeleteBoard = async (board: AdminBoard) => {
    if (!confirm(`Permanently delete "${board.title}"? This cannot be undone!`)) return;

    try {
      setBoardsLoading(true);
      await adminBoardService.forceDeleteBoard(board._id);
      showAlert({
        type: 'success',
        title: 'Board Deleted',
        message: `"${board.title}" has been permanently deleted`
      });
      loadBoards();
      loadBoardStats();
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Delete Failed',
        message: error.message || 'Failed to delete board'
      });
    } finally {
      setBoardsLoading(false);
    }
  };

  // Platform settings functions
  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      const data = await settingsService.getSettings();
      
      // Ensure all nested objects exist with defaults
      const normalizedSettings: PlatformSettings = {
        ...data,
        platform: data.platform || { name: '', description: '', maintenanceMode: false, maintenanceMessage: '' },
        email: data.email || { enabled: false, service: '', from: '', templates: { welcome: '', passwordReset: '', boardInvite: '' } },
        ai: data.ai || { enabled: false, baseUrl: '', timeout: 30000, maxTokens: 4000, rateLimits: { perUser: 100, perHour: 1000 } },
        features: data.features || { studyBoard: true, voiceChat: true, studyPlanner: true, aiTutor: true, collaborativeNotes: true },
        storage: data.storage || { maxFileSize: 52428800, maxBoardElements: 10000, maxBoardsPerUser: 50 },
        security: data.security || { jwtExpiresIn: '7d', bcryptRounds: 10, passwordMinLength: 8, enableTwoFactor: false },
        analytics: data.analytics || { enabled: true, trackUserActivity: true, trackBoardUsage: true, retentionDays: 90 }
      };
      
      setSettings(normalizedSettings);
      setSettingsFormData(normalizedSettings);
    } catch (error: any) {
      console.error('Failed to load settings:', error.message || error);
      setSettings(null);
      setSettingsFormData(null);
      showAlert({
        type: 'error',
        title: 'Load Failed',
        message: 'Could not load platform settings. Please check your connection.'
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleEditSettings = () => {
    setSettingsEditing(true);
  };

  const handleCancelEditSettings = () => {
    setSettingsEditing(false);
    setSettingsFormData(settings);
  };

  const handleSaveSettings = async () => {
    if (!settingsFormData) return;

    try {
      setSettingsLoading(true);
      const updated = await settingsService.updateSettings(settingsFormData);
      setSettings(updated);
      setSettingsFormData(updated);
      setSettingsEditing(false);
      showAlert({
        type: 'success',
        title: 'Settings Saved',
        message: 'Platform settings have been updated successfully'
      });
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Save Failed',
        message: error.message || 'Failed to save settings'
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const updateSettingsField = (category: keyof PlatformSettings, field: string, value: any) => {
    if (!settingsFormData) return;
    
    setSettingsFormData({
      ...settingsFormData,
      [category]: {
        ...(settingsFormData[category] as any),
        [field]: value
      }
    });
  };

  const updateNestedSettingsField = (category: keyof PlatformSettings, parent: string, field: string, value: any) => {
    if (!settingsFormData) return;
    
    setSettingsFormData({
      ...settingsFormData,
      [category]: {
        ...(settingsFormData[category] as any),
        [parent]: {
          ...((settingsFormData[category] as any)[parent]),
          [field]: value
        }
      }
    });
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await adminService.updateUser(user.id, { isActive: !user.isActive });
      loadUsers();
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update status'
      });
    }
  };
  
  const stats = [
    { 
      label: 'Total Explorers', 
      value: totalUsers > 0 ? totalUsers.toString() : (globalUsage?.unique_users?.toString() || (realtimeStats ? realtimeStats.last_hour.active_users.toString() : '0')), 
      change: realtimeStats && realtimeStats.last_hour.active_users > 0 ? `${realtimeStats.last_hour.active_users} active now` : 'No recent activity',
      icon: ICONS.Profile, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-100' 
    },
    { 
      label: 'Active Sessions', 
      value: realtimeStats?.last_hour?.active_users?.toString() || '0', 
      change: `${realtimeStats?.last_5_minutes?.operations || 0} ops in 5min`, 
      icon: ICONS.Focus, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-100' 
    },
    { 
      label: 'Total Operations', 
      value: globalUsage ? usageService.formatNumber(globalUsage.total_operations) : (realtimeStats ? realtimeStats.last_hour.total_operations.toString() : '0'),
      change: globalUsage ? `${globalUsage.success_rate?.toFixed(1) || 0}% success` : `${realtimeStats?.last_hour?.success_rate || 0}% success`,
      icon: ICONS.Admin, 
      color: 'text-rose-600', 
      bg: 'bg-rose-100' 
    },
    { 
      label: 'AI Usage (Tokens)', 
      value: globalUsage ? usageService.formatNumber(globalUsage.total_tokens) : usageService.formatNumber(realtimeStats?.last_hour?.total_tokens || 0),
      change: `${usageService.formatNumber(realtimeStats?.last_hour?.total_tokens || 0)} in last hour`, 
      icon: ICONS.Sparkles, 
      color: 'text-amber-600', 
      bg: 'bg-amber-100' 
    },
  ];

  const chartData = globalUsage?.daily_usage 
    ? Object.entries(globalUsage.daily_usage)
        .slice(-7) // Last 7 days
        .map(([date, data]: [string, any]) => ({
          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          usage: data.operations || 0,
          growth: data.tokens ? Math.floor(data.tokens / 100) : 0,
        }))
    : [
        { name: 'Mon', usage: 400, growth: 240 },
        { name: 'Tue', usage: 300, growth: 139 },
        { name: 'Wed', usage: 600, growth: 980 },
        { name: 'Thu', usage: 800, growth: 390 },
        { name: 'Fri', usage: 500, growth: 480 },
        { name: 'Sat', usage: 200, growth: 380 },
        { name: 'Sun', usage: 150, growth: 430 },
      ];

  const renderActiveSection = () => {
    switch (currentSubRoute) {
      case AppRoute.ADMIN:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((s, i) => (
                <Card key={i} className="flex items-center gap-5 border-b-8 border-slate-100">
                  <div className={`w-14 h-14 ${s.bg} ${s.color} rounded-[1.5rem] flex items-center justify-center shadow-lg`}>
                    <s.icon size={28} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <h4 className="text-2xl font-black text-slate-800">{s.value}</h4>
                    <span className={`text-[10px] font-black ${s.change.includes('active') || s.change.includes('success') || s.change.includes('in') ? 'text-emerald-500' : s.change.startsWith('+') ? 'text-emerald-500' : 'text-slate-500'}`}>{s.change}</span>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2">
                <h3 className="text-xl font-black text-slate-800 mb-8">Platform Traffic</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="usage" stroke="#818cf8" strokeWidth={4} fillOpacity={1} fill="url(#colorUsage)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card>
                <h3 className="text-xl font-black text-slate-800 mb-8">Active Operations</h3>
                <div className="space-y-4">
                  {globalUsage?.operations_by_type && Object.keys(globalUsage.operations_by_type).length > 0 ? (
                    Object.entries(globalUsage.operations_by_type)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 4)
                      .map(([type, count], i) => {
                        const colors = ['bg-emerald-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-500'];
                        const percentage = globalUsage.total_operations > 0 
                          ? Math.round((count / globalUsage.total_operations) * 100) 
                          : 0;
                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-slate-600">
                              <span className="capitalize">{type.replace('_', ' ')}</span>
                              <span>{percentage}% ({count} ops)</span>
                            </div>
                            <ProgressBar progress={percentage} color={colors[i % colors.length]} />
                          </div>
                        );
                      })
                  ) : realtimeStats?.last_hour?.total_operations ? (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm font-bold">{realtimeStats.last_hour.total_operations} operations</p>
                      <p className="text-xs mt-2">in the last hour</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm font-bold">No operations yet</p>
                      <p className="text-xs mt-2">Start using AI features to see activity</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        );
      case AppRoute.ADMIN_USERS:
        return (
          <>
            <Card noPadding className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800">User Directory</h3>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search users..." 
                    className="w-64" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="primary" onClick={handleCreateUser}>
                    <ICONS.Plus size={18} className="mr-2" /> Add User
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Joined</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-50 font-bold">
                    {loading && users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          Loading users...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                        const joinDate = new Date(user.createdAt).toLocaleDateString();
                        
                        return (
                          <tr key={user.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {user.avatar ? (
                                  <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover" alt={user.name} />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                                    {userInitials}
                                  </div>
                                )}
                                <div className="leading-tight">
                                  <p className="text-sm text-slate-800">{user.name}</p>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-tight">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={user.role === 'admin' ? 'indigo' : user.role === 'mentor' ? 'amber' : 'slate'} className="capitalize">
                                {user.role}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className="cursor-pointer"
                              >
                                <Badge variant={user.isActive ? 'emerald' : 'rose'}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </button>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{joinDate}</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                  title="Edit user"
                                >
                                  <ICONS.Profile size={18} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteUser(user)}
                                  title="Delete user"
                                  className="text-rose-500 hover:text-rose-600"
                                >
                                  <ICONS.Trash size={18} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-6 border-t-2 border-slate-50 flex items-center justify-between">
                  <p className="text-sm text-slate-500 font-bold">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* User Form Modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md">
                  <h3 className="text-2xl font-black text-slate-800 mb-6">
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                      <Input 
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                      <Input 
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>

                    {!editingUser && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                        <Input 
                          type="password"
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Role</label>
                      <select 
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
                      >
                        <option value="student">Student</option>
                        <option value="mentor">Mentor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                      <input 
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-5 h-5 rounded border-2 border-slate-300"
                      />
                      <label className="text-sm font-bold text-slate-700">Account Active</label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowModal(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      className="flex-1"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        );
      case AppRoute.ADMIN_MODERATION:
        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-2 space-y-6">
                <Card noPadding>
                  <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-800">Flagged Activity</h3>
                    <Badge variant="rose">{reportStats?.pending || 0} New</Badge>
                  </div>
                  <div className="p-4 space-y-4">
                    {reportsLoading ? (
                      <div className="text-center py-12 text-slate-400">
                        Loading reports...
                      </div>
                    ) : reports.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <p className="text-sm font-bold">No pending reports</p>
                        <p className="text-xs mt-2">All content is in good standing</p>
                      </div>
                    ) : (
                      reports.map((report) => (
                        <div key={report._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border-2 border-transparent hover:border-rose-100 transition-all">
                          <div className="flex gap-4 items-center flex-1">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                              report.priority === 'critical' ? 'bg-rose-200 text-rose-700' :
                              report.priority === 'high' ? 'bg-rose-100 text-rose-600' :
                              report.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                              !
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-black text-slate-800">
                                {report.reportedBy.name}
                                <span className="text-[10px] text-slate-400 uppercase font-bold ml-2">
                                  reported {report.contentType}
                                </span>
                              </p>
                              <p className="text-xs text-rose-500 font-bold">
                                {reportService.formatReason(report.reason)}: {report.description.slice(0, 50)}...
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {report.timeSinceReport || new Date(report.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => handleDismissReport(report)}
                              disabled={reportsLoading}
                            >
                              Dismiss
                            </Button>
                            <Button 
                              variant="danger" 
                              size="sm"
                              onClick={() => handleTakeAction(report)}
                              disabled={reportsLoading}
                            >
                              Take Action
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Report Statistics */}
                {reportStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-rose-50 border-rose-100">
                      <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Pending</p>
                      <h4 className="text-3xl font-black text-slate-800">{reportStats.pending}</h4>
                    </Card>
                    <Card className="bg-amber-50 border-amber-100">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Reviewing</p>
                      <h4 className="text-3xl font-black text-slate-800">{reportStats.reviewing}</h4>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Resolved</p>
                      <h4 className="text-3xl font-black text-slate-800">{reportStats.resolved}</h4>
                    </Card>
                    <Card className="bg-slate-50 border-slate-100">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Total</p>
                      <h4 className="text-3xl font-black text-slate-800">{reportStats.total}</h4>
                    </Card>
                  </div>
                )}
              </div>

              <Card className="h-fit">
                <h3 className="text-xl font-black text-slate-800 mb-6">Report Summary</h3>
                <div className="space-y-4">
                  {reportStats?.byType && Object.entries(reportStats.byType).length > 0 ? (
                    Object.entries(reportStats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm font-bold text-slate-700 capitalize">{type}</span>
                        <Badge variant="slate">{count}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No reports yet</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Action Modal */}
            {showReportModal && selectedReport && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-2xl">
                  <h3 className="text-2xl font-black text-slate-800 mb-4">Take Action on Report</h3>
                  
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Reported By</p>
                      <p className="text-sm font-bold text-slate-800">{selectedReport.reportedBy.name}</p>
                      <p className="text-xs text-slate-500">{selectedReport.reportedBy.email}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Reason</p>
                      <p className="text-sm font-bold text-rose-600">{reportService.formatReason(selectedReport.reason)}</p>
                      <p className="text-sm text-slate-700 mt-2">{selectedReport.description}</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Action to Take</label>
                      <select 
                        value={selectedAction}
                        onChange={(e) => setSelectedAction(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
                      >
                        <option value="none">No Action</option>
                        <option value="warning">Issue Warning</option>
                        <option value="content_removed">Remove Content</option>
                        <option value="user_suspended">Suspend User</option>
                        <option value="user_banned">Ban User</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Review Notes</label>
                      <textarea 
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder="Add notes about this decision..."
                        className="w-full h-32 bg-white border-2 border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowReportModal(false)}
                      disabled={reportsLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="danger" 
                      className="flex-1"
                      onClick={handleSubmitAction}
                      disabled={reportsLoading}
                    >
                      {reportsLoading ? 'Processing...' : 'Submit Action'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        );
      case AppRoute.ADMIN_AI:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-amber-50 border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Token Usage (7d)</p>
                  <h4 className="text-3xl font-black text-slate-800">
                    {usageLoading ? '...' : usageService.formatNumber(globalUsage?.total_tokens || 0)}
                  </h4>
                  <div className="mt-4">
                    <ProgressBar 
                      progress={Math.min(((globalUsage?.total_tokens || 0) / 1000000) * 100, 100)} 
                      color="bg-amber-400" 
                    />
                  </div>
                  <p className="text-xs text-amber-600 mt-2 font-bold">
                    {realtimeStats?.last_hour?.total_tokens || 0} tokens in last hour
                  </p>
                </Card>
                <Card className="bg-indigo-50 border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Success Rate</p>
                  <h4 className="text-3xl font-black text-slate-800">
                    {usageLoading ? '...' : `${globalUsage?.success_rate?.toFixed(1) || 0}%`}
                  </h4>
                  <div className="mt-4">
                    <ProgressBar 
                      progress={globalUsage?.success_rate || 0} 
                      color="bg-indigo-500" 
                    />
                  </div>
                  <p className="text-xs text-indigo-600 mt-2 font-bold">
                    {globalUsage?.successful_operations || 0} / {globalUsage?.total_operations || 0} operations
                  </p>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Avg Latency</p>
                  <h4 className="text-3xl font-black text-slate-800">
                    {usageLoading ? '...' : `${(globalUsage?.avg_response_time_ms || 0).toFixed(0)}ms`}
                  </h4>
                  <div className="mt-4">
                    <ProgressBar 
                      progress={Math.min((globalUsage?.avg_response_time_ms || 0) / 50, 100)} 
                      color="bg-emerald-500" 
                    />
                  </div>
                  <p className="text-xs text-emerald-600 mt-2 font-bold">
                    {realtimeStats?.last_hour?.total_operations || 0} operations last hour
                  </p>
                </Card>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <Card>
                  <h3 className="text-xl font-black text-slate-800 mb-8">Operations by Type (7d)</h3>
                  <div className="h-[400px]">
                     {usageLoading ? (
                       <div className="flex items-center justify-center h-full text-slate-400">Loading...</div>
                     ) : globalUsage?.operations_by_type ? (
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={usageService.formatOperationsByType(globalUsage.operations_by_type)}>
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} 
                            />
                            <Tooltip 
                              contentStyle={{
                                borderRadius: '20px', 
                                border: 'none', 
                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                              }} 
                            />
                            <Bar 
                              dataKey="value" 
                              radius={[10, 10, 10, 10]} 
                              barSize={50} 
                              fill="#818cf8" 
                            />
                          </BarChart>
                       </ResponsiveContainer>
                     ) : (
                       <div className="flex items-center justify-center h-full text-slate-400">No data available</div>
                     )}
                  </div>
               </Card>
               
               <Card>
                  <h3 className="text-xl font-black text-slate-800 mb-8">Top Users by Operations</h3>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {usageLoading ? (
                      <div className="text-slate-400 text-center py-8">Loading...</div>
                    ) : globalUsage?.top_users && globalUsage.top_users.length > 0 ? (
                      globalUsage.top_users.map((user, idx) => (
                        <div key={user.user_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black">
                              #{idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{userNames[user.user_id] || user.user_id}</p>
                              <p className="text-xs text-slate-400">{user.operations} operations</p>
                            </div>
                          </div>
                          <Badge variant="indigo">{usageService.formatNumber(user.operations)}</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 text-center py-8">No user data available</div>
                    )}
                  </div>
               </Card>
             </div>
             
             <Card>
                <h3 className="text-xl font-black text-slate-800 mb-8">Daily Activity (Last 7 Days)</h3>
                <div className="h-[300px]">
                  {usageLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-400">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} 
                        />
                        <Tooltip 
                          contentStyle={{
                            borderRadius: '20px', 
                            border: 'none', 
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="usage" 
                          stroke="#818cf8" 
                          strokeWidth={4} 
                          fillOpacity={1} 
                          fill="url(#colorUsage)" 
                          name="Operations"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="growth" 
                          stroke="#fbbf24" 
                          strokeWidth={4} 
                          fillOpacity={1} 
                          fill="url(#colorTokens)" 
                          name="Tokens (÷100)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
             </Card>
          </div>
        );
      case AppRoute.ADMIN_BOARDS:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Board Statistics */}
            {boardStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-indigo-50 border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total Boards</p>
                  <h4 className="text-3xl font-black text-slate-800">{boardStats.total}</h4>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Public</p>
                  <h4 className="text-3xl font-black text-slate-800">{boardStats.public}</h4>
                </Card>
                <Card className="bg-amber-50 border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Private</p>
                  <h4 className="text-3xl font-black text-slate-800">{boardStats.private}</h4>
                </Card>
                <Card className="bg-rose-50 border-rose-100">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Archived</p>
                  <h4 className="text-3xl font-black text-slate-800">{boardStats.archived}</h4>
                </Card>
              </div>
            )}

            {/* Boards Table */}
            <Card noPadding>
              <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800">Board Management</h3>
                <Input 
                  placeholder="Search boards..." 
                  className="w-64" 
                  value={boardSearchTerm}
                  onChange={(e) => setBoardSearchTerm(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Board</th>
                      <th className="px-6 py-4">Owner</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Activity</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-50 font-bold">
                    {boardsLoading && boards.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          Loading boards...
                        </td>
                      </tr>
                    ) : boards.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          No boards found
                        </td>
                      </tr>
                    ) : (
                      boards.map((board) => (
                        <tr key={board._id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="leading-tight">
                              <p className="text-sm text-slate-800 font-bold">{board.title}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-tight">
                                {board.elements?.length || 0} elements • {board.members?.length || 0} members
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {board.owner.avatar ? (
                                <img src={board.owner.avatar} className="w-8 h-8 rounded-lg object-cover" alt={board.owner.name} />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black text-xs">
                                  {board.owner.name[0]}
                                </div>
                              )}
                              <div className="leading-tight">
                                <p className="text-xs text-slate-700">{board.owner.name}</p>
                                <p className="text-[10px] text-slate-400">{board.owner.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={board.isPublic ? 'emerald' : 'slate'}>
                              {board.isPublic ? 'Public' : 'Private'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={board.isArchived ? 'rose' : 'emerald'}>
                              {board.isArchived ? 'Archived' : 'Active'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {new Date(board.lastActivity).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {!board.isArchived && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleSuspendBoard(board)}
                                  title="Suspend board"
                                  className="text-amber-500 hover:text-amber-600"
                                >
                                  <ICONS.Admin size={18} />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleForceDeleteBoard(board)}
                                title="Delete board permanently"
                                className="text-rose-500 hover:text-rose-600"
                              >
                                <ICONS.Trash size={18} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {boardTotalPages > 1 && (
                <div className="p-6 border-t-2 border-slate-50 flex items-center justify-between">
                  <p className="text-sm text-slate-500 font-bold">
                    Page {boardPage} of {boardTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={boardPage === 1}
                      onClick={() => setBoardPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={boardPage === boardTotalPages}
                      onClick={() => setBoardPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        );

      case AppRoute.ADMIN_SETTINGS:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {settingsLoading && !settings ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-slate-400">Loading settings...</div>
              </div>
            ) : settings && settingsFormData ? (
              <>
                {/* Header */}
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">Platform Settings</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Configure platform-wide settings and features
                      </p>
                    </div>
                    <div className="flex gap-3">
                      {settingsEditing ? (
                        <>
                          <Button 
                            variant="outline"
                            onClick={handleCancelEditSettings}
                            disabled={settingsLoading}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="primary"
                            onClick={handleSaveSettings}
                            disabled={settingsLoading}
                            className="gap-2"
                          >
                            <ICONS.Check size={18} />
                            {settingsLoading ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="primary"
                          onClick={handleEditSettings}
                          className="gap-2"
                        >
                          <ICONS.Edit size={18} />
                          Edit Settings
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Platform Settings */}
                <Card>
                  <h3 className="text-xl font-black text-slate-800 mb-6">Platform Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Platform Name</label>
                      <Input
                        value={settingsFormData.platform.name}
                        onChange={(e) => updateSettingsField('platform', 'name', e.target.value)}
                        disabled={!settingsEditing}
                        placeholder="Enter platform name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Description</label>
                      <Input
                        value={settingsFormData.platform.description}
                        onChange={(e) => updateSettingsField('platform', 'description', e.target.value)}
                        disabled={!settingsEditing}
                        placeholder="Enter platform description"
                      />
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                      <input
                        type="checkbox"
                        id="maintenanceMode"
                        checked={settingsFormData.platform.maintenanceMode}
                        onChange={(e) => updateSettingsField('platform', 'maintenanceMode', e.target.checked)}
                        disabled={!settingsEditing}
                        className="w-5 h-5 rounded"
                      />
                      <label htmlFor="maintenanceMode" className="text-sm font-bold text-slate-700 cursor-pointer">
                        Enable Maintenance Mode
                      </label>
                    </div>
                    {settingsFormData.platform.maintenanceMode && (
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Maintenance Message</label>
                        <textarea
                          value={settingsFormData.platform.maintenanceMessage}
                          onChange={(e) => updateSettingsField('platform', 'maintenanceMessage', e.target.value)}
                          disabled={!settingsEditing}
                          placeholder="Message to display during maintenance"
                          className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl text-sm resize-none"
                          rows={3}
                        />
                      </div>
                    )}
                  </div>
                </Card>

                {/* Feature Toggles */}
                <Card>
                  <h3 className="text-xl font-black text-slate-800 mb-6">Feature Toggles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(settingsFormData.features).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                        <input
                          type="checkbox"
                          id={`feature-${feature}`}
                          checked={enabled as boolean}
                          onChange={(e) => updateSettingsField('features', feature, e.target.checked)}
                          disabled={!settingsEditing}
                          className="w-5 h-5 rounded"
                        />
                        <label htmlFor={`feature-${feature}`} className="text-sm font-bold text-slate-700 cursor-pointer flex-1">
                          {feature.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                        </label>
                        <Badge variant={enabled ? 'emerald' : 'slate'}>
                          {enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Storage & Limits */}
                <Card>
                  <h3 className="text-xl font-black text-slate-800 mb-6">Storage & Limits</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">
                        Max File Size ({settingsService.formatFileSize(settingsFormData.storage.maxFileSize)})
                      </label>
                      <Input
                        type="number"
                        value={settingsFormData.storage.maxFileSize}
                        onChange={(e) => updateSettingsField('storage', 'maxFileSize', parseInt(e.target.value))}
                        disabled={!settingsEditing}
                        placeholder="Max file size in bytes"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Max Board Elements</label>
                      <Input
                        type="number"
                        value={settingsFormData.storage.maxBoardElements}
                        onChange={(e) => updateSettingsField('storage', 'maxBoardElements', parseInt(e.target.value))}
                        disabled={!settingsEditing}
                        placeholder="Maximum elements per board"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Max Boards Per User</label>
                      <Input
                        type="number"
                        value={settingsFormData.storage.maxBoardsPerUser}
                        onChange={(e) => updateSettingsField('storage', 'maxBoardsPerUser', parseInt(e.target.value))}
                        disabled={!settingsEditing}
                        placeholder="Maximum boards per user"
                      />
                    </div>
                  </div>
                </Card>

                {/* AI Engine Settings */}
                <Card>
                  <h3 className="text-xl font-black text-slate-800 mb-6">AI Engine Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                      <input
                        type="checkbox"
                        id="aiEnabled"
                        checked={settingsFormData.ai.enabled}
                        onChange={(e) => updateSettingsField('ai', 'enabled', e.target.checked)}
                        disabled={!settingsEditing}
                        className="w-5 h-5 rounded"
                      />
                      <label htmlFor="aiEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">
                        Enable AI Engine
                      </label>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Base URL</label>
                      <Input
                        value={settingsFormData.ai.baseUrl}
                        onChange={(e) => updateSettingsField('ai', 'baseUrl', e.target.value)}
                        disabled={!settingsEditing}
                        placeholder="AI engine base URL"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Timeout (ms)</label>
                        <Input
                          type="number"
                          value={settingsFormData.ai.timeout}
                          onChange={(e) => updateSettingsField('ai', 'timeout', parseInt(e.target.value))}
                          disabled={!settingsEditing}
                          placeholder="Timeout in milliseconds"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Max Tokens</label>
                        <Input
                          type="number"
                          value={settingsFormData.ai.maxTokens}
                          onChange={(e) => updateSettingsField('ai', 'maxTokens', parseInt(e.target.value))}
                          disabled={!settingsEditing}
                          placeholder="Maximum tokens per request"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Rate Limit (per user)</label>
                        <Input
                          type="number"
                          value={settingsFormData.ai?.rateLimits?.perUser || 0}
                          onChange={(e) => updateNestedSettingsField('ai', 'rateLimits', 'perUser', parseInt(e.target.value))}
                          disabled={!settingsEditing}
                          placeholder="Requests per user"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Rate Limit (per hour)</label>
                        <Input
                          type="number"
                          value={settingsFormData.ai?.rateLimits?.perHour || 0}
                          onChange={(e) => updateNestedSettingsField('ai', 'rateLimits', 'perHour', parseInt(e.target.value))}
                          disabled={!settingsEditing}
                          placeholder="Total requests per hour"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Security Settings */}
                <Card>
                  <h3 className="text-xl font-black text-slate-800 mb-6">Security Configuration</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">JWT Expires In</label>
                        <Input
                          value={settingsFormData.security.jwtExpiresIn}
                          onChange={(e) => updateSettingsField('security', 'jwtExpiresIn', e.target.value)}
                          disabled={!settingsEditing}
                          placeholder="e.g., 7d, 24h"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Password Min Length</label>
                        <Input
                          type="number"
                          value={settingsFormData.security.passwordMinLength}
                          onChange={(e) => updateSettingsField('security', 'passwordMinLength', parseInt(e.target.value))}
                          disabled={!settingsEditing}
                          placeholder="Minimum password length"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Bcrypt Rounds</label>
                      <Input
                        type="number"
                        value={settingsFormData.security.bcryptRounds}
                        onChange={(e) => updateSettingsField('security', 'bcryptRounds', parseInt(e.target.value))}
                        disabled={!settingsEditing}
                        placeholder="Bcrypt salt rounds"
                      />
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                      <input
                        type="checkbox"
                        id="twoFactor"
                        checked={settingsFormData.security.enableTwoFactor}
                        onChange={(e) => updateSettingsField('security', 'enableTwoFactor', e.target.checked)}
                        disabled={!settingsEditing}
                        className="w-5 h-5 rounded"
                      />
                      <label htmlFor="twoFactor" className="text-sm font-bold text-slate-700 cursor-pointer">
                        Enable Two-Factor Authentication
                      </label>
                    </div>
                  </div>
                </Card>

                {/* Analytics Settings */}
                <Card>
                  <h3 className="text-xl font-black text-slate-800 mb-6">Analytics Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                      <input
                        type="checkbox"
                        id="analyticsEnabled"
                        checked={settingsFormData.analytics.enabled}
                        onChange={(e) => updateSettingsField('analytics', 'enabled', e.target.checked)}
                        disabled={!settingsEditing}
                        className="w-5 h-5 rounded"
                      />
                      <label htmlFor="analyticsEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">
                        Enable Analytics
                      </label>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                      <input
                        type="checkbox"
                        id="trackUserActivity"
                        checked={settingsFormData.analytics.trackUserActivity}
                        onChange={(e) => updateSettingsField('analytics', 'trackUserActivity', e.target.checked)}
                        disabled={!settingsEditing || !settingsFormData.analytics.enabled}
                        className="w-5 h-5 rounded"
                      />
                      <label htmlFor="trackUserActivity" className="text-sm font-bold text-slate-700 cursor-pointer">
                        Track User Activity
                      </label>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                      <input
                        type="checkbox"
                        id="trackBoardUsage"
                        checked={settingsFormData.analytics.trackBoardUsage}
                        onChange={(e) => updateSettingsField('analytics', 'trackBoardUsage', e.target.checked)}
                        disabled={!settingsEditing || !settingsFormData.analytics.enabled}
                        className="w-5 h-5 rounded"
                      />
                      <label htmlFor="trackBoardUsage" className="text-sm font-bold text-slate-700 cursor-pointer">
                        Track Board Usage
                      </label>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Data Retention (days)</label>
                      <Input
                        type="number"
                        value={settingsFormData.analytics.retentionDays}
                        onChange={(e) => updateSettingsField('analytics', 'retentionDays', parseInt(e.target.value))}
                        disabled={!settingsEditing || !settingsFormData.analytics.enabled}
                        placeholder="Number of days to retain data"
                      />
                    </div>
                  </div>
                </Card>

                {/* Email Settings */}
                <Card>
                  <h3 className="text-xl font-black text-slate-800 mb-6">Email Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                      <input
                        type="checkbox"
                        id="emailEnabled"
                        checked={settingsFormData.email.enabled}
                        onChange={(e) => updateSettingsField('email', 'enabled', e.target.checked)}
                        disabled={!settingsEditing}
                        className="w-5 h-5 rounded"
                      />
                      <label htmlFor="emailEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">
                        Enable Email Service
                      </label>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Email Service</label>
                      <Input
                        value={settingsFormData.email.service}
                        onChange={(e) => updateSettingsField('email', 'service', e.target.value)}
                        disabled={!settingsEditing || !settingsFormData.email.enabled}
                        placeholder="e.g., gmail, sendgrid"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">From Address</label>
                      <Input
                        value={settingsFormData.email.from}
                        onChange={(e) => updateSettingsField('email', 'from', e.target.value)}
                        disabled={!settingsEditing || !settingsFormData.email.enabled}
                        placeholder="noreply@example.com"
                      />
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card>
                <div className="text-center py-12 text-slate-400">
                  No settings available
                </div>
              </Card>
            )}
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-80 text-center animate-in fade-in zoom-in duration-500">
            <div className="text-8xl mb-6">🛠️</div>
            <h3 className="text-2xl font-black text-slate-800">Module Under Construction</h3>
            <p className="text-slate-500 font-bold max-w-sm mt-2">The management portal for this section is being tuned by the robot squad. Check back soon!</p>
            <Button variant="outline" className="mt-8">View Platform Status</Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Admin Command Center</h2>
          <p className="text-slate-500 font-bold">
            Total control over the Collabry universe. 
            {totalUsers > 0 && (
              <span className="ml-2 text-indigo-600">
                • {totalUsers} registered users
              </span>
            )}
            {realtimeStats && realtimeStats.last_hour.active_users > 0 && (
              <span className="ml-2 text-emerald-600">
                • {realtimeStats.last_hour.active_users} active in last hour
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" className="gap-2 px-6" onClick={loadRealtimeStats}>
             <ICONS.Sparkles size={18} /> 
             {usageLoading ? 'Loading...' : 'Refresh Data'}
           </Button>
           <Button variant="primary" className="gap-2 px-6 shadow-xl shadow-indigo-100">
             <ICONS.Plus size={18} /> New Event
           </Button>
        </div>
      </div>

      <div className="relative min-h-[500px]">
        {renderActiveSection()}
      </div>
      
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        confirmText={alertState.confirmText}
      />
    </div>
  );
};

export default AdminDashboard;

