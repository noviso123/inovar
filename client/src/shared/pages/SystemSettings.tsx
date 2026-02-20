
import React, { useState, useEffect } from 'react';
import { apiService } from '@/shared/services/apiService';

export const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await apiService.getSettings();
      setSettings(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: string) => {
    try {
        const newSettings = { ...settings, [key]: value };
        await apiService.updateSettings(newSettings);
        setSettings(newSettings);
        alert('Configuração atualizada com sucesso!');
    } catch (err) {
        console.error(err);
        alert('Erro ao atualizar!');
    }
  };

  // Helper to extract SLA hours with safe access
  const slas = {
      'BAIXA': (settings || {})['sla_baixa'] || '72',
      'MEDIA': (settings || {})['sla_media'] || '48',
      'ALTA': (settings || {})['sla_alta'] || '24',
      'EMERGENCIAL': (settings || {})['sla_emergencial'] || '6'
  };

  if (loading) return <p className="text-center p-10 text-slate-400">Carregando configurações...</p>;

  if (error) return (
    <div className="p-10 text-center bg-rose-50 rounded-[2.5rem] border border-rose-100 max-w-2xl mx-auto mt-10">
        <h3 className="text-rose-900 font-black text-lg mb-2">Erro de Carregamento</h3>
        <p className="text-rose-700/80 mb-4">{error}</p>
        <button onClick={loadSettings} className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-rose-200">Tentar Novamente</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-12 px-4 md:px-0">
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border-2 border-slate-50 shadow-sm">
        <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-6 md:mb-8 flex items-center gap-4">
          <span className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          </span>
          Parâmetros de SLA (Service Level Agreement)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {Object.entries(slas).map(([priority, hours]) => (
            <div key={priority} className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-[2rem] border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prioridade {priority}</p>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        aria-label={`Horas SLA para prioridade ${priority}`}
                        value={hours}
                        onChange={(e) => setSettings(prev => ({...prev, [`sla_${priority.toLowerCase()}`]: e.target.value}))}
                        className="text-xl md:text-2xl font-black text-slate-800 tracking-tight bg-transparent w-16 md:w-20 outline-none border-b border-transparent focus:border-blue-500"
                    />
                    <span className="font-bold text-slate-400 text-sm md:text-base">Horas</span>
                </div>
              </div>
              <button
                onClick={() => handleUpdate(`sla_${priority.toLowerCase()}`, settings[`sla_${priority.toLowerCase()}`])}
                className="px-4 py-3 md:py-2 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-600 hover:text-white transition-all"
            >
                Salvar
            </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border-2 border-slate-50 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 hidden md:block">
           <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-6 md:mb-8 flex items-center gap-4 relative z-10">
          <span className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </span>
          Manutenção Preventiva Automática
        </h3>

        <div className="p-6 md:p-8 bg-slate-50 rounded-3xl md:rounded-[2.5rem] border border-slate-100 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Periodicidade Padrão</p>
                     <p className="text-slate-600 text-sm max-w-sm mb-4">Intervalo automático para agendamento de manutenção se não especificado no equipamento.</p>

                     <div className="flex items-center gap-3">
                        <input
                            type="number"
                             aria-label="Dias para preventiva"
                            value={settings['preventive_interval'] || '90'}
                            onChange={(e) => setSettings(prev => ({...prev, 'preventive_interval': e.target.value}))}
                            className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight bg-transparent w-24 md:w-28 outline-none border-b-2 border-slate-200 focus:border-emerald-500"
                        />
                        <span className="font-bold text-slate-400 text-lg">Dias</span>
                     </div>
                </div>

                <button
                    onClick={() => handleUpdate('preventive_interval', settings['preventive_interval'])}
                    className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-emerald-600 transition-all active:scale-95"
                >
                    Salvar Configuração
                </button>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {[
                    {label: "Alertas Automáticos", desc: "Avisos 7 dias antes do vencimento", active: true},
                    {label: "Histórico Unificado", desc: "Rastreio completo por equipamento", active: true},
                    {label: "Bloqueio de Garantia", desc: "Sinaliza preventivas atrasadas", active: false, future: true},
                ].map((item, i) => (
                    <div key={i} className={`p-4 rounded-2xl ${item.active ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-100 border border-slate-200 opacity-60'}`}>
                        <div className="flex items-center gap-2 mb-1">
                             <div className={`w-2 h-2 rounded-full ${item.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                             <p className={`text-[10px] font-black uppercase tracking-widest ${item.active ? 'text-emerald-700' : 'text-slate-500'}`}>{item.label}</p>
                        </div>
                        <p className="text-xs font-bold text-slate-600">{item.desc}</p>
                        {item.future && <span className="text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-1 rounded-md mt-2 inline-block">EM BREVE</span>}
                    </div>
                ))}
            </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full"></div>
        <h3 className="text-xl md:text-2xl font-black mb-6 relative z-10">Políticas de Segurança</h3>
        <div className="space-y-4 relative z-10">
          {[
            'Lock de edição simultânea (15 minutos)',
            'Auditoria obrigatória para toda mudança de status',
          ].map((policy, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-default">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">✓</div>
              <span className="text-sm font-medium text-slate-300">{policy}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
