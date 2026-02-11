import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { supabase } from '../services/supabase';

/**
 * GoogleAuthCallback - Receives the JWT token from the backend Google OAuth redirect.
 * URL: /auth/callback?token=xxx
 * Stores the token and redirects to the dashboard.
 */
export const GoogleAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!data.session) {
          setError('Sessão não encontrada. Tente fazer login novamente.');
          return;
        }

        const token = data.session.access_token;
        apiService.setAccessToken(token);

        // SYNC GOOGLE TOKENS (For Calendar Sync)
        const providerToken = (data.session as any).provider_token;
        const providerRefreshToken = (data.session as any).provider_refresh_token;
        const expiresAt = data.session.expires_at;

        if (providerToken) {
          console.log('🔄 Syncing Google tokens with backend...');
          try {
            await apiService.syncGoogleTokens({
              accessToken: providerToken,
              refreshToken: providerRefreshToken,
              expiresAt: expiresAt
            });
            console.log('✅ Google tokens synced successfully');
          } catch (syncErr) {
            console.error('⚠️ Failed to sync Google tokens:', syncErr);
            // We don't block the login if sync fails, but it's noted
          }
        }

        try {
          const profile = await apiService.getCurrentUser();
          if (profile) {
            localStorage.setItem('currentUser', JSON.stringify(profile));
            window.location.href = '/';
          } else {
            setError('Falha ao carregar perfil do usuário no sistema.');
          }
        } catch (err: any) {
          console.error('Profile sync error:', err);
          setError('Erro ao sincronizar perfil: ' + (err.message || 'Verifique se sua conta está ativa.'));
          localStorage.removeItem('accessToken');
        }
      } catch (err: any) {
        console.error('Supabase Callback Error:', err);
        setError(err.message || 'Erro ao processar login com Google.');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Erro no Login</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24">
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
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Conectando com Google...</h2>
        <p className="text-sm text-slate-500">Aguarde enquanto processamos seu login.</p>
      </div>
    </div>
  );
};
