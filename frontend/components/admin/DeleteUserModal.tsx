import React from 'react';
import { Card, Button } from '../UIElements';
import type { User } from '@/types/user.types';

interface DeleteUserModalProps {
  showDeleteConfirm: boolean;
  userToDelete: User | null;
  loading: boolean;
  confirmDeleteUser: () => void;
  cancelDeleteUser: () => void;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  showDeleteConfirm,
  userToDelete,
  loading,
  confirmDeleteUser,
  cancelDeleteUser,
}) => {
  if (!showDeleteConfirm || !userToDelete) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-4">Delete User</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Are you sure you want to permanently delete{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">{userToDelete.name}</span>? 
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={cancelDeleteUser} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={confirmDeleteUser} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete User'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DeleteUserModal;
