'use client';


import React from 'react';
import Link from 'next/link';
import { Card, Button, Badge, ProgressBar, Input } from '../components/UIElements';
import { ICONS } from '../constants';
import { useAuthStore } from '../src/stores/auth.store';

const ProfileView: React.FC = () => {
  const { user } = useAuthStore();
  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const joinedDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
  
  return (
    <div className="space-y-8 pb-12">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-4 border-indigo-50 dark:border-indigo-900/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-indigo-500/10 dark:bg-indigo-500/20 z-0" />
        <div className="relative z-10 shrink-0">
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-8 border-white dark:border-slate-800 shadow-2xl object-cover" 
              alt={user.name} 
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-8 border-white dark:border-slate-800 shadow-2xl bg-linear-to-br from-indigo-400 to-indigo-600 dark:from-indigo-500 dark:to-indigo-700 flex items-center justify-center text-white font-black text-5xl">
              {userInitials}
            </div>
          )}
          <button className="absolute -bottom-2 -right-2 bg-indigo-600 dark:bg-indigo-500 text-white p-3 rounded-2xl shadow-lg border-4 border-white dark:border-slate-800 bouncy-hover">
            <ICONS.Plus size={18} strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 text-center md:text-left z-10 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <h2 className="text-4xl font-black text-slate-800 dark:text-slate-200">{user?.name || 'User'}</h2>
            <Badge variant="indigo" className="capitalize">{user?.role || 'Student'}</Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-bold">{user?.email || 'No email available'}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
            <Button variant="primary" className="gap-2 px-8 shadow-indigo-100">
              <ICONS.Profile size={18} /> Edit Profile
            </Button>
            <Link href="/usage">
              <Button variant="outline" className="gap-2 px-8">
                <ICONS.Focus size={18} /> View AI Usage
              </Button>
            </Link>
            <Button variant="outline" className="gap-2 px-8">
              <ICONS.Share size={18} /> Share Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Achievements & Badges */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-6">Achievement Hall</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {[
                { name: 'Speed Demon', icon: '⚡', color: 'bg-yellow-100 dark:bg-yellow-900/30' },
                { name: 'Night Owl', icon: '🦉', color: 'bg-indigo-100 dark:bg-indigo-900/30' },
                { name: 'Helper Bee', icon: '🐝', color: 'bg-amber-100 dark:bg-amber-900/30' },
                { name: 'Math Wiz', icon: '🔢', color: 'bg-emerald-100 dark:bg-emerald-900/30' },
                { name: 'Steady Hands', icon: '✍️', color: 'bg-rose-100 dark:bg-rose-900/30' },
                { name: 'Deep Diver', icon: '🤿', color: 'bg-sky-100 dark:bg-sky-900/30' },
              ].map((badge, i) => (
                <div key={i} className="flex flex-col items-center gap-3 bouncy-hover cursor-pointer group">
                  <div className={`w-20 h-20 ${badge.color} rounded-[2rem] flex items-center justify-center text-4xl shadow-md border-b-4 border-slate-200 dark:border-slate-700 group-hover:border-indigo-400 dark:group-hover:border-indigo-600`}>
                    {badge.icon}
                  </div>
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase text-center">{badge.name}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-6">Experience Tracker</h3>
            <div className="space-y-6">
              <ProgressBar progress={75} color="bg-indigo-500" label="Mathematics Journey" />
              <ProgressBar progress={40} color="bg-emerald-500" label="Physics Lab" />
              <ProgressBar progress={92} color="bg-rose-500" label="Creative Writing" />
            </div>
          </Card>
        </div>

        {/* Account Settings */}
        <div className="space-y-8">
          <Card className="border-indigo-50 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-900/20">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Private Info</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest ml-1">Email</label>
                <Input value={user?.email || 'Not available'} disabled />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest ml-1">Joined Date</label>
                <Input value={joinedDate} disabled />
              </div>
              <div className="pt-4 space-y-3">
                <Button variant="secondary" className="w-full text-xs py-3">Change Password</Button>
                <Button variant="danger" className="w-full text-xs py-3">Delete Journey</Button>
              </div>
            </div>
          </Card>

          <Card className="bg-linear-to-br from-amber-400 dark:from-amber-500 to-amber-500 dark:to-amber-600 text-slate-900 dark:text-slate-200 border-none">
            <div className="flex items-center gap-3 mb-4">
              <ICONS.Trophy size={28} strokeWidth={3} />
              <h3 className="text-xl font-black">Membership</h3>
            </div>
            <p className="text-sm font-bold opacity-80 mb-6">You're on the <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg">PRO EXPLORER</span> plan. All features unlocked!</p>
            <Button variant="secondary" className="w-full text-amber-600 dark:text-amber-400">Manage Plan</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;

