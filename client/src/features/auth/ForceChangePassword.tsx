import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/shared/services/apiService';
import { Eye, EyeOff } from 'lucide-react';

interface ForceChangePasswordProps {
    onLogout: () => void;
    onUpdateUser: (user: any) => void;
}

export const ForceChangePassword: React.FC<ForceChangePasswordProps> = ({ onLogout, onUpdateUser }) => {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError('As novas senhas não coincidem');
            return;
        }

        if (newPassword.length < 6) {
            setError('A nova senha deve ter no mínimo 6 caracteres');
            return;
        }

        if (currentPassword === newPassword) {
            setError('A nova senha não pode ser igual à senha atual');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await apiService.changePassword(currentPassword, newPassword);

            // Refresh user profile to get updated mustChangePassword status (should be false now)
            try {
                const updatedUser = await apiService.getCurrentUser();
                // Update local user state
                onUpdateUser(updatedUser);
            } catch (userErr) {
                console.error("Failed to refresh user profile", userErr);
            }

            // Navigate to dashboard
             // The parent App component should handle the redirect based on the updated user state,
             // but we can force a reload or navigate to root to trigger the check.
             // Best practice: Reload the window to ensure clean state or navigate to root.
             window.location.href = '/';

        } catch (err: any) {
            setError(err.message || 'Erro ao alterar senha');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-12 duration-1000">
                {/* Logo */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-amber-600/30">
                         <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">Alteração Obrigatória</h1>
                    <p className="text-slate-400 text-sm font-medium">Por segurança, você deve alterar sua senha temporária.</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold animate-in shake duration-300">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                                Senha Atual (Temporária)
                            </label>
                            <div className="relative group">
                                <input
                                    type={showCurrentPassword ? "text" : "password"}
                                    required
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:outline-none font-bold text-slate-800 transition-all pr-14"
                                    placeholder="••••••"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-amber-500 transition-colors"
                                >
                                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                                Nova Senha
                            </label>
                            <div className="relative group">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    required
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:outline-none font-bold text-slate-800 transition-all pr-14"
                                    placeholder="••••••"
                                    disabled={loading}
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-amber-500 transition-colors"
                                >
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                                Confirmar Nova Senha
                            </label>
                            <div className="relative group">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:outline-none font-bold text-slate-800 transition-all pr-14"
                                    placeholder="••••••"
                                    disabled={loading}
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-amber-500 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl shadow-xl shadow-amber-600/20 uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Alterando...
                                </>
                            ) : (
                                'Alterar Senha e Entrar'
                            )}
                        </button>

                         <button
                            type="button"
                            onClick={onLogout}
                            disabled={loading}
                            className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors"
                        >
                            Cancelar e Sair
                        </button>
                    </form>
                </div>
                 <p className="text-center mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                    © 2026 INOVAR • Todos os direitos reservados
                </p>
            </div>
        </div>
    );
};
