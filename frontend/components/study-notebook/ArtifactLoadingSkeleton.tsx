'use client';

import React from 'react';

type ArtifactType = 'mindmap' | 'flashcards' | 'infographic' | 'quiz' | 'general';

interface ArtifactLoadingSkeletonProps {
    type: ArtifactType;
}

export default function ArtifactLoadingSkeleton({ type }: ArtifactLoadingSkeletonProps) {
    const config = {
        mindmap: {
            icon: '🗺️',
            label: 'Generating Mind Map',
            color: 'emerald',
            bgLight: 'bg-emerald-50',
            bgDark: 'dark:bg-emerald-900/20',
            textColor: 'text-emerald-700 dark:text-emerald-300'
        },
        flashcards: {
            icon: '🎴',
            label: 'Creating Flashcards',
            color: 'blue',
            bgLight: 'bg-blue-50',
            bgDark: 'dark:bg-blue-900/20',
            textColor: 'text-blue-700 dark:text-blue-300'
        },
        infographic: {
            icon: '📊',
            label: 'Designing Infographic',
            color: 'cyan',
            bgLight: 'bg-cyan-50',
            bgDark: 'dark:bg-cyan-900/20',
            textColor: 'text-cyan-700 dark:text-cyan-300'
        },
        quiz: {
            icon: '❓',
            label: 'Preparing Quiz',
            color: 'indigo',
            bgLight: 'bg-indigo-50',
            bgDark: 'dark:bg-indigo-900/20',
            textColor: 'text-indigo-700 dark:text-indigo-300'
        },
        general: {
            icon: '✨',
            label: 'Thinking',
            color: 'purple',
            bgLight: 'bg-purple-50',
            bgDark: 'dark:bg-purple-900/20',
            textColor: 'text-purple-700 dark:text-purple-300'
        }
    };

    const { icon, label, bgLight, bgDark, textColor } = config[type];

    return (
        <div className={`p-6 ${bgLight} ${bgDark} rounded-xl border-2 border-slate-200 dark:border-slate-700`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl animate-pulse">{icon}</div>
                <div className={`font-bold ${textColor}`}>{label}...</div>
            </div>

            {/* Type-specific skeleton */}
            {type === 'mindmap' && <MindmapSkeleton />}
            {type === 'flashcards' && <FlashcardsSkeleton />}
            {type === 'infographic' && <InfographicSkeleton />}
            {type === 'quiz' && <QuizSkeleton />}
            {type === 'general' && <GeneralSkeleton />}
        </div>
    );
}

// Mindmap skeleton
function MindmapSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-32 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            </div>
            <div className="flex items-center gap-3 pl-8">
                <div className="w-28 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="w-20 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            </div>
            <div className="flex items-center gap-3 pl-8">
                <div className="w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            </div>
        </div>
    );
}

// Flashcards skeleton
function FlashcardsSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700">
                    <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-3" />
                    <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
                    <div className="w-5/6 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
}

// Infographic skeleton
function InfographicSkeleton() {
    return (
        <div className="space-y-4">
            <div className="w-2/3 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mx-auto" />
            <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700">
                        <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
                        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1" />
                        <div className="w-4/5 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Quiz skeleton
function QuizSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2].map((i) => (
                <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                        <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2 pl-10">
                        {[1, 2, 3, 4].map((j) => (
                            <div key={j} className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// General skeleton
function GeneralSkeleton() {
    return (
        <div className="space-y-3">
            <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="w-5/6 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="w-4/5 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
    );
}
