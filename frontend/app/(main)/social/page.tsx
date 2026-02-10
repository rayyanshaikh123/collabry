'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UsersRound, MessageCircle } from 'lucide-react';
import FriendsTab from '@/components/social/FriendsTab';
import GroupsTab from '@/components/social/GroupsTab';
import ChatTab from '@/components/social/ChatTab';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState('friends');
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <p className="text-lg text-slate-600 dark:text-slate-400 font-semibold">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start py-10 px-4 md:px-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="w-full max-w-3xl mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-black font-display bg-gradient-to-r from-indigo-500 via-purple-400 to-emerald-500 bg-clip-text text-transparent mb-2 drop-shadow-lg">
          Social Hub
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-300 font-medium">
          Connect with friends, join groups, and chat in real-time
        </p>
      </div>

      <div className="w-full max-w-3xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/80 dark:bg-slate-800/80 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-inner backdrop-blur-md">
            <TabsTrigger value="friends" className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:dark:bg-indigo-600 rounded-xl transition-all">
              <Users className="w-4 h-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:dark:bg-indigo-600 rounded-xl transition-all">
              <UsersRound className="w-4 h-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:dark:bg-indigo-600 rounded-xl transition-all">
              <MessageCircle className="w-4 h-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            <div className="rounded-2xl bg-white/90 dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6 mb-6">
              <FriendsTab />
            </div>
          </TabsContent>

          <TabsContent value="groups">
            <div className="rounded-2xl bg-white/90 dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6 mb-6">
              <GroupsTab />
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <div className="rounded-2xl bg-white/90 dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6 mb-6">
              <ChatTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

