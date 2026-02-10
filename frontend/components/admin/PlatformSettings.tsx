import React from 'react';
import { Card, Button, Input, Badge } from '../UIElements';
import { ICONS } from '../../constants';
import type { PlatformSettings } from '@/lib/services/settings.service';
import { settingsService } from '@/lib/services/settings.service';

interface PlatformSettingsProps {
  settings: PlatformSettings | null;
  settingsFormData: PlatformSettings | null;
  settingsLoading: boolean;
  settingsEditing: boolean;
  handleEditSettings: () => void;
  handleCancelEditSettings: () => void;
  handleSaveSettings: () => void;
  updateSettingsField: (category: keyof PlatformSettings, field: string, value: any) => void;
  updateNestedSettingsField: (category: keyof PlatformSettings, parent: string, field: string, value: any) => void;
}

const PlatformSettings: React.FC<PlatformSettingsProps> = ({
  settings,
  settingsFormData,
  settingsLoading,
  settingsEditing,
  handleEditSettings,
  handleCancelEditSettings,
  handleSaveSettings,
  updateSettingsField,
  updateNestedSettingsField,
}) => {
  if (settingsLoading && !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading settings...</div>
      </div>
    );
  }

  if (!settings || !settingsFormData) {
    return (
      <Card>
        <div className="text-center py-12 text-slate-400">
          No settings available
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Platform Settings</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Platform Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">Platform Name</label>
            <Input
              value={settingsFormData.platform.name}
              onChange={(e) => updateSettingsField('platform', 'name', e.target.value)}
              disabled={!settingsEditing}
              placeholder="Enter platform name"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">Description</label>
            <Input
              value={settingsFormData.platform.description}
              onChange={(e) => updateSettingsField('platform', 'description', e.target.value)}
              disabled={!settingsEditing}
              placeholder="Enter platform description"
            />
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={settingsFormData.platform.maintenanceMode}
              onChange={(e) => updateSettingsField('platform', 'maintenanceMode', e.target.checked)}
              disabled={!settingsEditing}
              className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
            />
            <label htmlFor="maintenanceMode" className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
              Enable Maintenance Mode
            </label>
          </div>
          {settingsFormData.platform.maintenanceMode && (
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">Maintenance Message</label>
              <textarea
                value={settingsFormData.platform.maintenanceMessage}
                onChange={(e) => updateSettingsField('platform', 'maintenanceMessage', e.target.value)}
                disabled={!settingsEditing}
                placeholder="Message to display during maintenance"
                className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                rows={3}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Feature Toggles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(settingsFormData.features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <input
                type="checkbox"
                id={`feature-${feature}`}
                checked={enabled as boolean}
                onChange={(e) => updateSettingsField('features', feature, e.target.checked)}
                disabled={!settingsEditing}
                className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
              <label htmlFor={`feature-${feature}`} className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex-1">
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
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Storage & Limits</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">
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
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">Max Board Elements</label>
            <Input
              type="number"
              value={settingsFormData.storage.maxBoardElements}
              onChange={(e) => updateSettingsField('storage', 'maxBoardElements', parseInt(e.target.value))}
              disabled={!settingsEditing}
              placeholder="Maximum elements per board"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">Max Boards Per User</label>
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
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">AI Engine Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <input
              type="checkbox"
              id="aiEnabled"
              checked={settingsFormData.ai.enabled}
              onChange={(e) => updateSettingsField('ai', 'enabled', e.target.checked)}
              disabled={!settingsEditing}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="aiEnabled" className="text-sm font-bold dark:text-slate-200 cursor-pointer">
              Enable AI Engine
            </label>
          </div>
          <div>
            <label className="text-sm font-bold dark:text-slate-200 block mb-2">Base URL</label>
            <Input
              value={settingsFormData.ai.baseUrl}
              onChange={(e) => updateSettingsField('ai', 'baseUrl', e.target.value)}
              disabled={!settingsEditing}
              placeholder="AI engine base URL"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold dark:text-slate-200 block mb-2">Timeout (ms)</label>
              <Input
                type="number"
                value={settingsFormData.ai.timeout}
                onChange={(e) => updateSettingsField('ai', 'timeout', parseInt(e.target.value))}
                disabled={!settingsEditing}
                placeholder="Timeout in milliseconds"
              />
            </div>
            <div>
              <label className="text-sm font-bold dark:text-slate-200 block mb-2">Max Tokens</label>
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
              <label className="text-sm font-bold dark:text-slate-200 block mb-2">Rate Limit (per user)</label>
              <Input
                type="number"
                value={settingsFormData.ai?.rateLimits?.perUser || 0}
                onChange={(e) => updateNestedSettingsField('ai', 'rateLimits', 'perUser', parseInt(e.target.value))}
                disabled={!settingsEditing}
                placeholder="Requests per user"
              />
            </div>
            <div>
              <label className="text-sm font-bold dark:text-slate-200 block mb-2">Rate Limit (per hour)</label>
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
              <label className="text-sm font-bold dark:text-slate-200 block mb-2">JWT Expires In</label>
              <Input
                value={settingsFormData.security.jwtExpiresIn}
                onChange={(e) => updateSettingsField('security', 'jwtExpiresIn', e.target.value)}
                disabled={!settingsEditing}
                placeholder="e.g., 7d, 24h"
              />
            </div>
            <div>
              <label className="text-sm font-bold dark:text-slate-200 block mb-2">Password Min Length</label>
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
            <label className="text-sm font-bold dark:text-slate-200 block mb-2">Bcrypt Rounds</label>
            <Input
              type="number"
              value={settingsFormData.security.bcryptRounds}
              onChange={(e) => updateSettingsField('security', 'bcryptRounds', parseInt(e.target.value))}
              disabled={!settingsEditing}
              placeholder="Bcrypt salt rounds"
            />
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <input
              type="checkbox"
              id="twoFactor"
              checked={settingsFormData.security.enableTwoFactor}
              onChange={(e) => updateSettingsField('security', 'enableTwoFactor', e.target.checked)}
              disabled={!settingsEditing}
              className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
            />
            <label htmlFor="twoFactor" className="text-sm font-bold dark:text-slate-200 cursor-pointer">
              Enable Two-Factor Authentication
            </label>
          </div>
        </div>
      </Card>

      {/* Analytics Settings */}
      <Card>
        <h3 className="text-xl font-black text-slate-800 mb-6">Analytics Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <input
              type="checkbox"
              id="analyticsEnabled"
              checked={settingsFormData.analytics.enabled}
              onChange={(e) => updateSettingsField('analytics', 'enabled', e.target.checked)}
              disabled={!settingsEditing}
              className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
            />
            <label htmlFor="analyticsEnabled" className="text-sm font-bold dark:text-slate-200 cursor-pointer">
              Enable Analytics
            </label>
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <input
              type="checkbox"
              id="trackUserActivity"
              checked={settingsFormData.analytics.trackUserActivity}
              onChange={(e) => updateSettingsField('analytics', 'trackUserActivity', e.target.checked)}
              disabled={!settingsEditing || !settingsFormData.analytics.enabled}
              className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
            />
            <label htmlFor="trackUserActivity" className="text-sm font-bold dark:text-slate-200 cursor-pointer">
              Track User Activity
            </label>
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <input
              type="checkbox"
              id="trackBoardUsage"
              checked={settingsFormData.analytics.trackBoardUsage}
              onChange={(e) => updateSettingsField('analytics', 'trackBoardUsage', e.target.checked)}
              disabled={!settingsEditing || !settingsFormData.analytics.enabled}
              className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
            />
            <label htmlFor="trackBoardUsage" className="text-sm font-bold dark:text-slate-200 cursor-pointer">
              Track Board Usage
            </label>
          </div>
          <div>
            <label className="text-sm font-bold dark:text-slate-200 block mb-2">Data Retention (days)</label>
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
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Email Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <input
              type="checkbox"
              id="emailEnabled"
              checked={settingsFormData.email.enabled}
              onChange={(e) => updateSettingsField('email', 'enabled', e.target.checked)}
              disabled={!settingsEditing}
              className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
            />
            <label htmlFor="emailEnabled" className="text-sm font-bold dark:text-slate-200 cursor-pointer">
              Enable Email Service
            </label>
          </div>
          <div>
            <label className="text-sm font-bold dark:text-slate-200 block mb-2">Email Service</label>
            <Input
              value={settingsFormData.email.service}
              onChange={(e) => updateSettingsField('email', 'service', e.target.value)}
              disabled={!settingsEditing || !settingsFormData.email.enabled}
              placeholder="e.g., gmail, sendgrid"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">From Address</label>
            <Input
              value={settingsFormData.email.from}
              onChange={(e) => updateSettingsField('email', 'from', e.target.value)}
              disabled={!settingsEditing || !settingsFormData.email.enabled}
              placeholder="noreply@example.com"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PlatformSettings;
