'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Trash2, RotateCcw, AlertTriangle, BookOpen, PenTool, Clock, Search, Loader2, XCircle } from 'lucide-react';
import recycleBinService, { RecycleBinItem } from '@/lib/services/recycleBin.service';
import { LoadingPage, LoadingOverlay } from '../components/UIElements';

type FilterTab = 'all' | 'notebook' | 'board';

function getDaysRemaining(deletedAt: string): number {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function getTimeSinceDeleted(deletedAt: string): string {
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diffMs = now.getTime() - deleted.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

export default function RecycleBin() {
    const [items, setItems] = useState<RecycleBinItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterTab>('all');
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await recycleBinService.getTrashItems();
            setItems(data || []);
        } catch (err: any) {
            setError(err?.message || 'Failed to load recycle bin');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleRestore = async (item: RecycleBinItem) => {
        try {
            setActionLoading(item._id);
            await recycleBinService.restoreItem(item.type, item._id);
            setItems(prev => prev.filter(i => i._id !== item._id));
        } catch (err: any) {
            setError(err?.message || 'Failed to restore item');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePermanentDelete = async (item: RecycleBinItem) => {
        if (!confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) return;
        try {
            setActionLoading(item._id);
            await recycleBinService.permanentlyDeleteItem(item.type, item._id);
            setItems(prev => prev.filter(i => i._id !== item._id));
        } catch (err: any) {
            setError(err?.message || 'Failed to delete item');
        } finally {
            setActionLoading(null);
        }
    };

    const handleEmptyBin = async () => {
        try {
            setShowEmptyConfirm(false);
            setActionLoading('empty');
            await recycleBinService.emptyRecycleBin();
            setItems([]);
        } catch (err: any) {
            setError(err?.message || 'Failed to empty recycle bin');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = items
        .filter(i => filter === 'all' || i.type === filter)
        .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="p-4 md:p-0 max-w-6xl mx-auto space-y-6 relative">
            {loading && <LoadingPage />}
            {actionLoading && <LoadingOverlay message={actionLoading === 'empty' ? 'Emptying bin...' : 'Processing...'} />}
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-rose-900/40 border-b-4 border-rose-700">
                        <Trash2 className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Recycle Bin</h1>
                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                            {items.length} {items.length === 1 ? 'item' : 'items'} in trash
                        </p>
                    </div>
                </div>

                {items.length > 0 && (
                    <button
                        onClick={() => setShowEmptyConfirm(true)}
                        disabled={actionLoading === 'empty'}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all border-2 border-rose-200 dark:border-rose-800 disabled:opacity-50"
                    >
                        {actionLoading === 'empty' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Empty Bin
                    </button>
                )}
            </div>

            {/* ── Warning Banner ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800/50">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" strokeWidth={2.5} />
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    Items are automatically and permanently deleted after <span className="font-black">30 days</span> in the recycle bin.
                </p>
            </div>

            {/* ── Empty Bin Confirmation Modal ────────────────────────────────── */}
            {showEmptyConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-rose-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Empty Recycle Bin?</h3>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            This will permanently delete <span className="font-bold text-rose-500">{items.length} {items.length === 1 ? 'item' : 'items'}</span>. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEmptyConfirm(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEmptyBin}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 dark:shadow-rose-900/40"
                            >
                                Delete All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Filter Tabs + Search ───────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex gap-1.5 bg-white dark:bg-slate-900 rounded-2xl p-1.5 border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                    {(['all', 'notebook', 'board'] as FilterTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === tab
                                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            {tab === 'all' ? 'All' : tab === 'notebook' ? 'Notebooks' : 'Study Boards'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex items-center bg-white dark:bg-slate-900 rounded-2xl px-4 py-2.5 border-2 border-slate-100 dark:border-slate-800 shadow-sm focus-within:border-indigo-300 dark:focus-within:border-indigo-700 transition-all">
                    <Search className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" strokeWidth={3} />
                    <input
                        type="text"
                        placeholder="Search trashed items..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm ml-2 w-full text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-500 font-bold"
                    />
                </div>
            </div>

            {/* ── Error ──────────────────────────────────────────────────────── */}
            {error && (
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800/50">
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600 transition-colors">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}


            {/* ── Empty State ────────────────────────────────────────────────── */}
            {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Trash2 className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-lg font-black text-slate-400 dark:text-slate-500">
                        {items.length === 0 ? 'Recycle bin is empty' : 'No items match your filter'}
                    </h3>
                    <p className="text-sm text-slate-300 dark:text-slate-600 max-w-sm text-center">
                        {items.length === 0
                            ? 'Deleted notebooks and study boards will appear here for 30 days before being permanently removed.'
                            : 'Try changing the filter or search term.'}
                    </p>
                </div>
            )}

            {/* ── Item Cards ─────────────────────────────────────────────────── */}
            {!loading && filtered.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(item => {
                        const daysLeft = getDaysRemaining(item.deletedAt);
                        const isUrgent = daysLeft <= 7;
                        const isLoading = actionLoading === item._id;

                        return (
                            <div
                                key={item._id}
                                className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300"
                            >
                                {/* Type Badge + Deleted Time */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.type === 'notebook'
                                            ? 'bg-indigo-100 dark:bg-indigo-900/40'
                                            : 'bg-violet-100 dark:bg-violet-900/40'
                                            }`}>
                                            {item.type === 'notebook'
                                                ? <BookOpen className="w-4 h-4 text-indigo-500" strokeWidth={2.5} />
                                                : <PenTool className="w-4 h-4 text-violet-500" strokeWidth={2.5} />
                                            }
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-wider ${item.type === 'notebook' ? 'text-indigo-400' : 'text-violet-400'
                                            }`}>
                                            {item.type}
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium text-slate-300 dark:text-slate-600">
                                        {getTimeSinceDeleted(item.deletedAt)}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-base font-black text-slate-700 dark:text-slate-200 mb-1.5 truncate">
                                    {item.title}
                                </h3>
                                {item.description && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 line-clamp-2">{item.description}</p>
                                )}

                                {/* Meta */}
                                <div className="flex items-center gap-3 mb-4 text-xs text-slate-400 dark:text-slate-500">
                                    {item.type === 'notebook' && (
                                        <>
                                            <span className="font-semibold">{item.sourceCount} sources</span>
                                            <span>·</span>
                                            <span className="font-semibold">{item.artifactCount} artifacts</span>
                                        </>
                                    )}
                                    {item.type === 'board' && (
                                        <>
                                            <span className="font-semibold">{item.memberCount} members</span>
                                            {item.isPublic && (
                                                <>
                                                    <span>·</span>
                                                    <span className="font-semibold text-emerald-400">Public</span>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Days Remaining */}
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 ${isUrgent
                                    ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50'
                                    : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700'
                                    }`}>
                                    <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'}`} strokeWidth={2.5} />
                                    <span className={`text-xs font-bold ${isUrgent ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {daysLeft === 0 ? 'Expires today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRestore(item)}
                                        disabled={isLoading}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all border border-indigo-200 dark:border-indigo-800 disabled:opacity-50"
                                    >
                                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />}
                                        Restore
                                    </button>
                                    <button
                                        onClick={() => handlePermanentDelete(item)}
                                        disabled={isLoading}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all border border-rose-200 dark:border-rose-800 disabled:opacity-50"
                                    >
                                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />}
                                        Delete Forever
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
