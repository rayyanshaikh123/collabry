'use client';

/**
 * Simple Verified Mode Toggle Component
 * Add this to the ChatPanel header or as a separate control
 */

import React from 'react';

interface VerifiedModeToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

const VerifiedModeToggle: React.FC<VerifiedModeToggleProps> = ({ enabled, onChange }) => {
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <button
                onClick={() => onChange(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled
                        ? 'bg-green-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                role="switch"
                aria-checked={enabled}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
            <div className="flex items-center gap-1.5">
                <span className="text-lg">{enabled ? '✅' : '🔍'}</span>
                <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Verified Mode
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {enabled ? 'Detecting misinformation' : 'Normal mode'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifiedModeToggle;
