import React from 'react';
import { useNavigate } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
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
                    <h2 className="text-xl font-black text-slate-800">Privacidade</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Termos e Condições
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 prose prose-slate max-w-none">
                <h3 className="font-black text-slate-800">Política de Privacidade</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                    A sua privacidade é importante para nós. É política do Inovar Gestão respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site Inovar Gestão, e outros sites que possuímos e operamos.
                </p>

                <h4 className="font-bold text-slate-800 mt-6">1. Informações que coletamos</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                    Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
                </p>

                <h4 className="font-bold text-slate-800 mt-6">2. Uso de Dados</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                    Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
                </p>

                <h4 className="font-bold text-slate-800 mt-6">3. Compartilhamento</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                    Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.
                </p>
            </div>
        </div>
    );
};
