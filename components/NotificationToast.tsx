
import React, { useEffect, useState } from 'react';
import { wsService } from '../services/websocketService';


interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  requestId?: string;
}

interface NotificationToastProps {
  onSelect?: (requestId: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ onSelect }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (title: string, message: string, severity: 'info' | 'warning' | 'success', requestId?: string) => {
    console.log('🔔 Notification triggered:', { title, message, severity, requestId });
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [{ id, title, message, severity, requestId }, ...prev]);
    setTimeout(() => removeNotification(id), 8000);
  };

  useEffect(() => {
    // Integração com o Hub Real-time
    // Listen for real-time events
    const unsubCreate = wsService.on('request:created', (data: any) => {
      console.log('🔔 WS Event: request:created', data);
      addNotification('Nova Solicitação', `Cliente ${data.clientName} abriu um novo chamado.`, 'warning', data.id);
    });

    const unsubStatus = wsService.on('request:status_changed', (data: any) => {
      console.log('🔔 WS Event: request:status_changed', data);
      addNotification('Status Atualizado', `A OS agora está ${data.newStatus}.`, 'info', data.id);
    });

    const unsubAssign = wsService.on('request:assigned', (data: any) => {
      console.log('🔔 WS Event: request:assigned', data);
      addNotification('Técnico Atribuído', `Chamado atribuído a ${data.responsibleName}.`, 'info', data.id);
    });

    return () => {
      unsubCreate();
      unsubStatus();
      unsubAssign();
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-8 right-8 z-[200] space-y-4 w-full max-w-sm pointer-events-none">
      {notifications.map(n => (
        <div
            key={n.id}
            onClick={() => {
                if (n.requestId && onSelect) {
                    onSelect(n.requestId);
                    removeNotification(n.id);
                }
            }}
            className={`pointer-events-auto bg-slate-900/95 backdrop-blur-xl text-white rounded-[2.5rem] shadow-2xl border border-white/10 p-7 flex gap-6 animate-in slide-in-from-right duration-500 overflow-hidden relative group ${n.requestId ? 'cursor-pointer hover:bg-slate-800 transition-colors' : ''}`}
        >
          <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full opacity-20 ${
            n.severity === 'warning' ? 'bg-rose-500' : n.severity === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
          }`}></div>

          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
            n.severity === 'warning' ? 'bg-rose-500/20 text-rose-400' :
            n.severity === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
          }`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>

          <div className="flex-1 relative z-10 text-left">
            <h5 className="font-black text-xs uppercase tracking-[0.2em] mb-1.5 opacity-60">{n.title}</h5>
            <p className="text-sm text-slate-200 font-bold leading-tight mb-4 tracking-tight">{n.message}</p>
            <div className="flex items-center justify-between">
                <button
                    onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                    className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-all bg-white/5 px-4 py-2 rounded-lg"
                >
                Dispensar
                </button>
                {n.requestId && <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">Abrir ↗</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
