
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';

interface ProfileEditProps {
    currentUser: User;
    onUpdateUser: (user: User) => void;
}

export const ProfileEdit: React.FC<ProfileEditProps> = ({ currentUser, onUpdateUser }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const user = await apiService.getCurrentUser();
                setFormData({
                    name: user.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                });
            } catch (err) {
                console.error('Failed to load user profile', err);
                // Fallback to prop if fetch fails
                if (currentUser) {
                    setFormData({
                        name: currentUser.name || '',
                        email: currentUser.email || '',
                        phone: currentUser.phone || '',
                    });
                }
            }
        };
        loadUser();
    }, [currentUser]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiService.updateProfile({
                name: formData.name,
                phone: formData.phone,
            });

            const updatedUser: User = {
                ...currentUser,
                name: formData.name,
                phone: formData.phone,
            };
            onUpdateUser(updatedUser);
            alert('Perfil atualizado com sucesso!');
            navigate(-1);
        } catch (err) {
            console.error('Save failed', err);
            alert('Erro ao salvar perfil.');
        } finally {
            setSaving(false);
        }
    };

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
                    <h2 className="text-xl font-black text-slate-800">Editar Perfil</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Atualizar meus dados
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 max-w-xl mx-auto">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nome Completo</label>
                        <input
                            required
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nome Completo"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Telefone</label>
                        <input
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Telefone"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">E-mail (não editável)</label>
                        <input
                            className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-slate-400 cursor-not-allowed"
                            value={formData.email}
                            disabled
                        />
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
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
