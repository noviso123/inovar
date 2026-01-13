import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

interface FinanceSummary {
  totalRevenue: number;
  netProfit: number;
  pendingRevenue: number;
  expenses: number;
  transactions: any[];
}

export const Finance: React.FC = () => {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFinance();
  }, []);

  const loadFinance = async () => {
    try {
      const data = await apiService.getFinanceSummary();
      setSummary(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  };

  const taxes = summary ? summary.totalRevenue * 0.165 : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest">Calculando métricas...</p>
    </div>
  );

  if (error) return (
    <div className="p-10 text-center bg-rose-50 rounded-[2.5rem] border border-rose-100 max-w-2xl mx-auto mt-10">
        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-rose-900 font-black text-lg mb-2">Erro de Acesso</h3>
        <p className="text-rose-700/80 mb-6 font-medium">{error}</p>
        <button onClick={loadFinance} className="px-6 py-3 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all">Tentar Novamente</button>
    </div>
  );

  if (!summary) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-left -mx-4">
      {/* Header */}
      <div className="flex justify-between items-center px-4">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Faturamento</h3>
          <div className="flex gap-4">
              <button className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></button>
              <button className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
          </div>
      </div>

       {/* Top Cards Row */}
       <div className="grid grid-cols-2 gap-4 px-4">
           <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col justify-center items-center text-center">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Total pago</p>
               <p className="text-2xl font-black text-slate-800 tracking-tighter">R$ {summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
               <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">pela FindUP</p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col justify-center items-center text-center">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Total pendente</p>
               <p className="text-2xl font-black text-slate-800 tracking-tighter">R$ {summary.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
               <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">Aguardando validação</p>
           </div>
       </div>

      {/* Transaction List */}
      <div className="space-y-4 px-4">
          {summary.transactions.length === 0 ? (
            <div className="py-24 text-center text-slate-300 font-black uppercase text-xs">Aguardando movimentação</div>
          ) : (
            summary.transactions.map(t => (
              <div key={t.id} className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      </div>
                      <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Valor total</p>
                          <p className="text-lg font-black text-slate-800 tracking-tight">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                  </div>

                  <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest mb-2">
                        {t.status === 'completed' ? 'Pago' : 'Aguardando validação'}
                      </span>
                      <div className="flex items-center justify-end gap-2 text-slate-300 text-[9px] font-black uppercase tracking-widest">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {new Date(t.date).toLocaleDateString('pt-BR')}
                      </div>
                      <p className="text-[9px] text-slate-300 font-black text-right mt-0.5">#{t.id.slice(0,5)}</p>
                  </div>
              </div>
            ))
          )}
      </div>
    </div>
  );
};
