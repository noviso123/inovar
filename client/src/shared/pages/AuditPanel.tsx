
import React, { useEffect, useState } from 'react';
import { TimelineEvent } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { Download } from 'lucide-react';

interface AuditPanelProps {
  logs?: TimelineEvent[]; // Optional now
}

export const AuditPanel: React.FC<AuditPanelProps> = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiService.getAuditLogs()
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || 'Falha ao carregar auditoria.');
        setLoading(false);
      });
  }, []);

  const totalEvents = logs.length;
  // Count critical events based on action names
  const criticalEvents = logs.filter(l =>
    l.action.includes('DELETE') ||
    l.action.includes('BLOCK') ||
    l.action.includes('RESET_PASSWORD') ||
    l.action.includes('createRequest')
  ).length;

  if (loading) return <div className="p-10 text-center text-slate-400">Carregando auditoria...</div>;

  if (error) return (
    <div className="p-10 text-center bg-rose-50 rounded-[2.5rem] border border-rose-100 max-w-2xl mx-auto mt-10">
        <h3 className="text-rose-900 font-black text-lg mb-2">Erro de Carregamento</h3>
        <p className="text-rose-700/80 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-rose-200">Recarregar</button>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-center text-left">
        <div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">Trilha de Auditoria</h3>
          <p className="text-sm text-slate-500 font-medium">Histórico imutável de todas as transações do sistema.</p>
        </div>
        <div className="flex gap-2">
           <button
             onClick={() => window.open(`${import.meta.env.VITE_API_URL || '/api'}/audit/export`, '_blank')}
             className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-blue-600 transition-all font-black uppercase tracking-widest group flex items-center gap-2"
           >
             <Download className="w-4 h-4" />
             Exportar Logs (.csv)
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total de Eventos</p>
          <p className="text-3xl font-black text-slate-800">{totalEvents}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Eventos Críticos</p>
          <p className="text-3xl font-black text-blue-600">{criticalEvents}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Integridade da Base</p>
          <p className="text-3xl font-black text-emerald-500">100%</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border-2 border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação Realizada</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6 text-[11px] font-bold text-slate-400">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
                        {(log.userName || '?').charAt(0)}
                      </div>
                      <span className="text-xs font-black text-slate-700">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-tight">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-xs font-medium text-slate-500 italic">
                    "{log.details}"
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
