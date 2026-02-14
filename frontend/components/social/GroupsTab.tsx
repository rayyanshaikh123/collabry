'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Copy, LogOut, Lock, ChevronDown, ChevronUp, Info } from 'lucide-react';
import groupService, { Group } from '@/lib/services/group.service';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import GroupChat from './GroupChat';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function GroupsTab() {
  const { user: authUser, accessToken } = useAuthStore();
  const currentUser = authUser ? { _id: (authUser as any)._id || (authUser as any).id, id: (authUser as any)._id || (authUser as any).id, name: authUser.name, email: authUser.email } : null;
  const token = accessToken;
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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
    loadGroups().finally(() => setIsLoading(false));
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
      setShowDetails(false);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to leave group', variant: 'destructive' });
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied', description: 'Invite code copied to clipboard' });
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* ── Left Sidebar: Group List ── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm rounded-lg text-xs font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>Create a group for your team or friends</DialogDescription>
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
                    rows={3}
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
                <Button onClick={handleCreateGroup} className="bg-indigo-500 hover:bg-indigo-600 text-white">Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
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
                <Button onClick={handleJoinGroup} className="bg-indigo-500 hover:bg-indigo-600 text-white">Join Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Groups List */}
        <div className="flex-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your Groups</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {groups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No groups yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Create or join one!</p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group._id}
                  onClick={() => {
                    setSelectedGroup(group);
                    setShowDetails(false);
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    selectedGroup?._id === group._id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={group.avatar} />
                    <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-sm font-semibold">
                      {group.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">{group.name}</p>
                      {group.isPrivate && <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Main Area: Chat + Details ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {(() => {
          if (isLoading) {
            return (
              <div className="flex-1 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
              </div>
            );
          }

          if (selectedGroup && currentUser && token) {
            return (
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Group Chat — fills available space */}
                <div className="flex-1 min-h-0">
                  <GroupChat
                    groupId={selectedGroup._id}
                    groupName={selectedGroup.name}
                    currentUserId={currentUser._id || currentUser.id || ''}
                    currentUserEmail={currentUser.email}
                    token={token}
                  />
                </div>

                {/* Collapsible Group Details */}
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-shrink-0">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Group Details</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {selectedGroup.members.length} members
                      </Badge>
                    </div>
                    {showDetails ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showDetails && (
                    <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 space-y-4 pt-3">
                      {/* Group Info */}
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={selectedGroup.avatar} />
                          <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-lg font-bold">
                            {selectedGroup.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200">{selectedGroup.name}</h4>
                          {selectedGroup.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{selectedGroup.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Invite Code */}
                      {selectedGroup.inviteCode && (
                        <div>
                          <Label className="text-xs text-slate-500">Invite Code</Label>
                          <div className="flex gap-2 mt-1">
                            <Input value={selectedGroup.inviteCode} readOnly className="text-xs h-8 font-mono" />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => copyInviteCode(selectedGroup.inviteCode!)}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Members List */}
                      <div>
                        <Label className="text-xs text-slate-500">Members</Label>
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                          {selectedGroup.members.map((member) => (
                            <div key={member.user._id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-7 h-7">
                                  <AvatarImage src={member.user.avatar} />
                                  <AvatarFallback className="text-xs">{member.user.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{member.user.name}</p>
                                  <p className="text-[10px] text-slate-400">{member.user.email}</p>
                                </div>
                              </div>
                              <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                {member.role}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Leave Group */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLeaveGroup(selectedGroup._id)}
                        className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-900/20 text-xs"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-1.5" />
                        Leave Group
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div className="flex-1 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <h3 className="text-base font-semibold text-slate-600 dark:text-slate-400 mb-1">No Group Selected</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Select a group to start chatting
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
