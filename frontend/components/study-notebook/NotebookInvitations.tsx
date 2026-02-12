'use client';

import React, { useState, useEffect } from 'react';
import notebookService from '@/lib/services/notebook.service';
import { ICONS } from '../../constants';
import { Button } from '../UIElements';
import { showSuccess, showError } from '@/lib/alert';

const NotebookInvitations: React.FC = () => {
    const [invitations, setInvitations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        loadInvitations();
    }, []);

    const loadInvitations = async () => {
        try {
            setLoading(true);
            const res = await notebookService.getPendingInvitations();
            if (res.success) {
                setInvitations(res.data);
            }
        } catch (err) {
            console.error('Failed to load invitations:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (notebookId: string) => {
        try {
            setActionLoading(notebookId);
            const res = await notebookService.acceptInvitation(notebookId);
            if (res.success) {
                showSuccess('Invitation accepted! You now have access.');
                setInvitations(prev => prev.filter(inv => inv.notebookId !== notebookId));
                // Reload page or notebooks list to show the new notebook
                window.location.reload();
            }
        } catch (err) {
            showError('Failed to accept invitation');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (notebookId: string) => {
        try {
            setActionLoading(notebookId);
            const res = await notebookService.rejectInvitation(notebookId);
            if (res.success) {
                showSuccess('Invitation declined');
                setInvitations(prev => prev.filter(inv => inv.notebookId !== notebookId));
            }
        } catch (err) {
            showError('Failed to decline invitation');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return null;
    if (invitations.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ICONS.Bell className="w-3 h-3" />
                Pending Invitations ({invitations.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {invitations.map((inv) => (
                    <div
                        key={inv.notebookId}
                        className="bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-3xl p-5 shadow-xl shadow-indigo-100/50 dark:shadow-none relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-110" />

                        <div className="relative z-10">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1 line-clamp-1">
                                📚 {inv.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-4">
                                Invited by <span className="text-indigo-600 dark:text-indigo-400">{inv.owner.name}</span>
                            </p>

                            <div className="flex gap-2">
                                <Button
                                    className="flex-1 py-1.5 rounded-xl text-xs"
                                    onClick={() => handleAccept(inv.notebookId)}
                                    disabled={actionLoading === inv.notebookId}
                                >
                                    {actionLoading === inv.notebookId ? '...' : 'Accept'}
                                </Button>
                                <button
                                    className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => handleReject(inv.notebookId)}
                                    disabled={actionLoading === inv.notebookId}
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NotebookInvitations;
