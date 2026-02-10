'use client';

import React from 'react';
import Dashboard from '../../../views/Dashboard';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const pathMap: Record<string, string> = {
      'study-board': '/study-board',
      'planner': '/planner',
      'focus': '/focus',
      'study-buddy': '/study-buddy',
      'visual-aids': '/visual-aids',
      'profile': '/profile',
      'flashcards': '/flashcards',
      'study-notebook': '/study-notebook',
    };
    router.push(pathMap[route] || '/dashboard');
  };

  return <Dashboard onNavigate={handleNavigate as any} />;
}

