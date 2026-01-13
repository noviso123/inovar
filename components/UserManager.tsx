import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiService } from '../services/apiService';
import { Badge } from './Badge';

interface UserManagerProps {
  currentUser: User;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
        if (selectedUser.id) {
            await apiService.updateUser(selectedUser.id, selectedUser);
        } else {
            await apiService.createUser({
                ...selectedUser,
                password: 'inovar_default',
                active: true
            });
        }
        await loadUsers();
        setIsEditing(false);
        setSelectedUser(null);
    } catch (err) {
        alert('Erro ao salvar usuário');
    }
  };

  const handleResetPassword = async (userName: string, id: string) => {
    if (window.confirm(`Resetar senha de "${userName}" para o padrão: inovar123?`)) {
      try {
          await apiService.adminResetPassword(id);
          alert(`Senha de ${userName} resetada com sucesso!`);
      } catch (e) {
          alert('Erro ao resetar senha');
      }
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
          onClick={() => { setSelectedUser({ name: '', email: '', role: UserRole.TECNICO }); setIsEditing(true); }}
          className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-xl shadow-slate-900/20 hover:bg-blue-600 transition-all active:scale-95 uppercase text-xs tracking-widest"
        >
          + Novo Usuário
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[70] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-300 text-left relative">
             <div className="flex justify-between items-center mb-10">
               <h3 className="text-3xl font-black text-slate-800 tracking-tight">{selectedUser?.id ? 'Editar' : 'Novo'} Usuário</h3>
               <button type="button" onClick={() => setIsEditing(false)} className="text-slate-300 hover:text-slate-900 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 focus:bg-white transition-all font-bold"
                  value={selectedUser?.name} onChange={e => setSelectedUser({...selectedUser, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Operacional</label>
                <input type="email" required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 focus:bg-white transition-all font-bold"
                  value={selectedUser?.email} onChange={e => setSelectedUser({...selectedUser, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil de Acesso</label>
                <select
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none font-bold"
                  value={selectedUser?.role}
                  onChange={e => setSelectedUser({...selectedUser, role: e.target.value as UserRole})}
                >
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {selectedUser?.id && (
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => handleResetPassword(selectedUser.name!, selectedUser.id!)}
                    className="w-full py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all uppercase text-xs tracking-widest"
                  >
                    Resetar Senha para Padrão
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-10">
              <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 uppercase tracking-widest text-xs hover:bg-emerald-600 transition-colors">Salvar Alterações</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleUsers.map(user => (
          <div key={user.id} className={`group relative bg-white p-8 rounded-[2.5rem] border-2 transition-all hover:shadow-2xl hover:-translate-y-1 ${user.active ? 'border-slate-100 hover:border-blue-100' : 'border-rose-50 bg-rose-50/10'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg ${user.active ? 'bg-slate-900 text-blue-500' : 'bg-rose-100 text-rose-400'}`}>
                {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-[1.5rem]" />
                ) : user.name.charAt(0)}
              </div>
              <Badge className={user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}>
                {user.role}
              </Badge>
            </div>

            <h4 className="font-black text-slate-800 text-xl tracking-tight mb-1 truncate">{user.name}</h4>
            <div className="flex items-center gap-2 mb-8">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <p className="text-xs font-bold text-slate-400">{user.email}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setSelectedUser(user); setIsEditing(true); }} className="flex-1 py-3 text-[10px] font-black bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest">Editar</button>
              <button
                onClick={() => toggleUserStatus(user.id, !!user.active)}
                className={`px-4 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${user.active ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
              >
                {user.active ? 'Bloquear' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
