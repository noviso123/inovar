import { apiService as api } from './apiService';
import { Notification } from '@/shared/types';

export const notificationService = {
    getAll: async (): Promise<Notification[]> => {
        const response = await api.get('/notifications');
        return response.data.data;
    },

    markAsRead: async (id: string): Promise<void> => {
        await api.patch(`/notifications/${id}/read`);
    },

    markAllAsRead: async (): Promise<void> => {
        await api.patch('/notifications/read-all');
    }
};
