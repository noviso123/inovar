
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '@/shared/services/apiService';
import { ArrowLeft, User, MapPin, Wind, CheckCircle2, ChevronRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    document: '',
    endereco: {
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      zipCode: ''
    },
    equipBrand: '',
    equipModel: '',
    equipBTU: 9000
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCEP = async (cep: string) => {
    if (cep.replace(/\D/g, '').length === 8) {
      try {
        const data = await apiService.searchCEP(cep);
        setFormData(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            street: data.logradouro,
            district: data.bairro,
            city: data.localidade,
            state: data.uf,
            zipCode: cep
          }
        }));
      } catch (err) {
        console.error('CEP error:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.register(formData);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[3rem] p-12 text-center shadow-2xl animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">CADASTRO REALIZADO!</h2>
          <p className="text-slate-600 font-bold mb-8">Bem-vindo à Inovar. Estamos redirecionando você para o login...</p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full animate-[progress_3s_linear]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 ">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : navigate('/login')}
            className="w-12 h-12 glass-light rounded-2xl flex items-center justify-center text-white hover:scale-110 transition-all border border-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-right">
             <h1 className="text-2xl font-black text-white tracking-widest uppercase">Cadastro</h1>
             <p className="text-cyan-400 text-[10px] font-black tracking-widest">PASSO {step} DE 3</p>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'flex-[2] bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'flex-1 bg-white/10'}`}
            />
          ))}
        </div>

        {/* Form Container */}
        <div className="glass rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in shake">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); setStep(step + 1); }} className="space-y-6">

            {/* STEP 1: PERSONAL DATA */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/30">
                     <User size={24} />
                   </div>
                   <div>
                     <h3 className="text-white font-black uppercase tracking-widest text-sm">Dados Pessoais</h3>
                     <p className="text-slate-400 text-xs">Comece criando sua conta de acesso</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF ou CNPJ</label>
                        <input
                          type="text"
                          name="document"
                          required
                          value={formData.document}
                          onChange={handleChange}
                          className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                          placeholder="000.000.000-00"
                        />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sua Senha</label>
                        <div className="relative group">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all pr-14"
                            placeholder="••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                        <div className="relative group">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all pr-14"
                            placeholder="••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                             className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ADDRESS */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30">
                     <MapPin size={24} />
                   </div>
                   <div>
                     <h3 className="text-white font-black uppercase tracking-widest text-sm">Localização</h3>
                     <p className="text-slate-400 text-xs">Onde as máquinas estão instaladas?</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CEP</label>
                      <input
                        type="text"
                        name="endereco.zipCode"
                        required
                        value={formData.endereco.zipCode}
                        onChange={(e) => { handleChange(e); handleCEP(e.target.value); }}
                        className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                      <input
                        type="text"
                        name="endereco.city"
                        required
                        value={formData.endereco.city}
                        onChange={handleChange}
                        className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                      <input
                        type="text"
                        name="endereco.street"
                        required
                        value={formData.endereco.street}
                        onChange={handleChange}
                        className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº</label>
                      <input
                        type="text"
                        name="endereco.number"
                        required
                        value={formData.endereco.number}
                        onChange={handleChange}
                        className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                    <input
                      type="text"
                      name="endereco.district"
                      required
                      value={formData.endereco.district}
                      onChange={handleChange}
                      className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: EQUIPMENT */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                     <Wind size={24} />
                   </div>
                   <div>
                     <h3 className="text-white font-black uppercase tracking-widest text-sm">Equipamento</h3>
                     <p className="text-slate-400 text-xs">Cadastre seu primeiro ar-condicionado</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
                    <input
                      type="text"
                      name="equipBrand"
                      required
                      value={formData.equipBrand}
                      onChange={handleChange}
                      className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                      placeholder="Ex: Samsung, LG, Gree"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo / Identificação</label>
                    <input
                      type="text"
                      name="equipModel"
                      required
                      value={formData.equipModel}
                      onChange={handleChange}
                      className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all"
                      placeholder="Ex: Sala 01, Inverter 12k"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Potência (BTUs)</label>
                    <select
                      name="equipBTU"
                      required
                      value={formData.equipBTU}
                      onChange={handleChange}
                      className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-white font-bold transition-all appearance-none"
                    >
                      <option value={7500} className="bg-slate-800">7.500 BTUs</option>
                      <option value={9000} className="bg-slate-800">9.000 BTUs</option>
                      <option value={12000} className="bg-slate-800">12.000 BTUs</option>
                      <option value={18000} className="bg-slate-800">18.000 BTUs</option>
                      <option value={24000} className="bg-slate-800">24.000 BTUs</option>
                      <option value={30000} className="bg-slate-800">30.000 BTUs</option>
                      <option value={60000} className="bg-slate-800">60.000 BTUs</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION BUTTON */}
            <div className="pt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-2xl shadow-xl shadow-cyan-900/20 uppercase tracking-[0.2em] text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {step === 3 ? 'Finalizar Cadastro' : 'Próxima Etapa'}
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
          INOVAR • SISTEMA DE GESTÃO PROFISSIONAL
        </p>
      </div>
    </div>
  );
};
