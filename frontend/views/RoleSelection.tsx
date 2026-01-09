'use client';


import React from 'react';
import { Card, Button } from '../components/UIElements';

const RoleSelection: React.FC<{ onSelectRole: (role: 'student' | 'admin') => void }> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-slate-800 dark:text-slate-200 font-display tracking-tight">Who are you today?</h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em]">Pick your path to continue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Student Path */}
        <button 
          onClick={() => onSelectRole('student')}
          className="group text-left"
        >
          <Card className="h-full border-b-8 border-indigo-600 dark:border-indigo-500 hover:scale-105 transition-all p-10 flex flex-col items-center text-center space-y-6">
             <div className="w-32 h-32 bg-indigo-100 dark:bg-indigo-900/30 rounded-[2.5rem] flex items-center justify-center text-6xl group-hover:rotate-12 transition-transform">
               🎒
             </div>
             <div className="space-y-2">
                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-200">Explorer</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold">Join study sessions, chat with AI, and master your subjects.</p>
             </div>
             <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
               <div className="w-full h-full bg-indigo-500 dark:bg-indigo-600 rounded-full" />
             </div>
          </Card>
        </button>

        {/* Admin Path */}
        <button 
          onClick={() => onSelectRole('admin')}
          className="group text-left"
        >
          <Card className="h-full border-b-8 border-amber-500 dark:border-amber-600 hover:scale-105 transition-all p-10 flex flex-col items-center text-center space-y-6">
             <div className="w-32 h-32 bg-amber-100 dark:bg-amber-900/30 rounded-[2.5rem] flex items-center justify-center text-6xl group-hover:-rotate-12 transition-transform">
               🛰️
             </div>
             <div className="space-y-2">
                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-200">Command Center</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold">Manage users, monitor AI usage, and oversee the ecosystem.</p>
             </div>
             <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
               <div className="w-full h-full bg-amber-400 dark:bg-amber-500 rounded-full" />
             </div>
          </Card>
        </button>
      </div>

      <p className="text-xs font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
        Need help? Contact our support squad.
      </p>
    </div>
  );
};

export default RoleSelection;

