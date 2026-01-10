'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UsersRound, Globe, MessageCircle } from 'lucide-react';
import FriendsTab from '@/components/social/FriendsTab';
import GroupsTab from '@/components/social/GroupsTab';
import CommunitiesTab from '@/components/social/CommunitiesTab';
import ChatTab from '@/components/social/ChatTab';
import { useAuthStore } from '@/src/stores/auth.store';

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
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Social Hub
        </h1>
        <p className="text-muted-foreground">
          Connect with friends, join groups, explore communities, and chat in real-time
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Friends
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <UsersRound className="w-4 h-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="communities" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Communities
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
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

        <TabsContent value="communities">
          <CommunitiesTab />
        </TabsContent>

        <TabsContent value="chat">
          <ChatTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
