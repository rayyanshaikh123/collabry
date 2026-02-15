'use client';

import React, { useState, useEffect } from 'react';
import { ICONS } from '../../constants';
import notebookService from '@/lib/services/notebook.service';
import { showSuccess, showError } from '@/lib/alert';
import { Button } from '../UIElements';

interface NotebookInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    notebookId: string;
}

const NotebookInviteModal: React.FC<NotebookInviteModalProps> = ({ isOpen, onClose, notebookId }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('editor');
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [friendsLoading, setFriendsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && notebookId) {
            loadCollaborators();
            loadFriends();
        }
    }, [isOpen, notebookId]);

    const loadCollaborators = async () => {
        try {
            setLoading(true);
            const res = await notebookService.getCollaborators(notebookId);
            if (res.success) {
                setCollaborators(res.data);
            }
        } catch (err: any) {
            console.error('Failed to load collaborators:', err);
            showError(err.message || 'Failed to load collaborators');
        } finally {
            setLoading(false);
        }
    };

    const loadFriends = async () => {
        try {
            setFriendsLoading(true);
            const res = await notebookService.getFriendsToInvite(notebookId);
            if (res.success) {
                setFriends(res.data);
            }
        } catch (err) {
            console.error('Failed to load friends:', err);
        } finally {
            setFriendsLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        try {
            setInviteLoading(true);
            const res = await notebookService.inviteCollaborator(notebookId, email, role);
            if (res.success) {
                showSuccess('Invitation sent successfully');
                setEmail('');
                loadCollaborators();
                loadFriends();
            }
        } catch (err: any) {
            showError(err.response?.data?.message || 'Failed to send invitation');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleInviteFriend = async (friendEmail: string) => {
        try {
            setInviteLoading(true);
            const res = await notebookService.inviteCollaborator(notebookId, friendEmail, 'editor');
            if (res.success) {
                showSuccess('Friend invited!');
                loadCollaborators();
                loadFriends();
            }
        } catch (err: any) {
            showError(err.response?.data?.message || 'Failed to invite friend');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemove = async (userId: string) => {
        try {
            const res = await notebookService.removeCollaborator(notebookId, userId);
            if (res.success) {
                showSuccess('Collaborator removed');
                loadCollaborators();
                loadFriends();
            }
        } catch (err) {
            showError('Failed to remove collaborator');
        }
    };

    const handleGenerateShareLink = async () => {
        try {
            const res = await notebookService.generateShareLink(notebookId);
            if (res.success) {
                setShareLink(res.data.shareUrl);
                showSuccess('Share link generated');
            }
        } catch (err) {
            showError('Failed to generate share link');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showSuccess('Copied to clipboard');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border-2 border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
                {/* Left Panel - Header & Main Controls */}
                <div className="md:w-1/2 flex flex-col border-r border-slate-100 dark:border-slate-800">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                                <ICONS.X className="w-6 h-6" />
                            </button>
                        </div>
                        <h2 className="text-3xl font-black mb-1">Collab</h2>
                        <p className="text-indigo-100 text-sm font-medium opacity-80">Invite your squad to study together</p>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto">
                        {/* Invite Form */}
                        <div>
                            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ICONS.UserPlus className="w-3 h-3" />
                                Invite by Email
                            </h3>
                            <form onSubmit={handleInvite} className="space-y-3">
                                <input
                                    type="email"
                                    placeholder="Enter collaborator's email"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none font-bold text-slate-700 dark:text-slate-300 appearance-none"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                    >
                                        <option value="editor">Editor (Can edit)</option>
                                        <option value="viewer">Viewer (Read-only)</option>
                                    </select>
                                    <Button type="submit" disabled={inviteLoading} className="px-6 rounded-2xl">
                                        {inviteLoading ? '...' : <ICONS.Send className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* Quick Invite Friends */}
                        <div>
                            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <ICONS.Heart className="w-3 h-3" />
                                    Your Friends
                                </span>
                                {friendsLoading && <div className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full" />}
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {friends.length > 0 ? (
                                    friends.map((friend) => (
                                        <div key={friend._id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/30 rounded-xl group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                                    {friend.avatar ? <img src={friend.avatar} className="w-full h-full object-cover" /> : friend.name.charAt(0)}
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{friend.name}</span>
                                            </div>
                                            <button
                                                onClick={() => handleInviteFriend(friend.email)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 bg-indigo-600 text-white rounded-lg transition-all transform scale-90 hover:scale-100"
                                            >
                                                <ICONS.Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-slate-400 italic text-center py-2">No friends to invite</p>
                                )}
                            </div>
                        </div>

                        {/* Share Link */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Global Share Link</h3>
                                {!shareLink && (
                                    <button onClick={handleGenerateShareLink} className="text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                                        Activate
                                    </button>
                                )}
                            </div>
                            {shareLink ? (
                                <div className="flex gap-2">
                                    <div className="flex-1 text-[10px] truncate bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-600 dark:text-slate-400">
                                        {shareLink}
                                    </div>
                                    <button onClick={() => copyToClipboard(shareLink)} className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors">
                                        <ICONS.Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-[10px] text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-center">Sharing is currently disabled</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Active Collaborators */}
                <div className="md:w-1/2 p-6 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-6 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <ICONS.Users className="w-4 h-4 text-indigo-500" />
                            Collaborators
                        </span>
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 px-2 py-0.5 rounded-full">{collaborators.length}</span>
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading squad...</p>
                            </div>
                        ) : collaborators.length > 0 ? (
                            collaborators.map((c) => (
                                <div key={c.userId.id || c.userId._id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-3 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-sm font-black text-indigo-600 overflow-hidden shadow-inner">
                                                    {c.userId.avatar ? <img src={c.userId.avatar} className="w-full h-full object-cover" /> : c.userId.name.charAt(0)}
                                                </div>
                                                {c.status === 'pending' && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white dark:border-slate-800 animate-pulse" title="Pending" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-none">{c.userId.name}</p>
                                                    {c.status === 'pending' && (
                                                        <span className="text-[8px] font-black uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1 rounded">Pending</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1 italic">{c.role}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemove(c.userId.id || c.userId._id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <ICONS.Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <ICONS.Users className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Solo quest for now.<br />Invite some friends!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotebookInviteModal;
