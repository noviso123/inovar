
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, Company } from '@/shared/types';
import { imageUploadService } from '@/shared/services/imageUploadService';
import { apiService } from '@/shared/services/apiService';

interface CompanyProfileProps {
  currentUser: User;
}

export const CompanyProfile: React.FC<CompanyProfileProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fiscal Config State
  const [fiscalConfig, setFiscalConfig] = useState<any>(null);
  const [certPassword, setCertPassword] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);

  const [formData, setFormData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    logoUrl: ''
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
          address: data.address || (data.endereco ? `${data.endereco.street}, ${data.endereco.number} - ${data.endereco.district}, ${data.endereco.city}/${data.endereco.state}` : ''),
          logoUrl: data.logoUrl || ''
        });

        // Load fiscal config
        try {
          const fiscal = await apiService.getFiscalConfig();
          setFiscalConfig(fiscal);
        } catch (e) {
          console.warn('Fiscal config not found or error', e);
        }

      } catch (err: any) {
        console.error('Failed to load company:', err);
        setError(err.message || 'Erro ao carregar dados da empresa');
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!imageUploadService.isValidImage(file)) {
        alert('Selecione uma imagem válida (JPG, PNG) até 32MB.');
        return;
      }

      setUploading(true);
      try {
        const response = await imageUploadService.uploadFile(file, `logo-${currentUser.companyId}`);
        if (response.success) {
          setFormData(prev => ({ ...prev, logoUrl: response.data.url }));
        }
      } catch (err) {
        console.error('Upload failed', err);
        alert('Erro ao fazer upload.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!certPassword) {
        alert('Por favor, informe a senha do certificado antes de selecionar o arquivo.');
        e.target.value = ''; // Reset input
        return;
      }

      setUploadingCert(true);
      try {
        const result = await apiService.uploadCertificate(file, certPassword);
        alert('Certificado enviado com sucesso!');
        setCertPassword('');
        // Reload fiscal config to show updated status
        const fiscal = await apiService.getFiscalConfig();
        setFiscalConfig(fiscal);
      } catch (err: any) {
        console.error('Cert upload failed', err);
        alert(err.message || 'Erro ao enviar certificado.');
      } finally {
        setUploadingCert(false);
        e.target.value = ''; // Reset input
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
        logoUrl: formData.logoUrl
      });

      setCompany({
        ...company!,
        ...formData
      });
      setIsEditing(false);
      alert('Empresa atualizada com sucesso!');
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
          <p className="text-slate-400 text-sm font-medium">Carregando empresa...</p>
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

  return (
    <div className="animate-in fade-in duration-500 pb-8">
      {/* Back Button */}
      <div className="flex items-center gap-4 mb-4 -mt-2">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-slate-800">Minha Empresa</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dados do Prestador</p>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 pb-20 pt-12 px-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full"></div>
        <div className="relative z-10 flex items-center gap-6">
          {/* Logo with upload */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl border-4 border-white/20 shadow-xl overflow-hidden bg-white">
              {uploading ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-100">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-cyan-600 font-black bg-cyan-50">
                  {formData.nomeFantasia?.charAt(0)?.toUpperCase() || 'E'}
                </div>
              )}
              <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
              </label>
            </div>
          </div>
          {/* Info */}
          <div className="text-white flex-1">
            <h2 className="text-xl font-black tracking-tight">{formData.nomeFantasia || 'Minha Empresa'}</h2>
            <p className="text-xs text-white/60 font-medium">{formData.razaoSocial || 'Razão Social'}</p>
            {formData.cnpj && <p className="text-[10px] text-white/40 font-bold mt-1">CNPJ: {formData.cnpj}</p>}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="px-0 -mt-12 relative z-20 space-y-4">
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Informações da Empresa</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-xs text-slate-400 font-bold">E-mail</span>
              <span className="text-sm text-slate-800 font-bold">{formData.email || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-xs text-slate-400 font-bold">Telefone</span>
              <span className="text-sm text-slate-800 font-bold">{formData.phone || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-slate-400 font-bold">Endereço</span>
              <span className="text-sm text-slate-800 font-bold text-right max-w-[60%]">{formData.address || '-'}</span>
            </div>
          </div>
        </div>

        {/* Fiscal Configuration Link */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 flex items-center justify-between">
          <div>
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Área Fiscal (NFS-e)</h4>
             <p className="text-sm font-bold text-slate-700">Configurar Certificado e Impostos</p>
          </div>
          <button
            onClick={() => navigate('/prestador/fiscal')}
             className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs uppercase tracking-wider"
          >
            Acessar
          </button>
        </div>
      </div>

      {/* Edit Button */}
      <div className="mt-6">
        <button
          onClick={() => navigate('editar')}
          className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-slate-900/30 hover:bg-emerald-600 transition-colors"
        >
          Editar Dados da Empresa
        </button>
      </div>
    </div>
  );
};
