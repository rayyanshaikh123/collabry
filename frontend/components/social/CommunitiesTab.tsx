'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Globe, Search, Users, LogOut } from 'lucide-react';
import communityService, { Community } from '@/src/services/community.service';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  'education', 'technology', 'science', 'arts', 'health', 
  'business', 'entertainment', 'sports', 'other'
];

export default function CommunitiesTab() {
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    category: 'education' as any,
    tags: '',
    isPrivate: false,
  });
  const { toast } = useToast();

  const loadMyCommunities = async () => {
    try {
      const data = await communityService.getUserCommunities();
      setMyCommunities(data);
    } catch (error: unknown) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const loadAllCommunities = async () => {
    try {
      const data = await communityService.getCommunities({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
      });
      setAllCommunities(data);
    } catch (error: unknown) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadMyCommunities();
    loadAllCommunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCommunity = async () => {
    if (!newCommunity.name.trim()) {
      toast({ title: 'Error', description: 'Community name is required' });
      return;
    }

    try {
      const tags = newCommunity.tags.split(',').map((t) => t.trim()).filter(Boolean);
      await communityService.createCommunity({ ...newCommunity, tags });
      toast({ title: 'Success', description: 'Community created successfully' });
      setIsCreateOpen(false);
      setNewCommunity({ name: '', description: '', category: 'education', tags: '', isPrivate: false });
      loadMyCommunities();
      loadAllCommunities();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      await communityService.joinCommunity(communityId);
      toast({ title: 'Success', description: 'Joined community successfully' });
      loadMyCommunities();
      loadAllCommunities();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    if (!confirm('Are you sure you want to leave this community?')) return;

    try {
      await communityService.leaveCommunity(communityId);
      toast({ title: 'Success', description: 'Left community successfully' });
      loadMyCommunities();
      setSelectedCommunity(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isMember = (communityId: string) => {
    return myCommunities.some((c) => c._id === communityId);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Community
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Community</DialogTitle>
              <DialogDescription>Create a community for people with shared interests</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Community Name</Label>
                <Input
                  value={newCommunity.name}
                  onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                  placeholder="Enter community name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newCommunity.description}
                  onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                  placeholder="What's this community about?"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={newCommunity.category}
                    onValueChange={(value) => setNewCommunity({ ...newCommunity, category: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={newCommunity.tags}
                    onChange={(e) => setNewCommunity({ ...newCommunity, tags: e.target.value })}
                    placeholder="e.g., coding, ai, webdev"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateCommunity}>Create Community</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allCommunities.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Communities Found</h3>
              <p className="text-muted-foreground">Be the first to create a community!</p>
            </CardContent>
          </Card>
        ) : (
          allCommunities.map((community) => (
            <Card key={community._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={community.avatar} />
                    <AvatarFallback>{community.name[0]}</AvatarFallback>
                  </Avatar>
                  <Badge>{community.category}</Badge>
                </div>
                <CardTitle className="mt-3">{community.name}</CardTitle>
                <CardDescription className="line-clamp-2">{community.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {community.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {community.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {community.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{community.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{community.stats.memberCount} members</span>
                    </div>
                  </div>

                  {isMember(community._id) ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedCommunity(community)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLeaveCommunity(community._id)}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleJoinCommunity(community._id)}
                    >
                      Join Community
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
