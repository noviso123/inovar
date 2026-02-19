import React, { useEffect, useState } from 'react';
import { wsService } from '@/shared/services/websocketService';
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  severity: 'success' | 'warning' | 'info' | 'error';
}

export const GlobalNotifications: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (title: string, message: string, severity: Toast['severity'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, severity }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    // Listen to standard events
    const unsubCreated = wsService.on('request:created', (data) => {
      addToast('Novo Chamado', `Chamado #${data.numero} foi aberto por ${data.clientName}`, 'info');
    });

    const unsubUpdated = wsService.on('request:updated', (data) => {
      addToast('Chamado Atualizado', `Chamado #${data.numero} foi alterado para ${data.status}`, 'success');
    });

    const unsubBudget = wsService.on('budget:approved', (data) => {
      addToast('Orçamento Aprovado', `O orçamento do chamado #${data.numero} foi aprovado.`, 'success');
    });

    const unsubNotification = wsService.on('notification:new', (data) => {
      addToast(data.title, data.message, data.type === 'ERROR' ? 'error' : data.type === 'WARNING' ? 'warning' : data.type === 'SUCCESS' ? 'success' : 'info');
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubBudget();
      unsubNotification();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-8 z-[100] space-y-4 pointer-events-none w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-4 rounded-[2rem] border shadow-2xl animate-in slide-in-from-right duration-500 bg-white/95 backdrop-blur-xl flex gap-4 ${
            toast.severity === 'success' ? 'border-emerald-100' :
            toast.severity === 'warning' ? 'border-amber-100' :
            toast.severity === 'error' ? 'border-rose-100' : 'border-blue-100'
          }`}
        >
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            toast.severity === 'success' ? 'bg-emerald-50 text-emerald-500' :
            toast.severity === 'warning' ? 'bg-amber-50 text-amber-500' :
            toast.severity === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
          }`}>
            {toast.severity === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.severity === 'warning' && <AlertCircle className="w-5 h-5" />}
            {toast.severity === 'error' && <X className="w-5 h-5" />}
            {toast.severity === 'info' && <Info className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{toast.title}</h4>
            <p className="text-[10px] text-slate-500 font-medium leading-tight mt-1">{toast.message}</p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-300 hover:text-slate-500 transition-colors self-start"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
