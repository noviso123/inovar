
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiService } from '../services/apiService';
import { Badge } from './Badge';

interface TechnicianManagerProps {
  currentUser: User;
}

export const TechnicianManager: React.FC<TechnicianManagerProps> = ({ currentUser }) => {
  const [techs, setTechs] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTech, setSelectedTech] = useState<Partial<User> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTechs();
  }, []);

  const loadTechs = async () => {
    try {
      const allUsers = await apiService.getUsers();
      // Filter only technicians
      setTechs(allUsers.filter((u: User) => u.role === UserRole.TECNICO));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTech) return;

    try {
        if (selectedTech.id) {
            await apiService.updateUser(selectedTech.id, selectedTech);
        } else {
            await apiService.createUser({
                ...selectedTech,
                role: UserRole.TECNICO,
                active: true,
                password: 'inovar_default' // Default password for new techs
            });
        }
        await loadTechs();
        setIsEditing(false);
        setSelectedTech(null);
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar técnico');
    }
  };

  const toggleStatus = async (id: string) => {
      try {
          await apiService.blockUser(id);
          const updated = techs.map(t => t.id === id ? { ...t, active: !t.active } : t);
          setTechs(updated);
      } catch (e) {
          alert('Erro ao alterar status');
      }
  }

  if (loading) return <div className="text-center p-10 text-slate-400">Carregando técnicos...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Técnicos</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Corpo Técnico</p>
        </div>
        <button
          onClick={() => { setSelectedTech({ name: '', email: '', phone: '' }); setIsEditing(true); }}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-[10px]"
        >
          + Novo Técnico
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-slate-800 mb-8">Cadastro de Técnico</h3>
            <div className="space-y-6">
              <input required placeholder="Nome Completo" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500"
                value={selectedTech?.name} onChange={e => setSelectedTech({...selectedTech, name: e.target.value})} />
              <input required type="email" placeholder="E-mail de Acesso" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500"
                value={selectedTech?.email} onChange={e => setSelectedTech({...selectedTech, email: e.target.value})} />
              <input placeholder="Telefone / WhatsApp" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500"
                value={selectedTech?.phone} onChange={e => setSelectedTech({...selectedTech, phone: e.target.value})} />
            </div>
            <div className="flex gap-4 mt-10">
              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-xs">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-slate-900/20 hover:bg-emerald-600 transition-colors">Salvar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {techs.map(t => (
          <div key={t.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col items-center text-center group hover:border-blue-500 transition-all">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-900 text-blue-400 flex items-center justify-center text-3xl font-black mb-6 shadow-xl group-hover:scale-110 transition-transform">
              {t.name.charAt(0)}
            </div>
            <h4 className="text-xl font-black text-slate-800 mb-1">{t.name}</h4>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{t.email}</p>
            <div className="w-full pt-6 border-t border-slate-50 flex gap-2">
              <button onClick={() => { setSelectedTech(t); setIsEditing(true); }} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Perfil</button>
              <button onClick={() => toggleStatus(t.id)} className={`flex-1 py-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${t.active ? 'text-slate-600 hover:bg-rose-600 hover:text-white' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white'}`}>
                  {t.active ? 'Bloquear' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
