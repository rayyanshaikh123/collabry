'use client';

import React, { memo } from 'react';
import { BoardParticipant } from '@/types/studyBoard.types';

interface CursorData {
  x: number;
  y: number;
}

interface LiveCursorProps {
  cursor: CursorData;
  participant: BoardParticipant | undefined;
}

const LiveCursor = memo<LiveCursorProps>(({ cursor, participant }) => {
  if (!participant) return null;
  
  return (
    <div
      className="absolute transition-transform duration-100"
      style={{
        left: cursor.x,
        top: cursor.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={participant.color}
        className="drop-shadow-lg"
      >
        <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" />
      </svg>
      <div 
        className="ml-6 -mt-2 px-2 py-1 rounded text-white text-xs font-bold whitespace-nowrap shadow-lg"
        style={{ backgroundColor: participant.color }}
      >
        {participant.name.split('@')[0]}
      </div>
    </div>
  );
});
LiveCursor.displayName = 'LiveCursor';

interface LiveCursorsProps {
  cursors: Record<string, CursorData>;
  participants: BoardParticipant[];
}

export function LiveCursors({ cursors, participants }: LiveCursorsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {Object.entries(cursors).map(([userId, cursor]) => {
        const participant = participants.find(p => p.userId === userId);
        return <LiveCursor key={userId} cursor={cursor} participant={participant} />;
      })}
    </div>
  );
}
