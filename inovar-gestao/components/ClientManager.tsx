import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { apiService } from '../services/apiService';
import { Badge } from './Badge';

interface ClientManagerProps {
  currentUser: User;
}

export const ClientManager: React.FC<ClientManagerProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PRESTADOR;

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await apiService.getClients();
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleClientStatus = async (id: string) => {
    try {
      await apiService.blockClient(id);
      const updated = clients.map(u => u.id === id ? { ...u, active: !u.active } : u);
      setClients(updated);
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

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
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Clientes</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Carteira de Clientes</p>
        </div>
        <button
          onClick={() => navigate('novo')}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-[10px]"
        >
          + Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <div key={client.id} className={`group relative bg-white p-8 rounded-[2.5rem] border-2 transition-all hover:shadow-2xl hover:-translate-y-1 ${client.active ? 'border-slate-100 hover:border-blue-100' : 'border-rose-50 bg-rose-50/10'}`}>
            <div className="flex justify-between items-start mb-8">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg ${client.active ? 'bg-cyan-600 text-white' : 'bg-rose-100 text-rose-400'}`}>
                {client.name.charAt(0)}
              </div>
            </div>

            <h4 className="text-xl font-black text-slate-800 tracking-tight mb-1 truncate">{client.name}</h4>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{client.phone || 'Sem Documento'}</p>

            <div className="flex items-center gap-3 mb-8 bg-slate-50 p-4 rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <span className="text-xs font-bold text-slate-600 truncate">{client.email}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate(`${client.id}/editar`)}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => toggleClientStatus(client.id)}
                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${client.active ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
              >
                {client.active ? 'Bloq.' : 'Ativar'}
              </button>
            </div>
             <button
              onClick={async () => {
                if(window.confirm(`Resetar senha de ${client.name} para 123456?`)) {
                  try {
                    // Use client.userId explicitly
                    await apiService.adminResetPassword((client as any).userId);
                    alert('Senha resetada com sucesso!');
                  } catch (e) { alert('Erro ao resetar'); }
                }
              }}
              className="w-full mt-3 py-3 text-[10px] font-black bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-colors uppercase tracking-widest"
            >
              Resetar Senha
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
