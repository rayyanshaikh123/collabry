'use client';

import React, { memo } from 'react';
import { Button } from '../UIElements';
import { ICONS } from '../../constants';
import { BoardParticipant } from '@/types/studyBoard.types';

interface ParticipantAvatarProps {
  participant: BoardParticipant;
  index: number;
}

export const ParticipantAvatar = memo<ParticipantAvatarProps>(({ participant, index }) => (
  <div
    key={`${participant.userId}-${index}`}
    className="w-10 h-10 rounded-2xl border-4 border-white dark:border-slate-900 flex items-center justify-center text-white font-black text-xs shadow-md"
    style={{ backgroundColor: participant.color }}
    title={participant.name || participant.email || 'User'}
  >
    {(participant.name || participant.email || 'U').charAt(0).toUpperCase()}
  </div>
));
ParticipantAvatar.displayName = 'ParticipantAvatar';

interface BoardHeaderProps {
  boardTitle?: string;
  isConnected: boolean;
  participants: BoardParticipant[];
  onBack: () => void;
  onInvite?: () => void;
  onSettings?: () => void;
  onExport?: () => void;
}

export function BoardHeader({
  boardTitle,
  isConnected,
  participants,
  onBack,
  onInvite,
  onSettings,
  onExport,
}: BoardHeaderProps) {
  const visibleParticipants = participants.slice(0, 3);
  const participantCount = participants.length;

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b-2 border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between z-20">
      <div className="flex items-center gap-5">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-2xl h-10 w-10 border-b-2"
          onClick={onBack}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            {boardTitle || 'Untitled Board'}
            {isConnected && (
              <div className="flex items-center bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                Live Session
              </div>
            )}
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">
            {participantCount > 0
              ? `${participantCount} other${participantCount > 1 ? 's' : ''} studying here`
              : 'You are alone in this board'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Participant Avatars */}
        <div className="flex -space-x-3 mr-4">
          {visibleParticipants.map((p, i) => (
            <ParticipantAvatar key={p.userId} participant={p} index={i} />
          ))}
          {participantCount > 3 && (
            <div className="w-10 h-10 rounded-2xl border-4 border-white dark:border-slate-900 bg-indigo-500 text-[11px] font-black text-white flex items-center justify-center shadow-md">
              +{participantCount - 3}
            </div>
          )}
        </div>
        {onExport && (
          <Button
            variant="secondary"
            size="icon"
            className="rounded-2xl h-10 w-10"
            onClick={onExport}
            title="Export board as PNG"
          >
            <ICONS.Download size={18} />
          </Button>
        )}
        {onInvite && (
          <Button
            variant="outline"
            className="gap-2 px-6"
            onClick={onInvite}
          >
            <ICONS.Share size={18} /> Invite
          </Button>
        )}
        {onSettings && (
          <Button
            variant="secondary"
            size="icon"
            className="rounded-2xl h-10 w-10"
            onClick={onSettings}
            title="Board Settings"
          >
            <ICONS.Settings size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
