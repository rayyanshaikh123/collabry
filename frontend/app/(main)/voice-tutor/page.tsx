'use client';

import dynamic from 'next/dynamic';

const VoiceTutor = dynamic(() => import('@/views/VoiceTutor'), { ssr: false });

export default function VoiceTutorPage() {
  return <VoiceTutor />;
}
