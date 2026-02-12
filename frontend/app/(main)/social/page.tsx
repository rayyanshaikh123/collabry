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
      <div className="flex items-center justify-center h-[60vh] bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-5">
      {/* Compact Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Social Hub</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Connect with friends, join groups, and chat in real-time</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-1">
          <TabsTrigger value="friends" className="flex items-center gap-2 font-semibold text-sm text-slate-600 dark:text-slate-300 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:dark:bg-indigo-600 rounded-lg transition-all">
            <Users className="w-4 h-4" />
            Friends
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2 font-semibold text-sm text-slate-600 dark:text-slate-300 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:dark:bg-indigo-600 rounded-lg transition-all">
            <UsersRound className="w-4 h-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2 font-semibold text-sm text-slate-600 dark:text-slate-300 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:dark:bg-indigo-600 rounded-lg transition-all">
            <MessageCircle className="w-4 h-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <FriendsTab />
        </TabsContent>

        <TabsContent value="groups">
          <GroupsTab />
        </TabsContent>

        <TabsContent value="chat">
          <ChatTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

