'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../components/UIElements';
import { ICONS } from '../constants';
import { AppRoute } from '@/types';
import { adminService, type UserFormData } from '@/lib/services/admin.service';
import { usageService, type GlobalUsage, type RealtimeStats } from '@/lib/services/usage.service';
import { reportService, type Report, type ReportStats } from '@/lib/services/report.service';
import { adminBoardService, type AdminBoard, type BoardStats } from '@/lib/services/adminBoard.service';
import { settingsService, type PlatformSettings } from '@/lib/services/settings.service';
import type { User } from '@/types/user.types';
import AlertModal from '../components/AlertModal';
import { useAlert } from '@/hooks/useAlert';
import AdminOverview from '../components/admin/AdminOverview';
import UserManagement from '../components/admin/UserManagement';
import UserFormModal from '../components/admin/UserFormModal';
import DeleteUserModal from '../components/admin/DeleteUserModal';
import ModerationPanel from '../components/admin/ModerationPanel';
import ReportActionModal from '../components/admin/ReportActionModal';
import AIMonitoring from '../components/admin/AIMonitoring';
import BoardGovernance from '../components/admin/BoardGovernance';
import PlatformSettingsPanel from '../components/admin/PlatformSettings';
import DeepReports from '../components/admin/DeepReports';
import CouponManagement from '../components/admin/CouponManagement';
import UserDetailModal from '../components/admin/UserDetailModal';
import BoardAnalyticsModal from '../components/admin/BoardAnalyticsModal';
import AuditLogViewer from '../components/admin/AuditLogViewer';
import AdminNotifications from '../components/admin/AdminNotifications';
import SubscriptionManagement from '../components/admin/SubscriptionManagement';

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
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingBoardId, setViewingBoardId] = useState<string | null>(null);
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

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setLoading(true);
      await adminService.deleteUser(userToDelete.id);
      showAlert({ type: 'success', title: 'User Deleted', message: `${userToDelete.name} has been deleted.` });
      loadUsers();
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Delete Failed',
        message: error.message || 'Failed to delete user'
      });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
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

  const handleBulkEnable = async (userIds: string[]) => {
    try {
      const { modifiedCount } = await adminService.bulkUpdateUserStatus(userIds, true);
      showAlert({ type: 'success', title: 'Users Enabled', message: `${modifiedCount} user(s) enabled` });
      loadUsers();
    } catch (error: any) {
      showAlert({ type: 'error', title: 'Bulk Enable Failed', message: error.message });
    }
  };

  const handleBulkDisable = async (userIds: string[]) => {
    try {
      const { modifiedCount } = await adminService.bulkUpdateUserStatus(userIds, false);
      showAlert({ type: 'success', title: 'Users Disabled', message: `${modifiedCount} user(s) disabled` });
      loadUsers();
    } catch (error: any) {
      showAlert({ type: 'error', title: 'Bulk Disable Failed', message: error.message });
    }
  };

  const handleBulkDeleteUsers = async (userIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${userIds.length} user(s)? This cannot be undone.`)) return;
    try {
      const { deletedCount } = await adminService.bulkDeleteUsers(userIds);
      showAlert({ type: 'success', title: 'Users Deleted', message: `${deletedCount} user(s) deleted` });
      loadUsers();
    } catch (error: any) {
      showAlert({ type: 'error', title: 'Bulk Delete Failed', message: error.message });
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
      label: 'AI Questions', 
      value: globalUsage ? usageService.formatNumber(globalUsage.total_operations) : usageService.formatNumber(realtimeStats?.last_hour?.total_operations || 0),
      change: `${usageService.formatNumber(realtimeStats?.last_hour?.total_operations || 0)} in last hour`, 
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
          growth: data.questions || data.operations || 0,
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
          <AdminOverview
            stats={stats}
            chartData={chartData}
            globalUsage={globalUsage}
            realtimeStats={realtimeStats}
          />
        );
      
      case AppRoute.ADMIN_USERS:
        return (
          <>
            <UserManagement
              users={users}
              loading={loading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              handleCreateUser={handleCreateUser}
              handleEditUser={handleEditUser}
              handleToggleStatus={handleToggleStatus}
              handleDeleteUser={handleDeleteUser}
              handleViewUser={(user) => setViewingUserId(user.id)}
              handleBulkEnable={handleBulkEnable}
              handleBulkDisable={handleBulkDisable}
              handleBulkDelete={handleBulkDeleteUsers}
            />
            <UserFormModal
              showModal={showModal}
              setShowModal={setShowModal}
              editingUser={editingUser}
              formData={formData}
              setFormData={setFormData}
              loading={loading}
              handleSubmit={handleSubmit}
            />
            <DeleteUserModal
              showDeleteConfirm={showDeleteConfirm}
              userToDelete={userToDelete}
              loading={loading}
              confirmDeleteUser={confirmDeleteUser}
              cancelDeleteUser={cancelDeleteUser}
            />
            {viewingUserId && (
              <UserDetailModal
                userId={viewingUserId}
                onClose={() => setViewingUserId(null)}
              />
            )}
          </>
        );
      
      case AppRoute.ADMIN_MODERATION:
        return (
          <>
            <ModerationPanel
              reports={reports}
              reportStats={reportStats}
              reportsLoading={reportsLoading}
              handleDismissReport={handleDismissReport}
              handleTakeAction={handleTakeAction}
            />
            <ReportActionModal
              showReportModal={showReportModal}
              setShowReportModal={setShowReportModal}
              selectedReport={selectedReport}
              selectedAction={selectedAction}
              setSelectedAction={setSelectedAction}
              actionNotes={actionNotes}
              setActionNotes={setActionNotes}
              reportsLoading={reportsLoading}
              handleSubmitAction={handleSubmitAction}
            />
          </>
        );
      
      case AppRoute.ADMIN_AI:
        return (
          <AIMonitoring
            globalUsage={globalUsage}
            realtimeStats={realtimeStats}
            usageLoading={usageLoading}
            chartData={chartData}
            userNames={userNames}
          />
        );
      
      case AppRoute.ADMIN_REPORTS:
        return <DeepReports />;

      case AppRoute.ADMIN_BOARDS:
        return (
          <>
            <BoardGovernance
              boards={boards}
              boardStats={boardStats}
              boardsLoading={boardsLoading}
              boardSearchTerm={boardSearchTerm}
              setBoardSearchTerm={setBoardSearchTerm}
              boardPage={boardPage}
              boardTotalPages={boardTotalPages}
              setBoardPage={setBoardPage}
              handleSuspendBoard={handleSuspendBoard}
              handleForceDeleteBoard={handleForceDeleteBoard}
              handleViewAnalytics={(board) => setViewingBoardId(board._id)}
            />
            {viewingBoardId && (
              <BoardAnalyticsModal
                boardId={viewingBoardId}
                onClose={() => setViewingBoardId(null)}
              />
            )}
          </>
        );

      case AppRoute.ADMIN_COUPONS:
        return <CouponManagement />;

      case AppRoute.ADMIN_AUDIT:
        return <AuditLogViewer />;

      case AppRoute.ADMIN_NOTIFICATIONS:
        return <AdminNotifications />;

      case AppRoute.ADMIN_SUBSCRIPTIONS:
        return <SubscriptionManagement />;

      case AppRoute.ADMIN_SETTINGS:
        return (
          <PlatformSettingsPanel
            settings={settings}
            settingsFormData={settingsFormData}
            settingsLoading={settingsLoading}
            settingsEditing={settingsEditing}
            handleEditSettings={handleEditSettings}
            handleCancelEditSettings={handleCancelEditSettings}
            handleSaveSettings={handleSaveSettings}
            updateSettingsField={updateSettingsField}
            updateNestedSettingsField={updateNestedSettingsField}
          />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-80 text-center animate-in fade-in zoom-in duration-500">
            <div className="text-8xl mb-6">🛠️</div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Module Under Construction</h3>
            <p className="text-slate-500 font-bold max-w-sm mt-2">The management portal for this section is being tuned by the robot squad. Check back soon!</p>
            <Button variant="outline" className="mt-8">View Platform Status</Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12 text-slate-800 dark:text-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">Admin Command Center</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold">
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

