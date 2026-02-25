import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/shared/services/apiService';
import { Eye, EyeOff } from 'lucide-react';

export const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Token de recuperação inválido ou expirado.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiService.resetPassword(token!, password);
            if (response.success) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(response.message || 'Erro ao redefinir senha');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao processar solicitação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-12 duration-1000">
                {/* Logo */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-emerald-600/30">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">Nova Senha</h1>
                    <p className="text-slate-400 text-sm font-medium">Defina sua nova senha de acesso</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl">
                    {success ? (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">Senha Alterada!</h3>
                                <p className="text-slate-500 text-sm">Você será redirecionado para o login em instantes...</p>
                            </div>
                            <div className="w-8 h-8 border-4 border-slate-300 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold">
                                    {error}
                                </div>
                            )}

                            {!token ? (
                                <div className="text-center py-4">
                                    <Link
                                        to="/forgot-password"
                                        className="text-cyan-600 hover:text-cyan-700 font-bold text-sm"
                                    >
                                        Solicitar novo link de recuperação →
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                                            Nova Senha
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:outline-none font-bold text-slate-800 transition-all pr-14"
                                                placeholder="••••••"
                                                disabled={loading}
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                                            Confirmar Senha
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                required
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:outline-none font-bold text-slate-800 transition-all pr-14"
                                                placeholder="••••••"
                                                disabled={loading}
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Salvando...
                                            </>
                                        ) : (
                                            'Definir Nova Senha'
                                        )}
                                    </button>
                                </>
                            )}

                            <Link
                                to="/login"
                                className="block text-center text-sm font-bold text-slate-500 hover:text-cyan-600 transition-colors"
                            >
                                ← Voltar ao Login
                            </Link>
                        </form>
                    )}
                </div>

                <p className="text-center mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                    © 2026 INOVAR • Todos os direitos reservados
                </p>
            </div>
        </div>
    );
};
