import api from '@/lib/api';

export interface RecycleBinItem {
    _id: string;
    type: 'notebook' | 'board';
    title: string;
    description?: string;
    deletedAt: string;
    createdAt: string;
    updatedAt: string;
    // Notebook-specific
    sourceCount?: number;
    artifactCount?: number;
    // Board-specific
    memberCount?: number;
    isPublic?: boolean;
}

export interface RecycleBinResponse {
    success: boolean;
    count: number;
    data: RecycleBinItem[];
}

class RecycleBinService {
    async getTrashItems(): Promise<RecycleBinItem[]> {
        const response: any = await api.get('/recycle-bin');
        return response.data;
    }

    async restoreItem(type: 'notebook' | 'board', id: string) {
        const response = await api.patch(`/recycle-bin/${type}/${id}/restore`);
        return response.data;
    }

    async permanentlyDeleteItem(type: 'notebook' | 'board', id: string) {
        const response = await api.delete(`/recycle-bin/${type}/${id}`);
        return response.data;
    }

    async emptyRecycleBin() {
        const response = await api.delete('/recycle-bin/empty');
        return response.data;
    }
}

export default new RecycleBinService();
