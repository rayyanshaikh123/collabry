'use client';

import React, { useState } from 'react';
import { Button } from './UIElements';
import { ICONS } from '../constants';

interface InviteMemberModalProps {
  boardId: string;
  boardTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onInvite?: (email: string, role: string) => Promise<void>;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  boardId,
  boardTitle,
  isOpen,
  onClose,
  onInvite
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shareLink, setShareLink] = useState('');

  if (!isOpen) return null;

  const handleInvite = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (onInvite) {
        await onInvite(email, role);
      }
      setSuccess(true);
      setEmail('');
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const generateShareLink = () => {
    const link = `${window.location.origin}/study-board/${boardId}`;
    setShareLink(link);
    navigator.clipboard.writeText(link);
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
    }
  };

  return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black">Invite to Board</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <ICONS.X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-indigo-100 text-sm">
            {boardTitle}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 bg-white dark:bg-slate-900">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
              <ICONS.CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                Invitation sent successfully!
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
              <ICONS.AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-800 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Permission Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRole('viewer')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  role === 'viewer'
                    ? 'border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
                disabled={isLoading}
              >
                <ICONS.Eye className={`w-5 h-5 mx-auto mb-2 ${role === 'viewer' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`} />
                <div className={`text-sm font-bold ${role === 'viewer' ? 'text-indigo-800 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>Viewer</div>
                <div className={`text-xs mt-1 ${role === 'viewer' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>Can view only</div>
              </button>
              <button
                onClick={() => setRole('editor')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  role === 'editor'
                    ? 'border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
                disabled={isLoading}
              >
                <ICONS.PenTool className={`w-5 h-5 mx-auto mb-2 ${role === 'editor' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`} />
                <div className={`text-sm font-bold ${role === 'editor' ? 'text-indigo-800 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>Editor</div>
                <div className={`text-xs mt-1 ${role === 'editor' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>Can edit</div>
              </button>
            </div>
          </div>

          {/* Send Invite Button */}
          <Button
            onClick={handleInvite}
            disabled={isLoading || !email.trim()}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400 font-bold">Or share link</span>
            </div>
          </div>

          {/* Share Link */}
          <div>
            {shareLink ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm"
                />
                <Button
                  variant="secondary"
                  onClick={copyShareLink}
                  className="px-4"
                >
                  <ICONS.Copy className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={generateShareLink}
                className="w-full"
              >
                <ICONS.Link className="w-4 h-4 mr-2" />
                Generate Share Link
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteMemberModal;
