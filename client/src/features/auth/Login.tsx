import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<any>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await onLogin(email, password);
      if (!response.success) {
        setError(response.message || 'Credenciais inválidas');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-12 duration-1000">
        {/* Logo - AC Unit Icon */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-cyan-600/30">
            {/* AC Unit Icon */}
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="14" rx="2" strokeWidth="2" />
              <circle cx="9" cy="11" r="4" strokeWidth="2" />
              <circle cx="9" cy="11" r="1.5" strokeWidth="1" />
              <path strokeLinecap="round" strokeWidth="1.5" d="M9 7v8M5 11h8M6.2 8.2l5.6 5.6M11.8 8.2l-5.6 5.6" />
              <path strokeLinecap="round" strokeWidth="2" d="M16 8h3M16 11h3M16 14h3" />
              <path strokeWidth="2" d="M5 18v2M19 18v2" />
            </svg>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">INOVAR</h1>
          <p className="text-cyan-400 font-bold tracking-[0.4em] uppercase text-[10px]">Gestão de Climatização</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] p-10 shadow-2xl space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold animate-in shake duration-300">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="email-input" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
              E-mail Operacional
            </label>
            <input
              id="email-input"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-cyan-500 focus:outline-none font-black text-slate-800 transition-all"
              placeholder="seu@email.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password-input" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
              Senha de Acesso
            </label>
            <div className="relative group">
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-cyan-500 focus:outline-none font-black text-slate-800 transition-all pr-14"
                placeholder="••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-cyan-500 transition-colors"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-slate-900 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-slate-900/30 uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Entrando...
              </>
            ) : (
              'Acessar Sistema'
            )}
          </button>

          <div className="pt-4 text-center">
            <Link
              to="/register"
              className="w-full py-4 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02] active:scale-95 border border-cyan-500/20 hover:border-cyan-500 flex items-center justify-center gap-2 group"
            >
              <span>Criar minha conta de cliente</span>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
          © 2026 INOVAR • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};
