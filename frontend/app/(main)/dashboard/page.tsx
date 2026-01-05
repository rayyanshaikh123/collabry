'use client';

import React from 'react';
import Dashboard from '../../../views/Dashboard';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const pathMap: Record<string, string> = {
      'STUDY_BOARD': '/study-board',
      'PLANNER': '/planner',
      'FOCUS': '/focus',
      'STUDY_BUDDY': '/study-buddy',
      'VISUAL_AIDS': '/visual-aids',
    };
    router.push(pathMap[route] || '/dashboard');
  };

  return <Dashboard onNavigate={handleNavigate as any} />;
}
