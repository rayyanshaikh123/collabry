'use client';

import React from 'react';
import { use } from 'react';
import CollaborativeBoard from '../../../../views/StudyBoardNew';

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  return <CollaborativeBoard />;
}
