'use client';


import React from 'react';
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
      <div className="flex flex-col md:flex-row items-center gap-8 bg-white p-8 rounded-[3rem] border-4 border-indigo-50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-indigo-500/10 -z-0" />
        <div className="relative z-10 shrink-0">
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-8 border-white shadow-2xl object-cover" 
              alt={user.name} 
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-8 border-white shadow-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black text-5xl">
              {userInitials}
            </div>
          )}
          <button className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-3 rounded-2xl shadow-lg border-4 border-white bouncy-hover">
            <ICONS.Plus size={18} strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 text-center md:text-left z-10 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <h2 className="text-4xl font-black text-slate-800">{user?.name || 'User'}</h2>
            <Badge variant="indigo" className="capitalize">{user?.role || 'Student'}</Badge>
          </div>
          <p className="text-slate-500 font-bold">{user?.email || 'No email available'}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
            <Button variant="primary" className="gap-2 px-8 shadow-indigo-100">
              <ICONS.Profile size={18} /> Edit Profile
            </Button>
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
            <h3 className="text-2xl font-black text-slate-800 mb-6">Achievement Hall</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {[
                { name: 'Speed Demon', icon: '⚡', color: 'bg-yellow-100' },
                { name: 'Night Owl', icon: '🦉', color: 'bg-indigo-100' },
                { name: 'Helper Bee', icon: '🐝', color: 'bg-amber-100' },
                { name: 'Math Wiz', icon: '🔢', color: 'bg-emerald-100' },
                { name: 'Steady Hands', icon: '✍️', color: 'bg-rose-100' },
                { name: 'Deep Diver', icon: '🤿', color: 'bg-sky-100' },
              ].map((badge, i) => (
                <div key={i} className="flex flex-col items-center gap-3 bouncy-hover cursor-pointer group">
                  <div className={`w-20 h-20 ${badge.color} rounded-[2rem] flex items-center justify-center text-4xl shadow-md border-b-4 border-slate-200 group-hover:border-indigo-400`}>
                    {badge.icon}
                  </div>
                  <span className="text-[11px] font-black text-slate-500 uppercase text-center">{badge.name}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-2xl font-black text-slate-800 mb-6">Experience Tracker</h3>
            <div className="space-y-6">
              <ProgressBar progress={75} color="bg-indigo-500" label="Mathematics Journey" />
              <ProgressBar progress={40} color="bg-emerald-500" label="Physics Lab" />
              <ProgressBar progress={92} color="bg-rose-500" label="Creative Writing" />
            </div>
          </Card>
        </div>

        {/* Account Settings */}
        <div className="space-y-8">
          <Card className="border-indigo-50 bg-indigo-50/20">
            <h3 className="text-xl font-black text-slate-800 mb-6">Private Info</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Email</label>
                <Input value={user?.email || 'Not available'} disabled />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Joined Date</label>
                <Input value={joinedDate} disabled />
              </div>
              <div className="pt-4 space-y-3">
                <Button variant="secondary" className="w-full text-xs py-3">Change Password</Button>
                <Button variant="danger" className="w-full text-xs py-3">Delete Journey</Button>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 border-none">
            <div className="flex items-center gap-3 mb-4">
              <ICONS.Trophy size={28} strokeWidth={3} />
              <h3 className="text-xl font-black">Membership</h3>
            </div>
            <p className="text-sm font-bold opacity-80 mb-6">You're on the <span className="bg-white px-2 py-0.5 rounded-lg">PRO EXPLORER</span> plan. All features unlocked!</p>
            <Button variant="secondary" className="w-full text-amber-600">Manage Plan</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;

