'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { authService } from '@/lib/services/auth.service';
import { Button } from '@/components/UIElements';

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        await authService.verifyEmail(token);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Verification failed. The link may have expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      {status === 'loading' && (
        <>
          <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-2">
            Verifying your email...
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Please wait a moment.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-3">Email verified!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Your account is now active. You can sign in to get started.
          </p>
          <Button onClick={() => router.push('/login')} className="px-8 py-3 rounded-2xl font-bold">
            Go to Sign In
          </Button>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-3">Verification failed</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">{errorMessage}</p>
          <div className="flex gap-4">
            <Button onClick={() => router.push('/register')} className="px-6 py-3 rounded-2xl font-bold">
              Register again
            </Button>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="px-6 py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        </>
      )}
    </div>
  );
}
