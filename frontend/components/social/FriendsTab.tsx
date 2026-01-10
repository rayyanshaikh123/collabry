'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Check, X, Trash2, Ban } from 'lucide-react';
import friendService, { Friendship, FriendRequest, User } from '@/src/services/friend.service';
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
      toast({ title: 'Success', description: `Found ${results.length} users` });
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find Friends</CardTitle>
          <CardDescription>Search for users to add as friends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleSendRequest(user.id)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sentRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-2">
          {friends.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No friends yet. Search and add some friends!
              </CardContent>
            </Card>
          ) : (
            friends.map((friendship) => (
              <Card key={friendship._id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={friendship.user.avatar} />
                      <AvatarFallback>{friendship.user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{friendship.user.name}</p>
                      <p className="text-sm text-muted-foreground">{friendship.user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Friends since {new Date(friendship.since).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFriend(friendship._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-2">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No pending requests
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request._id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.from.avatar} />
                      <AvatarFallback>{request.from.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.from.name}</p>
                      <p className="text-sm text-muted-foreground">{request.from.email}</p>
                      {request.message && (
                        <p className="text-sm mt-1">{request.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAcceptRequest(request._id)}>
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(request._id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-2">
          {sentRequests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No sent requests
              </CardContent>
            </Card>
          ) : (
            sentRequests.map((request) => (
              <Card key={request._id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.to.avatar} />
                      <AvatarFallback>{request.to.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.to.name}</p>
                      <p className="text-sm text-muted-foreground">{request.to.email}</p>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
