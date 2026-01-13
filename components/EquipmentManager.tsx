
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Equipment, User, UserRole } from '../types';


import { apiService } from '../services/apiService';
import { Badge } from './Badge';

// ...

export const EquipmentManager: React.FC<EquipmentManagerProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const isCliente = currentUser.role === UserRole.CLIENTE;

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEquip, setCurrentEquip] = useState<Partial<Equipment> | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const loadEquipments = async () => {
      try {
          const data = await apiService.getEquipments();
          // Filter client side if needed (apiService.getEquipments usually filters by user context if backend enforces it, but explicit filter is safe)
          setEquipments(
            isCliente
                ? data.filter(e => e.clientId === currentUser.id)
                : data
          );
      } catch (err) {
          console.error('Failed to load equipments', err);
      }
  };

  // Load clients for selection (non-client roles only)
  const loadClients = async () => {
    if (!isCliente) {
      try {
        const data = await apiService.getClients();
        setClients(data);
      } catch (err) {
        console.error('Failed to load clients', err);
      }
    }
  };

  useEffect(() => {
    loadEquipments();
    loadClients();
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEquip) return;

    // Require client selection for non-client roles
    const clientId = isCliente ? currentUser.id : selectedClientId;
    if (!clientId) {
      alert('Por favor, selecione um cliente para este equipamento.');
      return;
    }

    try {
        const equipData = {
            ...currentEquip,
            clientId: clientId,
        };

        if (currentEquip.id) {
            await apiService.updateEquipment(currentEquip.id, equipData);
        } else {
            await apiService.createEquipment(equipData);
        }

        await loadEquipments();
        setIsEditing(false);
        setCurrentEquip(null);
        setSelectedClientId('');
    } catch (err) {
        console.error('Failed to save equipment', err);
    }
  };

  const openNewEquipment = () => {
    setCurrentEquip({ brand: '', model: '', btu: 12000, location: '', serialNumber: '' });
    setSelectedClientId('');
    setIsEditing(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      {/* Back Button + Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/')}
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
          onClick={openNewEquipment}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-[10px]"
        >
          + Nova Máquina
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSave} className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 text-left relative my-8">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">{currentEquip?.id ? 'Editar' : 'Nova'} Máquina</h3>
               <button type="button" onClick={() => setIsEditing(false)} className="text-slate-300 hover:text-slate-900 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            {/* Client Selector - only for non-client users */}
            {!isCliente && (
              <div className="space-y-2 mb-6 p-4 bg-blue-50 rounded-2xl border-2 border-blue-100">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Cliente / Proprietário *</label>
                <select
                  required
                  className="w-full p-4 bg-white border-2 border-blue-200 rounded-xl outline-none focus:border-blue-600 appearance-none font-bold text-slate-800"
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                >
                  <option value="">Selecione o cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-blue-500 font-medium">Todo equipamento deve estar vinculado a um cliente.</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
                  <input required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 focus:bg-white transition-all font-bold"
                    value={currentEquip?.brand} onChange={e => setCurrentEquip({...currentEquip, brand: e.target.value})} placeholder="Samsung, LG..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo / Linha</label>
                  <input required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 focus:bg-white transition-all font-bold"
                    value={currentEquip?.model} onChange={e => setCurrentEquip({...currentEquip, model: e.target.value})} placeholder="WindFree, ArtCool..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacidade</label>
                  <select
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 focus:bg-white appearance-none font-bold"
                    value={currentEquip?.btu}
                    onChange={e => setCurrentEquip({...currentEquip, btu: parseInt(e.target.value)})}
                  >
                    {[7000, 9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000].map(v => (
                      <option key={v} value={v}>{v.toLocaleString()} BTUs</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ambiente / Local</label>
                  <input required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 focus:bg-white transition-all font-bold"
                    value={currentEquip?.location} onChange={e => setCurrentEquip({...currentEquip, location: e.target.value})} placeholder="Ex: Recepção, Quarto 01" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº de Série / Patrimônio</label>
                <input className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 focus:bg-white transition-all font-mono font-bold"
                  placeholder="ID do fabricante ou etiqueta interna"
                  value={currentEquip?.serialNumber} onChange={e => setCurrentEquip({...currentEquip, serialNumber: e.target.value})} />
              </div>
            </div>

            <div className="flex gap-4 mt-12">
              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
              <button type="submit" className="flex-[2] py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl shadow-slate-900/20 uppercase tracking-widest text-xs hover:bg-emerald-600 transition-colors">Gravar Equipamento</button>
            </div>
          </form>
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
                      <rect x="2" y="6" width="20" height="10" rx="2" strokeWidth="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 11h2M10 11h2M14 11h2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16v3M12 16v4M17 16v3" />
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

               <div className="px-5 text-left">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Identificação / SN</p>
                  <p className="text-xs font-mono font-bold text-slate-500">{e.serialNumber || '---'}</p>
               </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => { setCurrentEquip(e); setIsEditing(true); }}
                className="flex-1 py-4 text-xs font-black bg-slate-900 text-white rounded-2xl uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
              >
                Editar
              </button>
              <button
                onClick={() => toggleStatus(e.id)}
                className={`flex-1 py-4 text-xs font-black rounded-2xl uppercase tracking-widest transition-all ${
                  e.active
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
