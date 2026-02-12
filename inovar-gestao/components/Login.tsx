
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<any>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-fixed bg-center flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-0"></div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-12 duration-1000 relative z-10">
        {/* Logo - AC Unit Icon */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 glass-panel rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)] border border-cyan-500/30">
            {/* AC Unit Icon */}
            <svg className="w-14 h-14 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="14" rx="2" strokeWidth="2" />
              <circle cx="9" cy="11" r="4" strokeWidth="2" />
              <circle cx="9" cy="11" r="1.5" strokeWidth="1" />
              <path strokeLinecap="round" strokeWidth="1.5" d="M9 7v8M5 11h8M6.2 8.2l5.6 5.6M11.8 8.2l-5.6 5.6" />
              <path strokeLinecap="round" strokeWidth="2" d="M16 8h3M16 11h3M16 14h3" />
              <path strokeWidth="2" d="M5 18v2M19 18v2" />
            </svg>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2 drop-shadow-xl">INOVAR</h1>
          <p className="text-cyan-400 font-bold tracking-[0.4em] uppercase text-[10px] drop-shadow-md">Gestão de Climatização</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-panel !bg-slate-900/60 rounded-[3rem] p-10 shadow-2xl shadow-black/50 space-y-6 border border-white/10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-2xl text-sm font-bold animate-in shake duration-300">
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
              className="w-full px-6 py-4 rounded-2xl bg-slate-900/50 border-2 border-slate-700/50 focus:border-cyan-500 focus:outline-none font-black text-white placeholder-slate-600 transition-all focus:bg-slate-900/80"
              placeholder="seu@email.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password-input" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
              Senha de Acesso
            </label>
            <input
              id="password-input"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-slate-900/50 border-2 border-slate-700/50 focus:border-cyan-500 focus:outline-none font-black text-white placeholder-slate-600 transition-all focus:bg-slate-900/80"
              placeholder="••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-2xl shadow-xl shadow-cyan-600/20 uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/10"
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

        </form>

        {/* Footer */}
        <p className="text-center mt-8 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
          © 2026 INOVAR • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};
