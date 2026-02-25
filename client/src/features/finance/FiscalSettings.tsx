
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ConfiguracaoFiscal } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';

interface FiscalSettingsProps {
    currentUser: User;
}

export const FiscalSettings: React.FC<FiscalSettingsProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const [company, setCompany] = useState<any>(null);
    const [cnpjInput, setCnpjInput] = useState('');
    const [searching, setSearching] = useState(false);
    const [config, setConfig] = useState<ConfiguracaoFiscal | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [certPassword, setCertPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [regimes, setRegimes] = useState<any[]>([]);

    const REGIMES_FALLBACK = [
        { id: 'MEI', nome: 'MEI - Microempreendedor Individual' },
        { id: 'SIMPLES_NACIONAL', nome: 'Simples Nacional' },
        { id: 'LUCRO_PRESUMIDO', nome: 'Lucro Presumido' },
        { id: 'LUCRO_REAL', nome: 'Lucro Real' },
        { id: 'IMUNE', nome: 'Imune' },
        { id: 'ISENTO', nome: 'Isento' }
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [configData, regimesData, companyData] = await Promise.all([
                apiService.getFiscalConfig(),
                apiService.getTaxRegimes(),
                apiService.getCompany()
            ]);
            setConfig(configData);
            setRegimes(regimesData?.regimes || regimesData || []);
            setCompany(companyData);
            if (companyData?.cnpj) {
                setCnpjInput(companyData.cnpj);
            }
        } catch (err: any) {
            console.error('Failed to load fiscal data:', err);
            setError(err.message || 'Erro ao carregar configurações fiscais');
            // Use fallback if API fails
            setRegimes(REGIMES_FALLBACK);
        } finally {
            setLoading(false);
        }
    };

    const handleLookupCNPJ = async () => {
        if (!cnpjInput) return;
        setSearching(true);
        try {
            const data = await apiService.lookupCNPJ(cnpjInput);

            // Auto-fill config based on returned data
            if (data.suggestedConfig) {
                 setConfig(prev => {
                    const base = prev || data.suggestedConfig;
                    const merged = {
                        ...base,
                        ...data.suggestedConfig,
                        // Priority for suggested fields using correct casing
                        regimeTributario: data.suggestedConfig.regimeTributario || data.regime_tributario || base.regimeTributario,
                        tipoCNPJ: data.suggestedConfig.tipoCNPJ || data.suggestedConfig.tipoCnpj || base.tipoCNPJ,
                        naturezaOperacao: data.suggestedConfig.naturezaOperacao || base.naturezaOperacao,
                        localPrestacao: data.suggestedConfig.localPrestacao || base.localPrestacao,
                        codigoServico: data.suggestedConfig.codigoServico || base.codigoServico,
                        itemListaServico: data.suggestedConfig.itemListaServico || base.itemListaServico,
                        cnae: data.suggestedConfig.cnae || (data.cnae_fiscal ? String(data.cnae_fiscal) : '') || base.cnae,
                        ambiente: data.suggestedConfig.ambiente || base.ambiente,
                        // Boolean flags (explicitly check for boolean to allow false values)
                        issRetido: typeof data.suggestedConfig.issRetido === 'boolean' ? data.suggestedConfig.issRetido : base.issRetido,
                        retemPIS: typeof data.suggestedConfig.retemPIS === 'boolean' ? data.suggestedConfig.retemPIS : base.retemPIS,
                        retemCOFINS: typeof data.suggestedConfig.retemCOFINS === 'boolean' ? data.suggestedConfig.retemCOFINS : base.retemCOFINS,
                        retemCSLL: typeof data.suggestedConfig.retemCSLL === 'boolean' ? data.suggestedConfig.retemCSLL : base.retemCSLL,
                        retemIR: typeof data.suggestedConfig.retemIR === 'boolean' ? data.suggestedConfig.retemIR : base.retemIR,
                        retemINSS: typeof data.suggestedConfig.retemINSS === 'boolean' ? data.suggestedConfig.retemINSS : base.retemINSS,
                        optanteSimplesNac: typeof data.suggestedConfig.optanteSimplesNac === 'boolean' ? data.suggestedConfig.optanteSimplesNac : base.optanteSimplesNac,
                        isMEI: typeof data.suggestedConfig.isMEI === 'boolean' ? data.suggestedConfig.isMEI : base.isMEI,
                        // Preserve ID and PrestadorID
                        id: base.id || data.suggestedConfig.id,
                        prestadorId: base.prestadorId || data.suggestedConfig.prestadorId,
                    };
                    return merged;
                });
            } else {
                 // Fallback if backend doesn't support suggestion (older version?)
                 setConfig(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        regimeTributario: data.regime_tributario || prev.regimeTributario,
                        tipoCNPJ: data.opcao_pelo_mei ? 'MEI' : (data.opcao_pelo_simples ? 'EPP' : 'OUTROS'),
                    };
                });
            }

            alert(`Dados encontrados: ${data.razao_social}\nRegime sugerido: ${data.regime_tributario}`);
        } catch (err: any) {
            alert('Erro ao buscar CNPJ: ' + err.message);
        } finally {
            setSearching(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;

        setSaving(true);
        try {
            await apiService.updateFiscalConfig(config);
            alert('Configurações fiscais atualizadas com sucesso!');
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (!certPassword) {
                alert('Por favor, informe a senha do certificado antes de fazer o upload.');
                return;
            }

            setUploading(true);
            try {
                await apiService.uploadCertificate(e.target.files[0], certPassword);
                alert('Certificado digital configurado com sucesso!');
                setCertPassword('');
            } catch (err: any) {
                alert('Erro no upload: ' + err.message);
            } finally {
                setUploading(false);
            }
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12 px-4 md:px-0">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configurações Fiscais</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Gestão Tributária & NFS-e Nacional</p>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Left Column: Regime & CNPJ */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 relative z-10">
                            <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">1</span>
                            Regime Tributário
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">CNPJ da Empresa</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:bg-white"
                                        value={cnpjInput}
                                        onChange={e => setCnpjInput(e.target.value)}
                                        placeholder="00.000.000/0000-00"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleLookupCNPJ}
                                        disabled={searching || !cnpjInput}
                                        className="px-4 md:px-6 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {searching ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        )}
                                        Buscar
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 ml-2">Busque pelo CNPJ para preencher automaticamente.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de CNPJ</label>
                                <select
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:bg-white"
                                    value={config?.tipoCNPJ}
                                    onChange={e => setConfig(prev => prev ? { ...prev, tipoCNPJ: e.target.value as any } : null)}
                                >
                                    <option value="MEI">MEI - Microempreendedor Individual</option>
                                    <option value="ME">ME - Microempresa</option>
                                    <option value="EPP">EPP - Empresa de Pequeno Porte</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Regime Tributário</label>
                                <select
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:bg-white"
                                    value={config?.regimeTributario}
                                    onChange={e => setConfig(prev => prev ? { ...prev, regimeTributario: e.target.value } : null)}
                                >
                                    {regimes.map(r => (
                                        <option key={r.id} value={r.id}>{r.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Natureza da Operação</label>
                                <select
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:bg-white"
                                    value={config?.naturezaOperacao}
                                    onChange={e => setConfig(prev => prev ? { ...prev, naturezaOperacao: e.target.value } : null)}
                                >
                                    <option value="TRIBUTACAO_MUNICIPIO">Tributação no Município</option>
                                    <option value="TRIBUTACAO_FORA_MUNICIPIO">Tributação fora do Município</option>
                                    <option value="ISENCAO">Isenção</option>
                                    <option value="IMUNIDADE">Imunidade</option>
                                    <option value="SUSPENSAO">Suspensão</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Local da Prestação</label>
                                <select
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:bg-white"
                                    value={config?.localPrestacao}
                                    onChange={e => setConfig(prev => prev ? { ...prev, localPrestacao: e.target.value } : null)}
                                >
                                    <option value="LOCAL">No município do prestador</option>
                                    <option value="FORA_MUNICIPIO">Fora do município</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">CNAE Principal</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:bg-white"
                                    value={config?.cnae}
                                    onChange={e => setConfig(prev => prev ? { ...prev, cnae: e.target.value } : null)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cód. Serviço (Default)</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:bg-white"
                                    value={config?.codigoServico}
                                    onChange={e => setConfig(prev => prev ? { ...prev, codigoServico: e.target.value } : null)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Item Lista Serviço</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:bg-white"
                                    value={config?.itemListaServico}
                                    onChange={e => setConfig(prev => prev ? { ...prev, itemListaServico: e.target.value } : null)}
                                />
                            </div>

                            {config?.regimeTributario === 'SIMPLES_NACIONAL' && (
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Faixa Simples Nacional (Anexo III)</label>
                                    <select
                                        className="w-full p-4 bg-blue-50 rounded-2xl font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-blue-100"
                                        value={config?.faixaSimplesNac}
                                        onChange={e => setConfig(prev => prev ? { ...prev, faixaSimplesNac: e.target.value } : null)}
                                    >
                                        <option value="FAIXA_1">Faixa 1 - Até R$ 180.000 (6,0%)</option>
                                        <option value="FAIXA_2">Faixa 2 - Até R$ 360.000 (11,2%)</option>
                                        <option value="FAIXA_3">Faixa 3 - Até R$ 720.000 (13,5%)</option>
                                        <option value="FAIXA_4">Faixa 4 - Até R$ 1.800.000 (16,0%)</option>
                                        <option value="FAIXA_5">Faixa 5 - Até R$ 3.600.000 (21,0%)</option>
                                        <option value="FAIXA_6">Faixa 6 - Até R$ 4.800.000 (33,0%)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tax Rates & Withholdings - Only for Lucro Presumido/Real */}
                    {(config?.regimeTributario === 'LUCRO_PRESUMIDO' || config?.regimeTributario === 'LUCRO_REAL') && (
                        <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-sm">2</span>
                                Alíquotas e Impostos
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ISS Padrão (%)</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={config?.aliquotaISSPadrao}
                                        onChange={e => setConfig(prev => prev ? { ...prev, aliquotaISSPadrao: parseFloat(e.target.value) } : null)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">PIS (%)</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={config?.aliquotaPIS}
                                        onChange={e => setConfig(prev => prev ? { ...prev, aliquotaPIS: parseFloat(e.target.value) } : null)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">COFINS (%)</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={config?.aliquotaCOFINS}
                                        onChange={e => setConfig(prev => prev ? { ...prev, aliquotaCOFINS: parseFloat(e.target.value) } : null)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">CSLL (%)</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={config?.aliquotaCSLL}
                                        onChange={e => setConfig(prev => prev ? { ...prev, aliquotaCSLL: parseFloat(e.target.value) } : null)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">IRPJ (%)</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={config?.aliquotaIRPJ}
                                        onChange={e => setConfig(prev => prev ? { ...prev, aliquotaIRPJ: parseFloat(e.target.value) } : null)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">INSS (%)</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={config?.aliquotaINSS}
                                        onChange={e => setConfig(prev => prev ? { ...prev, aliquotaINSS: parseFloat(e.target.value) } : null)}
                                    />
                                </div>

                                <div className="md:col-span-3 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={config?.issRetido}
                                            onChange={e => setConfig(prev => prev ? { ...prev, issRetido: e.target.checked } : null)}
                                        />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">ISS Retido na Fonte (padrão)</span>
                                    </label>

                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={config?.retemPIS}
                                            onChange={e => setConfig(prev => prev ? { ...prev, retemPIS: e.target.checked } : null)}
                                        />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Reter PIS</span>
                                    </label>

                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={config?.retemCOFINS}
                                            onChange={e => setConfig(prev => prev ? { ...prev, retemCOFINS: e.target.checked } : null)}
                                        />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Reter COFINS</span>
                                    </label>

                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={config?.retemCSLL}
                                            onChange={e => setConfig(prev => prev ? { ...prev, retemCSLL: e.target.checked } : null)}
                                        />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Reter CSLL</span>
                                    </label>

                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={config?.retemIR}
                                            onChange={e => setConfig(prev => prev ? { ...prev, retemIR: e.target.checked } : null)}
                                        />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Reter IR</span>
                                    </label>

                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={config?.retemINSS}
                                            onChange={e => setConfig(prev => prev ? { ...prev, retemINSS: e.target.checked } : null)}
                                        />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Reter INSS</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MEI / Simples Nacional Info Notes */}
                    {config?.regimeTributario === 'MEI' && (
                        <div className="bg-blue-50 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 border border-blue-100">
                             <h3 className="text-lg font-black text-blue-800 mb-2">Regime MEI Ativo</h3>
                             <p className="text-xs text-blue-600 font-bold">
                                Como MEI, você paga um valor fixo mensal (DAS-MEI). Não há destaque de impostos individuais (PIS, COFINS, etc) na NFS-e Nacional para serviços.
                             </p>
                        </div>
                    )}

                    {config?.regimeTributario === 'SIMPLES_NACIONAL' && (
                        <div className="bg-emerald-50 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 border border-emerald-100">
                             <h3 className="text-lg font-black text-emerald-800 mb-2">Regime Simples Nacional</h3>
                             <p className="text-xs text-emerald-600 font-bold">
                                Os impostos são pagos de forma unificada no DAS. A alíquota é baseada na sua faixa de faturamento dos últimos 12 meses.
                             </p>
                        </div>
                    )}
                </div>

                {/* Right Column: Certificate & Environment */}
                <div className="space-y-6 md:space-y-8">
                    {/* Digital Certificate */}
                    <div className="bg-slate-900 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 blur-[60px] rounded-full"></div>

                        <h3 className="text-lg font-black mb-6 flex items-center gap-3 relative z-10">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            Certificado A1
                        </h3>

                        <div className="space-y-4 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Senha do Certificado</label>
                                <input
                                    type="password"
                                    className="w-full p-4 bg-white/5 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                                    value={certPassword}
                                    onChange={e => setCertPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>

                            <label className={`w-full p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${uploading ? 'bg-white/5 border-white/10 opacity-50' : 'bg-white/5 border-white/20 hover:border-blue-500 hover:bg-white/10'}`}>
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {uploading ? 'Enviando...' : 'Selecionar Arquivo .pfx / .p12'}
                                </span>
                                <input type="file" className="hidden" accept=".pfx,.p12" onChange={handleCertUpload} disabled={uploading} />
                            </label>

                            <p className="text-[9px] text-slate-500 font-medium text-center leading-relaxed">
                                O certificado A1 é necessário para a assinatura digital das notas via GOV.BR Nacional.
                            </p>
                        </div>
                    </div>

                    {/* Environment */}
                    <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100">
                        <h3 className="text-lg font-black text-slate-800 mb-6">Ambiente API</h3>

                        <div className="space-y-4">
                            <button
                                type="button"
                                onClick={() => setConfig(prev => prev ? { ...prev, ambiente: 'HOMOLOGACAO' } : null)}
                                className={`w-full p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 transition-all ${config?.ambiente === 'HOMOLOGACAO' ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-lg shadow-amber-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                Homologação (Testes)
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfig(prev => prev ? { ...prev, ambiente: 'PRODUCAO' } : null)}
                                className={`w-full p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 transition-all ${config?.ambiente === 'PRODUCAO' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                Produção (Real)
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-5 md:py-6 bg-blue-600 text-white font-black rounded-2xl md:rounded-[2rem] uppercase tracking-[0.2em] text-xs shadow-2xl shadow-blue-600/40 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </form>
        </div>
    );
};
