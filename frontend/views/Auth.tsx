'use client';


import React, { useState } from 'react';
import Link from 'next/link';
import { Card, Button, Input } from '../components/UIElements';
import { useAuthStore } from '../src/stores/auth.store';

const Auth: React.FC<{ type: 'login' | 'register', onAuthSuccess: () => void }> = ({ type, onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(type === 'register');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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
          role: getSelectedRole(), // Use selected role from role selection
        });
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
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-950 font-sans">
      <div className="flex-1 hidden lg:flex flex-col justify-center items-center bg-indigo-600 dark:bg-indigo-700 p-20 text-white relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/30 rounded-full -ml-48 -mb-48 blur-3xl" />
        
        <div className="max-w-lg z-10">
          <Link href="/" className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mb-8 border border-white/30 shadow-2xl hover:bg-white/30 transition-all cursor-pointer">
            <span className="text-white font-black text-3xl">C</span>
          </Link>
          <h1 className="text-5xl font-black mb-6 leading-tight">Better learning, <br/>built together.</h1>
          <p className="text-xl text-indigo-100 font-medium leading-relaxed mb-10 opacity-80">
            Join 20,000+ students leveraging AI and collaborative boards to master complex subjects faster.
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
            
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Full Name</label>
                <Input 
                  placeholder="John Doe" 
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
                placeholder="john@example.com"
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

            <Button 
              type="submit" 
              className="w-full py-4 rounded-2xl text-lg font-bold mt-4"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          <div className="mt-8 flex items-center gap-4 text-slate-300 dark:text-slate-600">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Or continue with</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button className="flex items-center justify-center gap-3 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Google</span>
            </button>
            <button className="flex items-center justify-center gap-3 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/></svg>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Facebook</span>
            </button>
          </div>

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

