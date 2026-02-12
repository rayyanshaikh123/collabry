'use client';


import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input, LoadingOverlay } from '../components/UIElements';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authService } from '@/lib/services/auth.service';

const Auth: React.FC<{ type: 'login' | 'register', onAuthSuccess: () => void }> = ({ type, onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(type === 'register');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  const { login, register } = useAuthStore();

  // Get selected role from sessionStorage (from role selection page)
  const getSelectedRole = (): 'student' | 'admin' => {
    if (typeof window !== 'undefined') {
      const role = sessionStorage.getItem('selectedRole');
      return (role as 'student' | 'admin') || 'student';
    }
    return 'student';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!formData.name || !formData.email || !formData.password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: getSelectedRole(),
        });
        // Registration successful — show verification message (no redirect)
        setVerificationEmail(formData.email);
        setVerificationSent(true);
      } else {
        if (!formData.email || !formData.password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        await login({
          email: formData.email,
          password: formData.password,
        });
        onAuthSuccess();
      }
    } catch (err: any) {
      // If login returns 403 — email not verified
      if (!isRegister && err.status === 403) {
        setNeedsVerification(true);
        setVerificationEmail(formData.email);
        setError('');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setNeedsVerification(false);
    setResendMessage('');
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage('');
    try {
      const msg = await authService.resendVerification(verificationEmail);
      setResendMessage(msg);
    } catch (err: any) {
      setResendMessage(err.message || 'Failed to resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // Show verification sent screen after successful registration
  if (verificationSent) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-3">Check your email</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-2">
            We sent a verification link to
          </p>
          <p className="text-indigo-600 dark:text-indigo-400 font-semibold mb-6">{verificationEmail}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">
            Click the link in your email to verify your account. The link expires in 24 hours.
          </p>

          {resendMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm mb-4">
              {resendMessage}
            </div>
          )}

          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
          >
            {resendLoading ? 'Sending...' : "Didn't receive it? Resend email"}
          </button>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => {
                setVerificationSent(false);
                setIsRegister(false);
              }}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-950 font-sans relative">
      {loading && <LoadingOverlay message={isRegister ? "Creating your account..." : "Signing you in..."} />}
      <div className="flex-1 hidden lg:flex flex-col justify-center items-center bg-indigo-600 dark:bg-indigo-700 p-20 text-white relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/30 rounded-full -ml-48 -mb-48 blur-3xl" />

        <div className="max-w-lg z-10">
          <Link href="/" className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mb-8 border border-white/30 shadow-2xl hover:bg-white/30 transition-all cursor-pointer">
            <span className="text-white font-black text-3xl">C</span>
          </Link>
          <h1 className="text-5xl font-black mb-6 leading-tight">Better learning, <br />built together.</h1>
          <p className="text-xl text-indigo-100 font-medium leading-relaxed mb-10 opacity-80">
            Leverage AI and collaborative boards to master complex subjects faster.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
              <div className="w-10 h-10 bg-emerald-400/20 rounded-xl flex items-center justify-center text-emerald-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-white">AI Powered Insights</h4>
                <p className="text-xs text-indigo-100/60">Automated summaries and study plans.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
              <div className="w-10 h-10 bg-amber-400/20 rounded-xl flex items-center justify-center text-amber-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-white">Collaborative Boards</h4>
                <p className="text-xs text-indigo-100/60">Learn with peers in real-time, anywhere.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-[0.8] flex flex-col justify-center items-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <Link href="/" className="lg:hidden w-12 h-12 bg-indigo-600 dark:bg-indigo-700 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-indigo-100 dark:shadow-indigo-900/50 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all cursor-pointer">
              <span className="text-white font-bold text-2xl">C</span>
            </Link>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-200">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">{isRegister ? 'Start your collaborative journey today.' : 'Please enter your details to sign in.'}</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Inline verification banner when login returns 403 */}
            {needsVerification && !isRegister && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Email not verified</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Please check your inbox for a verification link. You must verify your email before signing in.
                    </p>
                    {resendMessage && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">{resendMessage}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendLoading}
                      className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                    >
                      {resendLoading ? 'Sending...' : 'Resend verification email'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Full Name</label>
                <Input
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Email Address</label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Password</label>
                {!isRegister && (
                  <Link href="/forgot-password" className="text-[10px] font-bold text-indigo-600 hover:underline uppercase">
                    Forgot Password?
                  </Link>
                )}
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Password strength indicators (register only) */}
            {isRegister && formData.password && (
              <div className="space-y-1.5 px-1">
                <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Password strength</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${formData.password.length >= 8 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span className={`text-xs ${formData.password.length >= 8 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>8+ characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(formData.password) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span className={`text-xs ${/[A-Z]/.test(formData.password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>Uppercase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(formData.password) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span className={`text-xs ${/[a-z]/.test(formData.password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>Lowercase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(formData.password) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span className={`text-xs ${/[0-9]/.test(formData.password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>Number</span>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-4 rounded-2xl text-lg font-bold mt-4"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          {/* Provider logins removed — local email/password only */}

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-10">
            {isRegister ? 'Already have an account?' : 'Don\'t have an account?'}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="ml-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {isRegister ? 'Sign In' : 'Create one now'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

