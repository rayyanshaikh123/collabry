"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ICONS } from '@/constants';

export default function NotificationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings?tab=notifications');
  }, [router]);

  return (
    <div className="flex h-[80vh] items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-500">Redirecting to notification settings...</p>
      </div>
    </div>
  );
}

