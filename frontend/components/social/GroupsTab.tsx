'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Settings, Copy, LogOut } from 'lucide-react';
import groupService, { Group } from '@/lib/services/group.service';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import GroupChat from './GroupChat';
import { useAuthStore } from '@/src/stores/auth.store';

export default function GroupsTab() {
  const { user: authUser, accessToken } = useAuthStore();
  const currentUser = authUser ? { _id: (authUser as any)._id || (authUser as any).id, id: (authUser as any)._id || (authUser as any).id, name: authUser.name, email: authUser.email } : null;
  const token = accessToken;
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    isPrivate: false,
  });
  const { toast } = useToast();

  const loadGroups = async () => {
    try {
      const data = await groupService.getUserGroups();
      setGroups(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load groups';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadGroups();
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast({ title: 'Error', description: 'Group name is required' });
      return;
    }

    try {
      await groupService.createGroup(newGroup);
      toast({ title: 'Success', description: 'Group created successfully' });
      setIsCreateOpen(false);
      setNewGroup({ name: '', description: '', isPrivate: false });
      loadGroups();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create group', variant: 'destructive' });
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      toast({ title: 'Error', description: 'Invite code is required' });
      return;
    }

    try {
      await groupService.joinWithCode(inviteCode);
      toast({ title: 'Success', description: 'Joined group successfully' });
      setIsJoinOpen(false);
      setInviteCode('');
      loadGroups();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to join group', variant: 'destructive' });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      await groupService.leaveGroup(groupId);
      toast({ title: 'Success', description: 'Left group successfully' });
      loadGroups();
      setSelectedGroup(null);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to leave group', variant: 'destructive' });
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied', description: 'Invite code copied to clipboard' });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 bg-transparent items-start">
      <div className="md:w-80 flex-shrink-0 space-y-4">
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 bg-emerald-400 hover:bg-emerald-500 text-white shadow-md rounded-md">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>Create a private group for your team or friends</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Group Name</Label>
                  <Input
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    placeholder="What's this group about?"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Private Group</Label>
                  <Switch
                    checked={newGroup.isPrivate}
                    onCheckedChange={(checked) => setNewGroup({ ...newGroup, isPrivate: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateGroup} className="bg-emerald-400 hover:bg-emerald-500 text-white">Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
            <DialogTrigger asChild>
                <Button className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-900/20 border border-emerald-200/40 rounded-md">
                Join Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Group</DialogTitle>
                <DialogDescription>Enter an invite code to join a group</DialogDescription>
              </DialogHeader>
              <div>
                <Label>Invite Code</Label>
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleJoinGroup} className="bg-emerald-400 hover:bg-emerald-500 text-white">Join Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="rounded-2xl bg-transparent border-2 border-slate-200/30 dark:border-slate-700/30 shadow-lg">
          <CardHeader>
            <CardTitle>Your Groups</CardTitle>
            <CardDescription>{groups.length} groups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center py-4">
                No groups yet. Create or join one!
              </p>
            ) : (
              groups.map((group) => (
                  <div
                  key={group._id}
                  onClick={() => {
                    console.log('🎯 [GroupsTab] Group selected:', group.name, group._id);
                    console.log('📊 [GroupsTab] Current state:', { 
                      isLoading, 
                      hasCurrentUser: !!currentUser, 
                      hasToken: !!token,
                      currentUser 
                    });
                    setSelectedGroup(group);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedGroup?._id === group._id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={group.avatar} />
                      <AvatarFallback>{group.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.members.length} members
                      </p>
                    </div>
                    {group.isPrivate && <Badge variant="secondary">Private</Badge>}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1">
        {(() => {
          console.log('🔍 [GroupsTab] Render check:', { 
            isLoading, 
            hasSelectedGroup: !!selectedGroup,
            selectedGroupId: selectedGroup?._id,
            hasCurrentUser: !!currentUser,
            currentUserId: currentUser?._id || currentUser?.id,
            hasToken: !!token 
          });
          
          if (isLoading) {
            return (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
            );
          }
          
          if (selectedGroup && currentUser && token) {
            console.log('✅ [GroupsTab] Rendering GroupChat');
            console.log('🔍 [GroupsTab] Passing currentUserId:', currentUser._id || currentUser.id || '');
            console.log('🔍 [GroupsTab] currentUser object:', currentUser);
              return (
              <div className="space-y-4">
                {/* Group Chat */}
                <GroupChat
                  groupId={selectedGroup._id}
                  groupName={selectedGroup.name}
                  currentUserId={currentUser._id || currentUser.id || ''}
                  currentUserEmail={currentUser.email}
                  token={token}
                />

                {/* Group Details */}
                <Card className="rounded-2xl bg-transparent border-2 border-slate-200/30 dark:border-slate-700/30 shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={selectedGroup.avatar} />
                      <AvatarFallback className="text-2xl">{selectedGroup.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{selectedGroup.name}</CardTitle>
                      <CardDescription>{selectedGroup.description}</CardDescription>
                      <div className="flex gap-2 mt-2">
                        {selectedGroup.isPrivate && <Badge>Private</Badge>}
                        <Badge variant="secondary">{selectedGroup.members.length} members</Badge>
                      </div>
                    </div>
                  </div>
                  <Button className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 bg-transparent">
                {selectedGroup.inviteCode && (
                  <div>
                    <Label>Invite Code</Label>
                    <div className="flex gap-2 mt-2">
                      <Input value={selectedGroup.inviteCode} readOnly />
                      <Button
                        size="icon"
                        className="border-emerald-200/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        onClick={() => copyInviteCode(selectedGroup.inviteCode!)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-base">Members</Label>
                    <div className="mt-3 space-y-2">
                    {selectedGroup.members.map((member) => (
                      <div key={member.user._id} className="flex items-center justify-between p-3 border rounded-lg bg-transparent">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.user.avatar} />
                            <AvatarFallback>{member.user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.user.name}</p>
                            <p className="text-sm text-muted-foreground">{member.user.email}</p>
                          </div>
                        </div>
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleLeaveGroup(selectedGroup._id)}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave Group
                </Button>
              </CardContent>
            </Card>
              </div>
            );
          }
          
          console.log('ℹ️ [GroupsTab] Showing "No Group Selected" message');
          return (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Group Selected</h3>
                <p className="text-muted-foreground">
                  Select a group from the list to view details and members
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
