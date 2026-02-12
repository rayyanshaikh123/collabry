'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Check, X, Trash2 } from 'lucide-react';
import friendService, { Friendship, FriendRequest, User } from '@/lib/services/friend.service';
import { useToast } from '@/hooks/use-toast';

export default function FriendsTab() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  const loadFriends = async () => {
    try {
      const data = await friendService.getFriends();
      setFriends(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const loadRequests = async () => {
    try {
      const [pending, sent] = await Promise.all([
        friendService.getPendingRequests(),
        friendService.getSentRequests(),
      ]);
      setPendingRequests(pending);
      setSentRequests(sent);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      toast({ title: 'Error', description: 'Search query must be at least 2 characters' });
      return;
    }

    setLoading(true);
    try {
      const results = await friendService.searchUsers(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        toast({ title: 'No results', description: 'No users found matching your search' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await friendService.sendRequest(userId);
      toast({ title: 'Success', description: 'Friend request sent' });
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      loadRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friendService.acceptRequest(requestId);
      toast({ title: 'Success', description: 'Friend request accepted' });
      loadFriends();
      loadRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendService.rejectRequest(requestId);
      toast({ title: 'Success', description: 'Friend request rejected' });
      loadRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;

    try {
      await friendService.removeFriend(friendshipId);
      toast({ title: 'Success', description: 'Friend removed' });
      loadFriends();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Find Friends</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Search by name or email</p>
        <div className="flex gap-2">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-9 text-sm"
          />
          <Button size="sm" onClick={handleSearch} disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4">
            <Search className="w-4 h-4 mr-1.5" />
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleSendRequest(user.id)}>
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Friends / Requests Tabs */}
      <Tabs defaultValue="friends">
        <TabsList className="bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 p-1 mb-4 w-auto inline-flex">
          <TabsTrigger value="friends" className="text-xs font-semibold text-slate-600 dark:text-slate-300 data-[state=active]:bg-indigo-500 data-[state=active]:text-white rounded-md px-3 py-1.5">
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs font-semibold text-slate-600 dark:text-slate-300 data-[state=active]:bg-indigo-500 data-[state=active]:text-white rounded-md px-3 py-1.5">
            Requests {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-xs font-semibold text-slate-600 dark:text-slate-300 data-[state=active]:bg-indigo-500 data-[state=active]:text-white rounded-md px-3 py-1.5">
            Sent ({sentRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Friends List */}
        <TabsContent value="friends" className="space-y-2">
          {friends.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center">
              <UserPlus className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No friends yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Search and add some friends!</p>
            </div>
          ) : (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
              {friends.map((friendship) => (
                <div key={friendship._id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors first:rounded-t-xl last:rounded-b-xl">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={friendship.user.avatar} />
                      <AvatarFallback className="text-sm">{friendship.user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{friendship.user.name}</p>
                      <p className="text-xs text-slate-400">{friendship.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 hidden sm:inline">Since {new Date(friendship.since).toLocaleDateString()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => handleRemoveFriend(friendship._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Requests */}
        <TabsContent value="pending" className="space-y-2">
          {pendingRequests.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No pending requests</p>
            </div>
          ) : (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
              {pendingRequests.map((request) => (
                <div key={request._id} className="flex items-center justify-between p-3 first:rounded-t-xl last:rounded-b-xl">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={request.from.avatar} />
                      <AvatarFallback className="text-sm">{request.from.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{request.from.name}</p>
                      <p className="text-xs text-slate-400">{request.from.email}</p>
                      {request.message && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">"{request.message}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 text-xs bg-indigo-500 hover:bg-indigo-600 text-white" onClick={() => handleAcceptRequest(request._id)}>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRejectRequest(request._id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sent Requests */}
        <TabsContent value="sent" className="space-y-2">
          {sentRequests.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No sent requests</p>
            </div>
          ) : (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
              {sentRequests.map((request) => (
                <div key={request._id} className="flex items-center justify-between p-3 first:rounded-t-xl last:rounded-b-xl">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={request.to.avatar} />
                      <AvatarFallback className="text-sm">{request.to.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{request.to.name}</p>
                      <p className="text-xs text-slate-400">{request.to.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
