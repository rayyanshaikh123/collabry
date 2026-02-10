import React from 'react';
import { Card, Button, Input } from '../UIElements';
import type { User } from '@/types/user.types';
import type { UserFormData } from '@/lib/services/admin.service';

interface UserFormModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  editingUser: User | null;
  formData: UserFormData;
  setFormData: (data: UserFormData) => void;
  loading: boolean;
  handleSubmit: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  showModal,
  setShowModal,
  editingUser,
  formData,
  setFormData,
  loading,
  handleSubmit,
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-6">
          {editingUser ? 'Edit User' : 'Create New User'}
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full Name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
            <Input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@company.com"
            />
          </div>

          {!editingUser && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
              <Input 
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Role</label>
            <select 
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-400"
            >
              <option value="student">Student</option>
              <option value="mentor">Mentor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <input 
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
            />
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Account Active</label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setShowModal(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default UserFormModal;
