import React, { useState } from 'react';
import { Card, Button, Badge, Input } from '../UIElements';
import { ICONS } from '../../constants';
import type { User } from '@/types/user.types';

interface UserManagementProps {
  users: User[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number | ((p: number) => number)) => void;
  handleCreateUser: () => void;
  handleEditUser: (user: User) => void;
  handleToggleStatus: (user: User) => void;
  handleDeleteUser: (user: User) => void;
  handleViewUser?: (user: User) => void;
  handleBulkEnable?: (userIds: string[]) => void;
  handleBulkDisable?: (userIds: string[]) => void;
  handleBulkDelete?: (userIds: string[]) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  loading,
  searchTerm,
  setSearchTerm,
  currentPage,
  totalPages,
  setCurrentPage,
  handleCreateUser,
  handleEditUser,
  handleToggleStatus,
  handleDeleteUser,
  handleViewUser,
  handleBulkEnable,
  handleBulkDisable,
  handleBulkDelete,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const hasBulk = !!(handleBulkEnable || handleBulkDisable || handleBulkDelete);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const selectedArr = Array.from(selectedIds);

  return (
    <Card noPadding className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">User Directory</h3>
        <div className="flex gap-2">
          <Input 
            placeholder="Search users..." 
            className="w-64" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="primary" onClick={handleCreateUser}>
            <ICONS.Plus size={18} className="mr-2" /> Add User
          </Button>
        </div>
      </div>
      
      {/* Bulk action bar */}
      {hasBulk && selectedIds.size > 0 && (
        <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-950/40 border-b-2 border-indigo-100 dark:border-indigo-900 flex items-center gap-3">
          <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            {handleBulkEnable && (
              <Button variant="outline" size="sm" onClick={() => { handleBulkEnable(selectedArr); setSelectedIds(new Set()); }}>
                <ICONS.CheckCircle size={14} className="mr-1" /> Enable
              </Button>
            )}
            {handleBulkDisable && (
              <Button variant="outline" size="sm" onClick={() => { handleBulkDisable(selectedArr); setSelectedIds(new Set()); }}>
                <ICONS.AlertCircle size={14} className="mr-1" /> Disable
              </Button>
            )}
            {handleBulkDelete && (
              <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => { handleBulkDelete(selectedArr); setSelectedIds(new Set()); }}>
                <ICONS.Trash size={14} className="mr-1" /> Delete
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black dark:text-slate-200 text-slate-400 uppercase tracking-widest">
            <tr>
              {hasBulk && (
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedIds.size === users.length}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-50 font-bold">
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={hasBulk ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={hasBulk ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                const joinDate = new Date(user.createdAt).toLocaleDateString();
                
                return (
                  <tr key={user.id} className={`hover:bg-slate-50/50 ${selectedIds.has(user.id) ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}>
                    {hasBulk && (
                      <td className="px-4 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover" alt={user.name} />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                            {userInitials}
                          </div>
                        )}
                        <div className="leading-tight">
                          <p className="text-sm text-slate-800 dark:text-slate-200">{user.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-tight">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'admin' ? 'indigo' : user.role === 'mentor' ? 'amber' : 'slate'} className="capitalize">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className="cursor-pointer"
                      >
                        <Badge variant={user.isActive ? 'emerald' : 'rose'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{joinDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {handleViewUser && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewUser(user)}
                            title="View details"
                            className="text-indigo-500 hover:text-indigo-600"
                          >
                            <ICONS.Search size={16} />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditUser(user)}
                          title="Edit user"
                        >
                          <ICONS.Profile size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteUser(user)}
                          title="Delete user"
                          className="text-rose-500 hover:text-rose-600"
                        >
                          <ICONS.Trash size={18} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t-2 border-slate-50 flex items-center justify-between">
          <p className="text-sm text-slate-500 font-bold">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default UserManagement;
