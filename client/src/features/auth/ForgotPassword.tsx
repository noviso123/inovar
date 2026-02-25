import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '@/shared/services/apiService';

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.forgotPassword(email);
            if (response.success) {
                setSuccess(true);
            } else {
                setError(response.message || 'Erro ao enviar e-mail');
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
                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-cyan-600/30">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">Recuperar Senha</h1>
                    <p className="text-slate-400 text-sm font-medium">Enviaremos um link para redefinir sua senha</p>
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
                                <h3 className="text-xl font-black text-slate-800 mb-2">E-mail Enviado!</h3>
                                <p className="text-slate-500 text-sm">
                                    Verifique sua caixa de entrada em <strong className="text-slate-800">{email}</strong>
                                </p>
                            </div>
                            <Link
                                to="/login"
                                className="block w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-center uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors"
                            >
                                Voltar ao Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                                    E-mail Cadastrado
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-cyan-500 focus:outline-none font-bold text-slate-800 transition-all"
                                    placeholder="seu@email.com"
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-slate-900 hover:bg-cyan-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Enviando...
                                    </>
                                ) : (
                                    'Enviar Link de Recuperação'
                                )}
                            </button>

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
