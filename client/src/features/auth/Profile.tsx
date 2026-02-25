import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '@/shared/types';
import { imageUploadService } from '@/shared/services/imageUploadService';
import { apiService } from '@/shared/services/apiService';

interface ProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
  rolePrefix?: string;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, rolePrefix = 'prestador' }) => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
    companyLogoUrl: ''
  });

  // Sync form with user prop
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
        companyLogoUrl: user.companyId ? '' : '' // Will fetch or use from context if available
      });
    }
  }, [user]);

  // Load company logo if applicable
  useEffect(() => {
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.PRESTADOR)) {
      apiService.getCompany().then(config => {
        if (config && config.logoUrl) {
          setFormData(prev => ({ ...prev, companyLogoUrl: config.logoUrl }));
        }
      });
    }
  }, [user]);

  // Defensive check
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm font-medium">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validation handled by enhanced service

      setUploading(true);
      try {
        const response = await imageUploadService.uploadFile(file, `avatar-${user.id}`, 'hd');
        if (response.success) {
          const newUrl = response.data.url;
          setFormData(prev => ({ ...prev, avatarUrl: newUrl }));
          // Update user immediately
          const updatedUser = { ...user, avatarUrl: newUrl };
          onUpdateUser(updatedUser);
          // Persist to backend
          await apiService.updateProfile({ avatarUrl: newUrl });
        }
      } catch (err) {
        console.error('Upload failed', err);
        alert('Erro ao fazer upload.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validation handled by enhanced service

      setLogoUploading(true);
      try {
        const response = await imageUploadService.uploadFile(file, `logo-${user.companyId || 'company'}`, 'logo');
        if (response.success) {
          const newUrl = response.data.url;
          setFormData(prev => ({ ...prev, companyLogoUrl: newUrl }));
          // Update company config on backend
          await apiService.updateCompany({ logoUrl: newUrl });
          alert('Logo da empresa atualizada com sucesso!');
        }
      } catch (err) {
        console.error('Logo upload failed', err);
        alert('Erro ao fazer upload da logo.');
      } finally {
        setLogoUploading(false);
      }
    }
  };

  const getRoleName = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'Administrador';
      case UserRole.PRESTADOR: return 'Prestador';
      case UserRole.TECNICO: return 'Técnico';
      case UserRole.CLIENTE: return 'Cliente';
      default: return 'Usuário';
    }
  };

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
          <h2 className="text-xl font-black text-slate-800">Meu Perfil</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{getRoleName(user.role)}</p>
        </div>
      </div>

      {/* Dark Header */}
      <div className="bg-slate-900 pb-20 pt-12 px-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full"></div>
        <div className="relative z-10 flex items-center gap-6">
          {/* Avatar with upload */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-slate-800 shadow-xl overflow-hidden bg-slate-800">
              {uploading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-slate-600 font-black">
                  {formData.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
          </div>
          {/* Info */}
          <div className="text-white">
            <h2 className="text-2xl font-black tracking-tight">{formData.name?.split(' ')[0] || 'Usuário'}</h2>
            <p className="text-xs text-slate-400 font-medium">{formData.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-blue-600/30 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
              {getRoleName(user.role)}
            </span>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="mt-4 space-y-3">
        {[
          { label: 'Editar Perfil', icon: 'edit', action: () => navigate(`/${rolePrefix}/perfil/editar`) },
          { label: 'Notificações', icon: 'bell', action: () => navigate(`/${rolePrefix}/notificacoes`) },
          { label: 'Privacidade', icon: 'shield', action: () => navigate(`/${rolePrefix}/privacidade`) },
          { label: 'Ajuda', icon: 'help', action: () => navigate(`/${rolePrefix}/ajuda`) },
        ].map((item, i) => (
          <button key={i} onClick={item.action} className="w-full bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all text-left group active:scale-[0.98]">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              {item.icon === 'edit' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
              {item.icon === 'bell' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
              {item.icon === 'shield' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
              {item.icon === 'help' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            </div>
            <span className="font-bold text-slate-700 text-sm flex-1">{item.label}</span>
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        ))}
      </div>

      <div className="text-center mt-12 text-[10px] font-black text-slate-300 uppercase tracking-widest">
        Versão 7.1.0
      </div>
    </div>
  );
};
