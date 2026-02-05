import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Equipment, User, UserRole } from '../types';
import { apiService } from '../services/apiService';
import { Badge } from './Badge';

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
        <button
          onClick={() => navigate('nova')}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-[10px]"
        >
          + Nova Máquina
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
          <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black uppercase tracking-widest">Sincronizando Máquinas...</p>
        </div>
      )}

      {!loading && equipments.length === 0 && (
        <div className="py-24 text-center bg-slate-50 rounded-[3.5rem] border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nenhuma máquina cadastrada</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {equipments.map(e => (
          <div key={e.id} className={`group relative p-10 bg-white rounded-[3.5rem] border-2 transition-all hover:shadow-2xl ${e.active ? 'border-slate-50' : 'border-slate-50 opacity-50 saturate-0 shadow-inner'}`}>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
