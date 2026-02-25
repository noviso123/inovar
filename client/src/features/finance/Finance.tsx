import React, { useEffect, useState } from 'react';
import { apiService } from '@/shared/services/apiService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { FileDown, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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
  const [taxRate, setTaxRate] = useState(16.5);

  useEffect(() => {
    loadFinance();
    loadTaxRate();
  }, []);

  const loadTaxRate = async () => {
    try {
      const config = await apiService.getFiscalConfig();
      if (config.aliquotaISSPadrao) {
        setTaxRate(config.aliquotaISSPadrao);
      } else if (config.aliquotaSimplesNac) {
        setTaxRate(config.aliquotaSimplesNac);
      }
    } catch (e) {
      console.warn('Using default tax rate');
    }
  };

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

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_API_URL || '/api'}/finance/export`, '_blank');
  };

  const taxes = summary ? summary.totalRevenue * (taxRate / 100) : 0;

  // Process data for charts safely
  const chartData = (summary?.transactions || []).length > 0 ?
    Object.values((summary?.transactions || []).reduce((acc: any, t) => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      if (!acc[date]) acc[date] = { date, income: 0, expense: 0 };
      if (t.type === 'income') acc[date].income += t.amount;
      else acc[date].expense += t.amount;
      return acc;
    }, {})).slice(-7) as any[] : [];

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-black uppercase tracking-widest">Calculando métricas financeiras...</p>
    </div>
  );

  // Fallback if summary is null to prevent further crashes
  const safeSummary = summary || {
    totalRevenue: 0,
    netProfit: 0,
    pendingRevenue: 0,
    expenses: 0,
    transactions: []
  };

  if (error) return (
    <div className="p-10 text-center bg-rose-50 rounded-[2.5rem] border border-rose-100 max-w-2xl mx-auto mt-10">
      <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h3 className="text-rose-900 font-black text-lg mb-2">Erro de Acesso</h3>
      <p className="text-rose-700/80 mb-6 font-medium">{error}</p>
      <button onClick={loadFinance} className="px-6 py-3 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all">Tentar Novamente</button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-left -mx-4">
      {/* Header */}
      <div className="flex justify-between items-center px-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Fluxo de Caixa</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Consolidação em Tempo Real</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleExport}
            className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl flex items-center gap-2 hover:bg-blue-600 transition-all group"
          >
            <FileDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Analytics Summary Charts */}
      <div className="px-4">
        <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-50 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desempenho Semanal (R$)</h4>
            <div className="flex gap-4">
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-[10px] font-black text-slate-400">RECEITA</span></div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded-full"></div><span className="text-[10px] font-black text-slate-400">DESPESA</span></div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{fontSize: 9, fontWeight: 900, fill: '#cbd5e1'}}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '10px'}}
                />
                <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={4} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-2 gap-4 px-4">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <TrendingUp className="absolute right-4 top-4 w-5 h-5 text-blue-500" />
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 relative z-10">Total pago</p>
          <p className="text-2xl font-black text-slate-800 tracking-tighter relative z-10">R$ {safeSummary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">Acumulado do mês</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <Wallet className="absolute right-4 top-4 w-5 h-5 text-amber-500" />
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 relative z-10">Total pendente</p>
          <p className="text-2xl font-black text-amber-600 tracking-tighter relative z-10">R$ {safeSummary.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">Aguardando validação</p>
        </div>
      </div>

      {/* Middle Cards - Profit & Taxes */}
      <div className="grid grid-cols-2 gap-4 px-4">
        <div className="bg-emerald-50 p-6 rounded-[2rem] border-2 border-emerald-100 shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-2">Lucro líquido est.</p>
          <p className="text-2xl font-black text-emerald-800 tracking-tighter">R$ {(safeSummary.totalRevenue - taxes - safeSummary.expenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Livre de impostos & despesas</p>
        </div>
        <div className="bg-rose-50 p-6 rounded-[2rem] border-2 border-rose-100 shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest mb-2">Despesas Reais</p>
          <p className="text-2xl font-black text-rose-800 tracking-tighter">R$ {safeSummary.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[9px] text-rose-400 font-bold uppercase tracking-widest mt-1">Materiais & Logística</p>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-4 px-4 pb-20">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-4">Últimas Movimentações</h4>
        {(safeSummary.transactions || []).length === 0 ? (
          <div className="py-24 text-center text-slate-300 font-black uppercase text-xs">Aguardando movimentação</div>
        ) : (
          [...safeSummary.transactions].reverse().map(t => (
            <div key={t.id} className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  t.type === 'income' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {t.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">{t.description}</p>
                  <p className="text-lg font-black text-slate-800 tracking-tight">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-2 ${
                  t.status === 'paid' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {t.status === 'paid' ? 'Consolidado' : 'Auditando'}
                </span>
                <div className="flex items-center justify-end gap-2 text-slate-300 text-[9px] font-black uppercase tracking-widest">
                  {new Date(t.date).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
