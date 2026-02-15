'use client';

import React from 'react';
import { Card } from '../UIElements';
import { ICONS } from '../../constants';

interface VerifiedClaim {
    text: string;
    status: 'verified' | 'partially_supported' | 'unsupported' | 'insufficient_data' | 'conflict';
    source: string;
    authority_level?: 'high' | 'medium' | 'low';
    reason: string;
}

interface VerifiedResponseData {
    mode: string;
    answer: string;
    claims: VerifiedClaim[];
    conflict_flag: boolean;
    outdated_flag: boolean;
    out_of_scope_flag: boolean;
    numeric_validated: boolean;
    logical_consistency_passed: boolean;
    confidence_score: number;
    emotional_support?: string;
    sources: Array<{ name: string; authority: string }>;
    coverage: number;
    misinformation_detected: boolean;
}

interface VerifiedResponseViewProps {
    data: VerifiedResponseData;
}

const VerifiedResponseView: React.FC<VerifiedResponseViewProps> = ({ data }) => {
    const [showDetails, setShowDetails] = React.useState(false);

    // Determine confidence color
    const getConfidenceColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    // Determine confidence icon
    const getConfidenceIcon = (score: number) => {
        if (score >= 80) return '✅';
        if (score >= 60) return '⚠️';
        return '❌';
    };

    // Status badge styling
    const getStatusBadge = (status: string) => {
        const styles = {
            verified: 'bg-green-100 text-green-800 border-green-300',
            partially_supported: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            unsupported: 'bg-red-100 text-red-800 border-red-300',
            insufficient_data: 'bg-gray-100 text-gray-800 border-gray-300',
            conflict: 'bg-orange-100 text-orange-800 border-orange-300',
        };
        return styles[status as keyof typeof styles] || styles.insufficient_data;
    };

    const getStatusIcon = (status: string) => {
        const icons = {
            verified: '✓',
            partially_supported: '◐',
            unsupported: '✗',
            insufficient_data: '?',
            conflict: '⚠',
        };
        return icons[status as keyof typeof icons] || '?';
    };

    const verifiedCount = data.claims.filter(c => c.status === 'verified').length;
    const unsupportedCount = data.claims.filter(c => c.status === 'unsupported').length;
    const conflictCount = data.claims.filter(c => c.status === 'conflict').length;

    return (
        <div className="space-y-3">
            {/* Emotional Support Banner */}
            {data.emotional_support && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-xl">💙</span>
                    <p className="text-sm text-blue-800 flex-1">{data.emotional_support}</p>
                </div>
            )}

            {/* Warning Flags */}
            {(data.conflict_flag || data.outdated_flag || data.out_of_scope_flag || data.misinformation_detected) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                    {data.conflict_flag && (
                        <div className="flex items-center gap-2 text-sm text-orange-800">
                            <span>⚠️</span>
                            <span>Contradictory information detected</span>
                        </div>
                    )}
                    {data.outdated_flag && (
                        <div className="flex items-center gap-2 text-sm text-orange-800">
                            <span>📅</span>
                            <span>Some information may be outdated</span>
                        </div>
                    )}
                    {data.out_of_scope_flag && (
                        <div className="flex items-center gap-2 text-sm text-orange-800">
                            <span>📚</span>
                            <span>Question may be outside syllabus scope</span>
                        </div>
                    )}
                    {data.misinformation_detected && (
                        <div className="flex items-center gap-2 text-sm text-orange-800">
                            <span>🚨</span>
                            <span>Potential misinformation patterns detected</span>
                        </div>
                    )}
                </div>
            )}

            {/* Confidence Badge */}
            <div className={`rounded-lg border-2 p-3 ${getConfidenceColor(data.confidence_score)}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{getConfidenceIcon(data.confidence_score)}</span>
                        <div>
                            <div className="font-semibold text-sm">Verified Answer</div>
                            <div className="text-xs opacity-80">
                                Confidence: {data.confidence_score.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-sm font-medium hover:underline flex items-center gap-1"
                    >
                        {showDetails ? 'Hide Details' : 'Show Details'}
                        <span className="text-xs">{showDetails ? '▲' : '▼'}</span>
                    </button>
                </div>
            </div>

            {/* Verification Details */}
            {showDetails && (
                <Card className="p-4 space-y-4 bg-gray-50">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-600 mb-1">Claims Verified</div>
                            <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-600 mb-1">Unsupported</div>
                            <div className="text-2xl font-bold text-red-600">{unsupportedCount}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-600 mb-1">Coverage</div>
                            <div className="text-2xl font-bold text-blue-600">{(data.coverage * 100).toFixed(0)}%</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-600 mb-1">Conflicts</div>
                            <div className="text-2xl font-bold text-orange-600">{conflictCount}</div>
                        </div>
                    </div>

                    {/* Validation Checks */}
                    <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-700">Validation Checks</div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                                <span>{data.numeric_validated ? '✅' : '❌'}</span>
                                <span className={data.numeric_validated ? 'text-green-700' : 'text-red-700'}>
                                    Arithmetic Validation
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span>{data.logical_consistency_passed ? '✅' : '❌'}</span>
                                <span className={data.logical_consistency_passed ? 'text-green-700' : 'text-red-700'}>
                                    Logical Consistency
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Claims List */}
                    {data.claims.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-sm font-semibold text-gray-700">
                                Claims ({data.claims.length})
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {data.claims.map((claim, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border ${getStatusBadge(claim.status)} bg-opacity-50`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="text-lg mt-0.5">{getStatusIcon(claim.status)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium mb-1 line-clamp-2">
                                                    {claim.text}
                                                </div>
                                                <div className="text-xs opacity-75">
                                                    {claim.reason}
                                                </div>
                                                {claim.source && (
                                                    <div className="text-xs mt-1 flex items-center gap-1">
                                                        <span>📚</span>
                                                        <span className="font-medium">{claim.source}</span>
                                                        {claim.authority_level && (
                                                            <span className="ml-1 px-1.5 py-0.5 bg-white bg-opacity-50 rounded text-xs">
                                                                {claim.authority_level}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sources */}
                    {data.sources.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-sm font-semibold text-gray-700">
                                Authoritative Sources
                            </div>
                            <div className="space-y-1">
                                {data.sources.map((source, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-gray-200">
                                        <span>📖</span>
                                        <span className="flex-1">{source.name}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs ${source.authority === 'high' ? 'bg-green-100 text-green-800' :
                                                source.authority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {source.authority}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default VerifiedResponseView;
