import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { Badge } from '@/shared/components/Badge';

interface TechnicianManagerProps {
  currentUser: User;
}

export const TechnicianManager: React.FC<TechnicianManagerProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [techs, setTechs] = useState<User[]>([]);
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
          onClick={() => navigate('novo')}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-[10px]"
        >
          + Novo Técnico
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(techs || []).length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            </div>
            <h4 className="text-xl font-black text-slate-400 tracking-tight mb-2">Nenhum técnico cadastrado</h4>
            <p className="text-slate-400/60 font-medium text-sm">Adicione profissionais para começar a atribuir chamados.</p>
          </div>
        ) : (
          (techs || []).map(t => (
            <div key={t.id} className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-xl shadow-slate-900/5 flex flex-col items-center text-center group hover:border-blue-500 hover:-translate-y-2 transition-all duration-500">
              <div className="w-20 h-20 rounded-[2rem] bg-slate-900 text-blue-400 flex items-center justify-center text-3xl font-black mb-6 shadow-xl group-hover:scale-110 transition-transform">
                {t.name?.charAt(0) || '?'}
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-1">{t.name}</h4>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{t.email}</p>
              <div className="w-full pt-6 border-t border-slate-50 flex gap-2">
                <button onClick={() => navigate(`${t.id}/editar`)} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Perfil</button>
                <button
                  onClick={async () => {
                      if(window.confirm(`Excluir ${t.name}?`)) {
                          try {
                            await apiService.deleteUser(t.id);
                            loadTechs();
                          } catch (e: any) {
                            alert(`Erro ao excluir: ${e.message || 'Erro desconhecido'}`);
                          }
                      }
                  }}
                  className="w-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <button onClick={() => toggleStatus(t.id)} className={`flex-1 py-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${t.active ? 'text-slate-600 hover:bg-rose-600 hover:text-white' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white'}`}>
                  {t.active ? 'Bloquear' : 'Ativar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
