
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, UserRole, Address } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { imageUploadService } from '@/shared/services/imageUploadService';

interface ClientFormProps {
    currentUser: User;
}

export const ClientForm: React.FC<ClientFormProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;

    const [formData, setFormData] = useState<Partial<User> & { endereco?: Partial<Address>; document?: string }>({
        name: '',
        email: '',
        phone: '',
        document: '',
        role: UserRole.CLIENTE,
        active: true,
        avatarUrl: '',
        endereco: {
            zipCode: '',
            street: '',
            number: '',
            complement: '',
            district: '',
            city: '',
            state: ''
        }
    });
    const [loading, setLoading] = useState(isEditing);
    const [cepLoading, setCepLoading] = useState(false);
    const [cnpjLoading, setCnpjLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PRESTADOR;

    useEffect(() => {
        if (isEditing && id) {
            loadClient(id);
        }
    }, [id, isEditing]);

    const loadClient = async (clientId: string) => {
        try {
            setLoading(true);
            const client = await apiService.getClient(clientId);

            if (client) {
                setFormData(client);
            } else {
                setError('Cliente não encontrado');
            }
        } catch (err: any) {
            console.error('Failed to load client:', err);
            setError('Erro ao carregar dados do cliente');
        } finally {
            setLoading(false);
        }
    };

    const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');

        setFormData(prev => ({
            ...prev,
            endereco: { ...prev.endereco, zipCode: cep }
        }));

        if (cep.length === 8) {
            try {
                setCepLoading(true);
                const address = await apiService.searchCEP(cep);
                setFormData(prev => ({
                    ...prev,
                    endereco: {
                        ...prev.endereco,
                        street: address.logradouro || '',
                        district: address.bairro || '',
                        city: address.localidade || '',
                        state: address.uf || '',
                        zipCode: cep
                    }
                }));
            } catch (err) {
                console.error('CEP lookup failed:', err);
            } finally {
                setCepLoading(false);
            }
        }
    };

    const handleCNPJSearch = async () => {
        const doc = (formData.document || '').replace(/\D/g, '');
        if (doc.length !== 14) return;

        try {
            setCnpjLoading(true);
            const data = await apiService.lookupCNPJ(doc);

            setFormData(prev => ({
                ...prev,
                name: data.razao_social || data.nome_fantasia || prev.name,
                email: (!prev.email && data.email) ? data.email : (prev.email || ''),
                phone: (!prev.phone && data.ddd_telefone_1) ? data.ddd_telefone_1 : (prev.phone || ''),
                endereco: {
                    zipCode: data.cep?.replace(/\D/g, '') || prev.endereco?.zipCode,
                    street: data.logradouro || prev.endereco?.street,
                    number: data.numero || prev.endereco?.number,
                    complement: data.complemento || prev.endereco?.complement,
                    district: data.bairro || prev.endereco?.district,
                    city: data.municipio || prev.endereco?.city,
                    state: data.uf || prev.endereco?.state
                }
            }));

            alert('Dados da empresa encontrados!');
        } catch (err: any) {
            console.error('CNPJ lookup failed:', err);
            alert('Erro ao buscar CNPJ: ' + (err.message || 'Empresa não encontrada'));
        } finally {
            setCnpjLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return;

        setSaving(true);
        try {
            if (isEditing && id) {
                await apiService.updateClient(id, formData);
            } else {
                await apiService.createClient({
                    ...formData,
                    role: UserRole.CLIENTE,
                    active: true
                });
            }
            alert(`Cliente ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            navigate(-1);
        } catch (err) {
            console.error('Save failed', err);
            alert('Erro ao salvar cliente.');
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async () => {
        if (!id || !formData.name) return;

        if (window.confirm(`Deseja resetar a senha de "${formData.name}"? A nova senha padrão será: 123456`)) {
            try {
                await apiService.adminResetPassword(id);
                alert(`Senha de ${formData.name} resetada com sucesso para: 123456`);
            } catch (err) {
                alert('Erro ao resetar senha');
            }
        }
    };

    const handleDelete = async () => {
        if (!id || !formData.name) return;

        if (window.confirm(`TEM CERTEZA? Deseja excluir o cliente "${formData.name}" permanentemente? Essa ação não pode ser desfeita.`)) {
            try {
                setSaving(true);
                await apiService.deleteClient(id);
                alert('Cliente excluído com sucesso.');
                navigate(-1);
            } catch (err) {
                console.error(err);
                alert('Erro ao excluir cliente.');
            } finally {
                setSaving(false);
            }
        }
    };

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
                    <h2 className="text-xl font-black text-slate-800">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {isEditing ? 'Atualizar cadastro' : 'Cadastrar novo cliente'}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 max-w-2xl mx-auto">
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Razão Social / Nome *</label>
                        <input
                            required
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">E-mail Corporativo *</label>
                        <input
                            required
                            type="email"
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">CNPJ / CPF</label>
                        <div className="flex gap-2">
                            <input
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                                value={formData.document || ''}
                                onChange={e => setFormData({ ...formData, document: e.target.value })}
                                placeholder="000.000.000-00"
                            />
                            {formData.document && formData.document.replace(/\D/g, '').length === 14 && (
                                <button
                                    type="button"
                                    onClick={handleCNPJSearch}
                                    disabled={cnpjLoading}
                                    className="px-4 bg-cyan-100 text-cyan-700 font-black rounded-2xl hover:bg-cyan-200 transition-colors disabled:opacity-50 shrink-0 uppercase text-[10px] tracking-widest"
                                >
                                    {cnpjLoading ? '...' : 'Buscar CNPJ'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Telefone / WhatsApp</label>
                        <input
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={formData.phone || ''}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(11) 99999-9999"
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Endereço</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">CEP {cepLoading && <span className="text-cyan-500">(buscando...)</span>}</label>
                                <input
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                                    value={formData.endereco?.zipCode || ''}
                                    onChange={handleCEPChange}
                                    maxLength={8}
                                    placeholder="00000000"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Estado (UF)</label>
                                <input
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                    value={formData.endereco?.state || ''}
                                    onChange={e => setFormData({ ...formData, endereco: { ...formData.endereco, state: e.target.value } })}
                                    maxLength={2}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Cidade</label>
                            <input
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                value={formData.endereco?.city || ''}
                                onChange={e => setFormData({ ...formData, endereco: { ...formData.endereco, city: e.target.value } })}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Rua / Logradouro</label>
                                <input
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                    value={formData.endereco?.street || ''}
                                    onChange={e => setFormData({ ...formData, endereco: { ...formData.endereco, street: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Número</label>
                                <input
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                    value={formData.endereco?.number || ''}
                                    onChange={e => setFormData({ ...formData, endereco: { ...formData.endereco, number: e.target.value } })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Bairro</label>
                                <input
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                    value={formData.endereco?.district || ''}
                                    onChange={e => setFormData({ ...formData, endereco: { ...formData.endereco, district: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Complemento</label>
                                <input
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                    value={formData.endereco?.complement || ''}
                                    onChange={e => setFormData({ ...formData, endereco: { ...formData.endereco, complement: e.target.value } })}
                                />
                            </div>
                        </div>
                    </div>

                    {isEditing && isManager && (
                        <div className="pt-6 border-t border-slate-100 mt-6">
                            <button
                                type="button"
                                onClick={handleResetPassword}
                                className="w-full py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all uppercase text-xs tracking-widest mb-2"
                            >
                                Resetar Senha de Acesso
                            </button>
                            <p className="text-[10px] text-center text-slate-400">Senha padrão: 123456</p>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        {isEditing && isManager && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={saving}
                                className="px-6 py-4 bg-rose-50 text-rose-600 font-black rounded-2xl uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-colors disabled:opacity-50"
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
                            className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
