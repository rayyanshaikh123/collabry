'use client';

import React, { useState } from 'react';
import { ICONS } from '@/constants';

interface Citation {
    id: number;
    source_id: string;
    source_name: string;
    excerpt: string;
    page?: number;
    type?: string;
}

interface CitationDisplayProps {
    citations: Citation[];
}

export default function CitationDisplay({ citations }: CitationDisplayProps) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    if (!citations || citations.length === 0) {
        return null;
    }

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getTypeIcon = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'pdf':
                return <ICONS.FileText size={14} className="text-rose-500" />;
            case 'text':
                return <ICONS.FileText size={14} className="text-blue-500" />;
            case 'audio':
                return <ICONS.Mic size={14} className="text-purple-500" />;
            case 'website':
                return <ICONS.globe size={14} className="text-emerald-500" />;
            default:
                return <ICONS.FileText size={14} className="text-slate-500" />;
        }
    };

    return (
        <div className="mt-4 border-t-2 border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center gap-2 mb-3">
                <ICONS.Book size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
                    Sources ({citations.length})
                </h4>
            </div>

            <div className="space-y-2">
                {citations.map((citation) => (
                    <div
                        key={citation.id}
                        className="rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden transition-all"
                    >
                        <button
                            onClick={() => toggleExpand(citation.id)}
                            className="w-full px-3 py-2 flex items-start gap-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left"
                        >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs shrink-0 mt-0.5">
                                {citation.id}
                            </span>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {getTypeIcon(citation.type)}
                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                                        {citation.source_name}
                                    </span>
                                    {citation.page && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                            p. {citation.page}
                                        </span>
                                    )}
                                </div>

                                {!expandedId || expandedId !== citation.id ? (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                                        {citation.excerpt}
                                    </p>
                                ) : null}
                            </div>

                            <ICONS.ChevronDown
                                size={16}
                                className={`text-slate-400 shrink-0 mt-1 transition-transform ${expandedId === citation.id ? 'rotate-180' : ''
                                    }`}
                            />
                        </button>

                        {expandedId === citation.id && (
                            <div className="px-3 pb-3 pt-1">
                                <div className="pl-8">
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {citation.excerpt}
                                    </p>
                                    {citation.excerpt.length >= 300 && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">
                                            ...excerpt truncated
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 italic">
                💡 Click on a citation number to view the source excerpt
            </p>
        </div>
    );
}
