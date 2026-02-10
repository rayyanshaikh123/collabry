'use client';

import React, { useState } from 'react';
import LandingPage from '../views/Landing';
import Loader from '../components/ui/loader';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/stores/ui.store';

const THEMES = ['indigo', 'blue', 'amber', 'emerald', 'rose'];

export default function Home() {
  const [showLoader, setShowLoader] = useState(true);
  const router = useRouter();
  const { theme, setTheme } = useUIStore();

  const cycleTheme = () => {
    const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length;
    setTheme(THEMES[nextIndex] as any);
  };

  const handleGetStarted = () => {
    router.push('/role-selection');
  };

  const handleLoaderComplete = () => {
    setShowLoader(false);
  };

  if (showLoader) {
    return <Loader onComplete={handleLoaderComplete} />;
  }

  return (
    <LandingPage
      onGetStarted={handleGetStarted}
      onCycleTheme={cycleTheme}
    />
  );
}

