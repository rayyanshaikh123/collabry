'use client';

import React from 'react';
import LandingPage from '../views/Landing';
import { useRouter } from 'next/navigation';
import { useUIStore } from '../src/stores/ui.store';

const THEMES = ['indigo', 'blue', 'amber', 'emerald', 'rose'];

export default function Home() {
  const router = useRouter();
  const { theme, setTheme } = useUIStore();

  const cycleTheme = () => {
    const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length;
    setTheme(THEMES[nextIndex] as any);
  };

  const handleGetStarted = () => {
    router.push('/role-selection');
  };

  return (
    <LandingPage 
      onGetStarted={handleGetStarted} 
      onCycleTheme={cycleTheme}
    />
  );
}
