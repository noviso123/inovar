
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<any>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar login com Google');
    }
  };

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
            <input
              id="password-input"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-cyan-500 focus:outline-none font-black text-slate-800 transition-all"
              placeholder="••••••"
              disabled={loading}
            />
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest">Ou continue com</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-4 bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all hover:border-slate-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </button>

        </form>

        {/* Footer */}
        <p className="text-center mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
          © 2026 INOVAR • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};
