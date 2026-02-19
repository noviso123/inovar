
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Equipment, User, UserRole } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';

interface EquipmentFormProps {
  currentUser: User;
}

export const EquipmentForm: React.FC<EquipmentFormProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const isCliente = currentUser.role === UserRole.CLIENTE;

  const [formData, setFormData] = useState<Partial<Equipment>>({
    brand: '',
    model: '',
    btu: 12000,
    location: '',
    serialNumber: '',
    active: true,
    preventiveInterval: 0,
    lastPreventiveDate: undefined
  });
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [allEquipments, setAllEquipments] = useState<Equipment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadClients(),
          loadSuggestions(),
          isEditing && id ? loadEquipment(id) : Promise.resolve()
        ]);
      } catch (err: any) {
        console.error('Init failed', err);
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEditing, currentUser]);

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

  const loadSuggestions = async () => {
    try {
      const data = await apiService.getEquipments();
      setAllEquipments(data);
    } catch (err) {
      console.error('Failed to load suggestions', err);
    }
  };

  const loadEquipment = async (equipId: string) => {
    try {
      // Assuming we fetch all and find, or backend has getById.
      // Using getEquipments for consistency with previous pattern.
      const allEquips = await apiService.getEquipments();
      setAllEquipments(allEquips);
      const equip = allEquips.find(e => e.id === equipId);

      if (equip) {
        setFormData(equip);
        setSelectedClientId(equip.clientId);
      } else {
        setError('Equipamento não encontrado');
      }
    } catch (err) {
      console.error('Failed to load equipment', err);
      throw err;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require client selection for non-client roles
    const clientId = isCliente ? currentUser.id : selectedClientId;
    if (!clientId) {
      alert('Por favor, selecione um cliente para este equipamento.');
      return;
    }

    setSaving(true);
    try {
      const equipData = {
        ...formData,
        clientId: clientId,
      };

      if (isEditing && id) {
        await apiService.updateEquipment(id, equipData);
      } else {
        await apiService.createEquipment(equipData as any);
      }

      alert(`Equipamento ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
      navigate(-1);
    } catch (err) {
      console.error('Failed to save equipment', err);
      alert('Erro ao salvar equipamento.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center bg-rose-50 p-8 rounded-2xl">
          <p className="text-rose-600 font-bold">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl font-bold">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-8">
      {/* Back Button */}
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
          <h2 className="text-xl font-black text-slate-800">{isEditing ? 'Editar Máquina' : 'Nova Máquina'}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {isEditing ? 'Atualizar equipamento' : 'Cadastrar novo equipamento'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 max-w-2xl mx-auto">
        <form onSubmit={handleSave} className="space-y-6">

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

            {/* Suggestions for Brand/Model */}
            <datalist id="brands">
              {Array.from(new Set(allEquipments.map(e => e.brand))).sort().map(brand => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
            <datalist id="models">
              {Array.from(new Set(allEquipments.map(e => e.model))).sort().map(model => (
                <option key={model} value={model} />
              ))}
            </datalist>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca *</label>
              <input
                required
                list="brands"
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                value={formData.brand}
                onChange={e => setFormData({...formData, brand: e.target.value})}
                placeholder="Samsung, LG..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo / Linha *</label>
              <input
                required
                list="models"
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
                placeholder="WindFree, ArtCool..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacidade</label>
              <select
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 appearance-none"
                value={formData.btu}
                onChange={e => setFormData({...formData, btu: parseInt(e.target.value)})}
              >
                {[7000, 9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000].map(v => (
                  <option key={v} value={v}>{v.toLocaleString()} BTUs</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ambiente / Local *</label>
              <input
                required
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                placeholder="Ex: Recepção, Quarto 01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº de Série / Patrimônio</label>
            <input
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              placeholder="ID do fabricante ou etiqueta interna"
              value={formData.serialNumber}
              onChange={e => setFormData({...formData, serialNumber: e.target.value})}
            />
          </div>

          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100/50 mt-6">
               <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   Planejamento de Manutenção
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest ml-1">Intervalo (Dias)</label>
                        <input
                            type="number"
                             className="w-full p-4 bg-white/80 rounded-2xl font-bold text-emerald-900 border-none outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-emerald-800/30"
                             placeholder="0 = Padrão do Sistema (90)"
                             value={formData.preventiveInterval || ''}
                             onChange={e => setFormData({...formData, preventiveInterval: parseInt(e.target.value)})}
                        />
                        <p className="text-[10px] text-emerald-600/70 font-bold ml-1">Deixe em branco ou 0 para usar padrão</p>
                    </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest ml-1">Última Preventiva</label>
                        <input
                             type="date"
                             className="w-full p-4 bg-white/80 rounded-2xl font-bold text-emerald-900 border-none outline-none focus:ring-2 focus:ring-emerald-500"
                             value={formData.lastPreventiveDate ? formData.lastPreventiveDate.split('T')[0] : ''}
                             onChange={e => {
                                 const val = e.target.value;
                                 setFormData({
                                     ...formData,
                                     lastPreventiveDate: val ? new Date(val).toISOString() : undefined
                                 });
                             }}
                        />
                    </div>
               </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-slate-900/30 hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Gravar Equipamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
