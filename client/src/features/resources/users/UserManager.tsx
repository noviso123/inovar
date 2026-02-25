import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { Badge } from '@/shared/components/Badge';

interface UserManagerProps {
  currentUser: User;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentUser.role === UserRole.ADMIN;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await apiService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      await apiService.blockUser(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
    } catch (e) {
      alert('Erro ao alterar status');
    }
  };

  const visibleUsers = isSuperAdmin
    ? users
    : users.filter(u => u.role === UserRole.TECNICO || u.role === UserRole.CLIENTE);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">Time & Acessos</h3>
          <p className="text-sm text-slate-500 font-medium">Controle de permissões e usuários do sistema.</p>
        </div>
        <button
          onClick={() => navigate('novo')}
          className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-xl shadow-slate-900/20 hover:bg-blue-600 transition-all active:scale-95 uppercase text-xs tracking-widest"
        >
          + Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleUsers.map(user => (
          <div key={user.id} className={`group relative bg-white p-8 rounded-[2.5rem] border-2 transition-all hover:shadow-2xl hover:-translate-y-1 ${user.active ? 'border-slate-100 hover:border-blue-100' : 'border-rose-50 bg-rose-50/10'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg ${user.active ? 'bg-slate-900 text-blue-500' : 'bg-rose-100 text-rose-400'}`}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-[1.5rem]" />
                ) : user.name.charAt(0)}
              </div>
              <Badge className={user.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-50 text-blue-700'}>
                {user.role}
              </Badge>
            </div>

            <h4 className="font-black text-slate-800 text-xl tracking-tight mb-1 truncate">{user.name}</h4>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <p className="text-xs font-bold text-slate-400">{user.email}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate(`${user.id}/editar`)} className="flex-1 py-3 text-[10px] font-black bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest">Editar</button>
              <button
                onClick={() => toggleUserStatus(user.id, !!user.active)}
                className={`px-4 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${user.active ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
              >
                {user.active ? 'Bloquear' : 'Ativar'}
              </button>
            </div>
            <button
              onClick={async () => {
                if(window.confirm(`Resetar senha de ${user.name} para 123456?`)) {
                  try {
                    await apiService.adminResetPassword(user.id);
                    alert('Senha resetada com sucesso!');
                  } catch (e) { alert('Erro ao resetar'); }
                }
              }}
              className="w-full mt-3 py-3 text-[10px] font-black bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest"
            >
              Resetar Senha
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
