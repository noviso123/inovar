
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Company, Address } from '../types';
import { apiService } from '../services/apiService';
import { imageUploadService } from '../services/imageUploadService';

interface CompanyEditProps {
    currentUser: User;
}

export const CompanyEdit: React.FC<CompanyEditProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        email: '',
        phone: '',
        address: '',
        logoUrl: '',
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

    // Load company data
    useEffect(() => {
        const loadCompany = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await apiService.getCompany();
                setCompany(data);
                setFormData({
                    razaoSocial: data.razaoSocial || '',
                    nomeFantasia: data.nomeFantasia || '',
                    cnpj: data.cnpj || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    logoUrl: data.logoUrl || '',
                    endereco: data.endereco || {
                        zipCode: '',
                        street: '',
                        number: '',
                        complement: '',
                        district: '',
                        city: '',
                        state: ''
                    }
                });
            } catch (err: any) {
                console.error('Failed to load company:', err);
                setError(err.message || 'Erro ao carregar dados da empresa');
            } finally {
                setLoading(false);
            }
        };
        loadCompany();
    }, []);

    const handleCEPSearch = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                setLoading(true);
                const address = await apiService.searchCEP(cep);
                setFormData(prev => ({
                    ...prev,
                    endereco: {
                        ...prev.endereco,
                        street: address.logradouro,
                        district: address.bairro,
                        city: address.localidade,
                        state: address.uf,
                        zipCode: cep
                    }
                }));
            } catch (err) {
                alert('CEP não encontrado');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.razaoSocial || !formData.nomeFantasia) {
            alert('Razão Social e Nome Fantasia são obrigatórios.');
            return;
        }

        setSaving(true);
        try {
            await apiService.updateCompany({
                razaoSocial: formData.razaoSocial,
                nomeFantasia: formData.nomeFantasia,
                cnpj: formData.cnpj,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                logoUrl: formData.logoUrl,
                endereco: formData.endereco
            });

            alert('Empresa atualizada com sucesso!');
            navigate(-1); // Go back
        } catch (err) {
            console.error('Save failed', err);
            alert('Erro ao salvar.');
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
                    <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl font-bold">Tentar novamente</button>
                </div>
            </div>
        );
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!imageUploadService.isValidImage(file)) {
                alert('Selecione uma imagem válida (JPG, PNG) até 32MB.');
                return;
            }

            setUploading(true);
            try {
                const response = await imageUploadService.uploadFile(file, `company-logo-${currentUser.companyId}`);
                if (response.success) {
                    setFormData(prev => ({ ...prev, logoUrl: response.data.url }));
                }
            } catch (err) {
                console.error('Upload failed', err);
                alert('Erro ao fazer upload da logo.');
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
                    <h2 className="text-xl font-black text-slate-800">Editar Empresa</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atualizar Dados</p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100">
                <form onSubmit={handleSave} className="space-y-6">
                    {/* Logo Upload */}
                    <div className="flex justify-center mb-6">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-2xl border-4 border-slate-100 shadow-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                                {uploading ? (
                                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : formData.logoUrl ? (
                                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <span className="text-slate-300 font-bold text-xs uppercase text-center px-2">Sem Logo</span>
                                )}
                            </div>
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                                <span className="text-white font-bold text-xs uppercase tracking-widest">Alterar</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Razão Social *</label>
                            <input
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                value={formData.razaoSocial}
                                onChange={e => setFormData({ ...formData, razaoSocial: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nome Fantasia *</label>
                            <input
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                value={formData.nomeFantasia}
                                onChange={e => setFormData({ ...formData, nomeFantasia: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">CNPJ</label>
                        <input
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            value={formData.cnpj}
                            onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                            placeholder="00.000.000/0000-00"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">E-mail</label>
                            <input
                                type="email"
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Telefone</label>
                            <input
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Endereço</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">CEP</label>
                                <input
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                                    value={formData.endereco?.zipCode || ''}
                                    onChange={e => setFormData({ ...formData, endereco: { ...formData.endereco, zipCode: e.target.value } })}
                                    onBlur={handleCEPSearch}
                                    placeholder="00000-000"
                                    maxLength={9}
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
                            className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
