import React from 'react';
import { useNavigate } from 'react-router-dom';

export const HelpPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="animate-in fade-in duration-500 pb-8">
            <div className="flex items-center gap-4 mb-4 -mt-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1">
                    <h2 className="text-xl font-black text-slate-800">Ajuda</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Suporte e FAQ
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                    <h3 className="font-black text-slate-800 mb-4">Perguntas Frequentes</h3>

                    <div className="space-y-4">
                        <details className="group">
                            <summary className="flex justify-between items-center font-bold cursor-pointer list-none text-slate-700">
                                <span>Como abrir um chamado?</span>
                                <span className="transition group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <p className="text-slate-500 text-sm mt-3 group-open:animate-fadeIn">
                                Vá até a aba "Chamados" e clique no botão "+ Criar Chamado". Preencha os detalhes e selecione o equipamento.
                            </p>
                        </details>

                        <div className="h-px bg-slate-100"></div>

                        <details className="group">
                            <summary className="flex justify-between items-center font-bold cursor-pointer list-none text-slate-700">
                                <span>Como alterar minha senha?</span>
                                <span className="transition group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <p className="text-slate-500 text-sm mt-3 group-open:animate-fadeIn">
                                No momento, entre em contato com o administrador para redefinir sua senha. Em breve teremos uma opção direta no perfil.
                            </p>
                        </details>

                        <div className="h-px bg-slate-100"></div>

                        <details className="group">
                            <summary className="flex justify-between items-center font-bold cursor-pointer list-none text-slate-700">
                                <span>O sistema funciona offline?</span>
                                <span className="transition group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <p className="text-slate-500 text-sm mt-3 group-open:animate-fadeIn">
                                Não, é necessária uma conexão ativa com a internet para acessar os dados em tempo real.
                            </p>
                        </details>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-xl text-center text-white">
                    <h3 className="font-black text-lg mb-2">Ainda precisa de ajuda?</h3>
                    <p className="text-slate-400 text-sm mb-6">Entre em contato com nosso suporte técnico.</p>
                    <a href="mailto:suporte@inovar.com" className="inline-block px-8 py-3 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-cyan-500 hover:text-white transition-colors">
                        Falar com Suporte
                    </a>
                </div>
            </div>
        </div>
    );
};
