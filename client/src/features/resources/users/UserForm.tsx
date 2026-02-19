
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, UserRole } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';

interface UserFormProps {
    currentUser: User;
}

export const UserForm: React.FC<UserFormProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;

    const [formData, setFormData] = useState<Partial<User>>({
        name: '',
        email: '',
        role: UserRole.TECNICO,
        active: true
    });
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isEditing && id) {
            loadUser(id);
        }
    }, [id, isEditing]);

    const loadUser = async (userId: string) => {
        try {
            setLoading(true);
            const allUsers = await apiService.getUsers();
            const user = allUsers.find((u: User) => u.id === userId);

            if (user) {
                setFormData(user);
            } else {
                setError('Usuário não encontrado');
            }
        } catch (err: any) {
            console.error('Failed to load user:', err);
            setError('Erro ao carregar dados do usuário');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return;

        setSaving(true);
        try {
            if (isEditing && id) {
                await apiService.updateUser(id, formData);
            } else {
                await apiService.createUser({
                    ...formData,
                    active: true
                });
            }
            alert(`Usuário ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            navigate(-1);
        } catch (err) {
            console.error('Save failed', err);
            alert('Erro ao salvar usuário.');
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async () => {
        if (!id || !formData.name) return;

        if (window.confirm(`Resetar senha de "${formData.name}" para o padrão do sistema?`)) {
            try {
                await apiService.adminResetPassword(id);
                alert(`Senha de ${formData.name} resetada com sucesso!`);
            } catch (e) {
                alert('Erro ao resetar senha');
            }
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
                    <h2 className="text-xl font-black text-slate-800">{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {isEditing ? 'Atualizar cadastro' : 'Cadastrar novo usuário'}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 max-w-xl mx-auto">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nome Completo *</label>
                        <input
                            required
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nome Completo"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">E-mail Operacional *</label>
                        <input
                            required
                            type="email"
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="E-mail Operacional"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Perfil de Acesso</label>
                        <select
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 appearance-none"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                        >
                            {Object.values(UserRole).map(role => (
                                <option key={role} value={role}>{role.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {isEditing && (
                        <div className="pt-6 border-t border-slate-100 mt-6">
                            <button
                                type="button"
                                onClick={handleResetPassword}
                                className="w-full py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all uppercase text-xs tracking-widest"
                            >
                                Resetar Senha para Padrão
                            </button>
                        </div>
                    )}

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
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
