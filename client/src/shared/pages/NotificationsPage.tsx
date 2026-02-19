import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Notification } from '@/shared/types';
import { notificationService } from '@/shared/services/notificationService';

interface NotificationsPageProps {
    currentUser: User;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationService.getAll();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="animate-in fade-in duration-500 pb-8">
            <div className="flex items-center gap-4 mb-4 -mt-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1">
                    <h2 className="text-xl font-black text-slate-800">Notificações</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Central de Avisos
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg"
                    >
                        Marcar todas como lidas
                    </button>
                )}
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 min-h-[50vh]">
                {loading ? (
                    <div className="text-center py-12 text-slate-400">Carregando...</div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <p className="text-slate-400 font-medium">Nenhuma notificação nova</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                    notif.read
                                        ? 'bg-white border-slate-100 opacity-75'
                                        : 'bg-blue-50 border-blue-100 hover:shadow-md'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        {!notif.read && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        )}
                                        <h4 className={`font-bold ${notif.read ? 'text-slate-700' : 'text-blue-800'}`}>
                                            {notif.title}
                                        </h4>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap ml-2">
                                        {new Date(notif.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 ml-4">{notif.message}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
