import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Equipment, User, UserRole } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { Badge } from '@/shared/components/Badge';

interface EquipmentManagerProps {
  currentUser: User;
}

export const EquipmentManager: React.FC<EquipmentManagerProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const isCliente = currentUser.role === UserRole.CLIENTE;

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEquipments = async () => {
    try {
      setLoading(true);
      const [data, clientsData] = await Promise.all([
        apiService.getEquipments(),
        !isCliente ? apiService.getClients() : Promise.resolve([])
      ]);

      const enriched = data.map((e: any) => ({
        ...e,
        clientName: clientsData.find((c: any) => c.id === e.clientId)?.name
      }));

      setEquipments(
        isCliente
          ? enriched.filter(e => e.clientId === currentUser.id)
          : enriched
      );
    } catch (err) {
      console.error('Failed to load equipments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipments();
  }, [currentUser]);

  const toggleStatus = async (id: string) => {
    try {
      const equip = equipments.find(e => e.id === id);
      if (!equip) return;

      if (equip.active) {
        await apiService.deactivateEquipment(id);
      } else {
        await apiService.reactivateEquipment(id);
      }
      await loadEquipments();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const getPreventiveStatus = (equipment: Equipment) => {
    let nextDate = equipment.nextPreventiveDate;

    // Fallback calculation if missing
    // Treat 0 as "Default System (90)"
    if (!nextDate) {
        const interval = (!equipment.preventiveInterval || equipment.preventiveInterval <= 0) ? 90 : equipment.preventiveInterval;

        const baseDate = equipment.lastPreventiveDate
            ? new Date(equipment.lastPreventiveDate)
            : (equipment.createdAt ? new Date(equipment.createdAt) : new Date());

        baseDate.setDate(baseDate.getDate() + interval);
        nextDate = baseDate.toISOString();
    }

    if (!nextDate) return { color: 'bg-slate-50 text-slate-400 border border-slate-100', label: 'Não agendada', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> };

    const today = new Date();
    today.setHours(0,0,0,0);
    const next = new Date(nextDate);
    next.setHours(0,0,0,0);

    // Diff in milliseconds
    const diffTime = next.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: 'bg-rose-50 text-rose-600 border border-rose-100', label: `Atrasada (${Math.abs(diffDays)}d)`, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> };
    if (diffDays <= 30) return { color: 'bg-amber-50 text-amber-600 border border-amber-100', label: `Vence em ${diffDays}d`, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> };
    return { color: 'bg-emerald-50 text-emerald-600 border border-emerald-100', label: 'Em dia', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      {/* Back Button + Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Máquinas / Equipamentos</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ativos de Climatização</p>
        </div>
        {!isCliente && (
        <button
          onClick={() => navigate('nova')}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-[10px]"
        >
          + Nova Máquina
        </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
          <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black uppercase tracking-widest">Sincronizando Máquinas...</p>
        </div>
      )}

      {!loading && (equipments || []).length === 0 && (
        <div className="py-24 text-center bg-slate-50 rounded-[3.5rem] border-2 border-dashed border-slate-200">
           <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <rect x="2" y="4" width="20" height="14" rx="2" strokeWidth="2" />
                    <circle cx="9" cy="11" r="4" strokeWidth="2" />
                </svg>
            </div>
          <h4 className="text-xl font-black text-slate-400 tracking-tight mb-2">Nenhuma máquina cadastrada</h4>
          <p className="text-slate-400/60 font-medium text-sm">Registre os ativos para começar a monitorar preventivas.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {(equipments || []).map(e => {
          return (
          <div key={e.id} className={`group relative p-10 bg-white/80 backdrop-blur-xl rounded-[3.5rem] border-2 transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.12)] hover:-translate-y-3 ${e.active ? 'border-slate-50 hover:border-blue-200' : 'border-slate-100 opacity-60 saturate-0 shadow-inner'}`}>
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-colors ${e.active ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {/* AC Icon */}
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="4" width="20" height="14" rx="2" strokeWidth="2" />
                    <circle cx="9" cy="11" r="4" strokeWidth="2" />
                    <circle cx="9" cy="11" r="1.5" strokeWidth="1" />
                    <path strokeLinecap="round" strokeWidth="1.5" d="M9 7v8M5 11h8M6.2 8.2l5.6 5.6M11.8 8.2l-5.6 5.6" />
                    <path strokeLinecap="round" strokeWidth="2" d="M16 8h3M16 11h3M16 14h3" />
                    <path strokeWidth="2" d="M5 18v2M19 18v2" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${e.active ? 'text-blue-500' : 'text-slate-400'}`}>{e.btu.toLocaleString()} BTUs</p>
                  <h4 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{e.brand}</h4>
                </div>
              </div>
              <Badge className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${e.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {e.active ? 'Ativo' : 'Retirado'}
              </Badge>
            </div>

            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-100 group-hover:bg-white group-hover:border-blue-100 transition-all">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Localização</p>
                  <p className="text-sm font-black text-slate-800 truncate">{e.location}</p>
                </div>
              </div>
              {(() => {
                  const status = getPreventiveStatus(e);

                  let displayDateStr = '-';
                  try {
                      if (status.label !== 'Não agendada') {
                          if (e.nextPreventiveDate) {
                            displayDateStr = new Date(e.nextPreventiveDate).toLocaleDateString();
                          } else if (e.preventiveInterval && e.preventiveInterval > 0) {
                              // Fallback calculation same as getPreventiveStatus
                              const baseDate = e.lastPreventiveDate
                                ? new Date(e.lastPreventiveDate)
                                : (e.createdAt ? new Date(e.createdAt) : new Date());

                              if (!isNaN(baseDate.getTime())) {
                                baseDate.setDate(baseDate.getDate() + (e.preventiveInterval || 90));
                                displayDateStr = baseDate.toLocaleDateString();
                              }
                          }
                      }
                  } catch (err) {
                      console.error("Date error", err);
                  }

                  return (
                    <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${status.color}`}>
                        <div className="w-8 h-8 rounded-xl bg-white/50 flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {status.icon}
                            </svg>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Preventiva</p>
                            <p className="text-xs font-black">{status.label}</p>
                        </div>
                         {(e.nextPreventiveDate || (e.preventiveInterval && e.preventiveInterval > 0)) && (
                             <div className="ml-auto text-right">
                                 <p className="text-[9px] font-bold opacity-50">
                                    {displayDateStr}
                                 </p>
                             </div>
                         )}
                    </div>
                  );
              })()}

              <div className="px-5 text-left flex flex-col gap-2">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Identificação / SN</p>
                  <p className="text-xs font-mono font-bold text-slate-500">{e.serialNumber || '---'}</p>
                </div>
                {!isCliente && (
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Proprietário / Cliente</p>
                    <p className="text-xs font-black text-blue-600 uppercase">{(e as any).clientName || '---'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {!isCliente && (
              <>
              <button
                onClick={() => navigate(`${e.id}/editar`)}
                className="flex-1 py-4 text-xs font-black bg-slate-900 text-white rounded-2xl uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
              >
                Editar
              </button>
              <button
                onClick={() => toggleStatus(e.id)}
                className={`flex-1 py-4 text-xs font-black rounded-2xl uppercase tracking-widest transition-all ${e.active
                  ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                  }`}
              >
                {e.active ? 'Desativar' : 'Reativar'}
              </button>
              </>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};
