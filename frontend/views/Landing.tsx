'use client';


import React, { useState } from 'react';
import { Button } from '../components/UIElements';
import { ICONS } from '../constants';

const LandingPage: React.FC<{ onGetStarted: () => void; onCycleTheme?: () => void }> = ({ onGetStarted, onCycleTheme }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLogoClick = () => {
    if (onCycleTheme) {
      setIsAnimating(true);
      onCycleTheme();
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden flex flex-col">
      {/* Navbar */}
      <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogoClick}
            className={`w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg border-b-4 border-indigo-800 transition-all active:translate-y-1 active:border-b-0 ${isAnimating ? 'animate-logo-pop' : ''}`}
            title="Click to cycle theme!"
          >
            <span className="text-white font-black text-2xl font-display">C</span>
          </button>
          <span className="text-2xl font-black text-slate-800 tracking-tight font-display">Collabry</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <button className="text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">Features</button>
          <button className="text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">Community</button>
          <button className="text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">Pricing</button>
          <Button variant="primary" size="sm" onClick={onGetStarted}>Sign In</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12 relative">
        <div className="absolute top-20 left-10 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-40 right-10 w-48 h-48 bg-rose-100 rounded-full blur-3xl opacity-60 animate-pulse" />
        
        <div className="max-w-4xl space-y-6 relative z-10">
          <div className="inline-block px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-[0.2em] border-2 border-indigo-100 mb-4 animate-bounce">
            Learning Reimagined 🚀
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-slate-800 leading-[1.1] tracking-tight font-display">
            Study Together, <br/> 
            <span className="text-indigo-600">Smarter & Better.</span>
          </h1>
          <p className="text-lg md:text-2xl text-slate-500 font-bold max-w-2xl mx-auto leading-relaxed">
            The all-in-one AI study buddy & collaborative workspace for students who want to crush their goals while having fun.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <Button size="lg" className="px-12 py-5 text-xl shadow-2xl shadow-indigo-200" onClick={onGetStarted}>
            Start Your Journey
          </Button>
          <Button variant="secondary" size="lg" className="px-12 py-5 text-xl border-2 border-slate-100">
            See it in Action
          </Button>
        </div>

        {/* Feature Teasers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mt-20">
          {[
            { title: 'AI Study Buddy', desc: 'Your 24/7 personal tutor powered by Gemini.', icon: '🤖', color: 'bg-amber-100 text-amber-700' },
            { title: 'Live Boards', desc: 'Real-time collaborative drawing and brainstorming.', icon: '🎨', color: 'bg-indigo-100 text-indigo-700' },
            { title: 'Focus Streak', desc: 'Stay productive with gamified focus sessions.', icon: '🔥', color: 'bg-rose-100 text-rose-700' },
          ].map((f, i) => (
            <div key={i} className="p-8 bg-white border-2 border-slate-50 rounded-[2.5rem] shadow-xl hover:-translate-y-2 transition-all group">
              <div className={`w-16 h-16 ${f.color} rounded-[1.5rem] flex items-center justify-center text-3xl mb-6 shadow-md border-b-4 border-slate-200 group-hover:border-indigo-300`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{f.title}</h3>
              <p className="text-slate-500 font-bold text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-12 border-t-2 border-slate-50 bg-slate-50/50 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
             <button 
              onClick={handleLogoClick}
              className={`w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg border-b-2 border-indigo-800 transition-all active:translate-y-0.5 active:border-b-0 ${isAnimating ? 'animate-logo-pop' : ''}`}
            >
              <span className="text-white font-black text-lg">C</span>
            </button>
            <span className="text-xl font-black text-slate-800 tracking-tight">Collabry</span>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">© 2024 Collabry Labs. All rights reserved.</p>
          <div className="flex gap-6">
            <button className="text-slate-400 hover:text-indigo-500"><ICONS.Share size={20}/></button>
            <button className="text-slate-400 hover:text-indigo-500"><ICONS.Search size={20}/></button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

