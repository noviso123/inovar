
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, UserRole } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { imageUploadService } from '@/shared/services/imageUploadService';

interface TechnicianFormProps {
    currentUser: User;
}

export const TechnicianForm: React.FC<TechnicianFormProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;

    const [formData, setFormData] = useState<Partial<User>>({
        name: '',
        email: '',
        phone: '',
        role: UserRole.TECNICO,
        active: true,
        avatarUrl: ''
    });
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isEditing && id) {
            loadTech(id);
        }
    }, [id, isEditing]);

    const loadTech = async (techId: string) => {
        try {
            setLoading(true);
            // Assuming we fetch all and find, or backend has getById.
            const allUsers = await apiService.getUsers();
            const tech = allUsers.find((u: User) => u.id === techId);

            if (tech) {
                setFormData(tech);
            } else {
                setError('Técnico não encontrado');
            }
        } catch (err: any) {
            console.error('Failed to load tech:', err);
            setError('Erro ao carregar dados do técnico');
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
                    role: UserRole.TECNICO,
                    active: true
                    // Password handled by backend default if not provided
                });
            }
            alert(`Técnico ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            navigate(-1);
        } catch (err) {
            console.error('Save failed', err);
            alert('Erro ao salvar técnico.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !formData.name) return;

        if (window.confirm(`TEM CERTEZA? Deseja excluir o técnico "${formData.name}"?`)) {
            try {
                setSaving(true);
                await apiService.deleteUser(id);
                alert('Técnico excluído com sucesso.');
                navigate(-1);
            } catch (err) {
                console.error(err);
                alert('Erro ao excluir técnico.');
                setSaving(false);
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

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!imageUploadService.isValidImage(file)) {
                alert('Selecione uma imagem válida (JPG, PNG) até 32MB.');
                return;
            }

            setUploading(true);
            try {
                const response = await imageUploadService.uploadFile(file);
                if (response.success) {
                    setFormData(prev => ({ ...prev, avatarUrl: response.data.url }));
                }
            } catch (err) {
                console.error('Upload failed', err);
                alert('Erro ao fazer upload do avatar.');
            } finally {
                setUploading(false);
            }
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
                    <h2 className="text-xl font-black text-slate-800">{isEditing ? 'Editar Técnico' : 'Novo Técnico'}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {isEditing ? 'Atualizar cadastro' : 'Cadastrar novo técnico'}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 max-w-xl mx-auto">
                <form onSubmit={handleSave} className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex justify-center mb-6">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full border-4 border-slate-100 shadow-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                                {uploading ? (
                                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : formData.avatarUrl ? (
                                    <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-4xl text-slate-300 font-black">
                                        {formData.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                <span className="text-white font-bold text-xs uppercase tracking-widest">Alterar</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                            </label>
                        </div>
                    </div>

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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">E-mail de Acesso *</label>
                        <input
                            required
                            type="email"
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="E-mail de Acesso"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Telefone / WhatsApp</label>
                        <input
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Telefone / WhatsApp"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Especialidades (Ex: Ar-Condicionado, Elétrica)</label>
                        <input
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={(formData as any).specialties || ''}
                            onChange={e => setFormData({ ...formData, specialties: e.target.value } as any)}
                            placeholder="Especialidades"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-6 py-4 bg-rose-50 text-rose-600 font-black rounded-2xl uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-colors"
                            >
                                Excluir
                            </button>
                        )}
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
