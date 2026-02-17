
import React, { useState } from 'react';
import { SignaturePad } from './SignaturePad';

interface ClientApprovalProps {
  onApprove: (comment: string) => void;
  onDispute: (reason: string) => void;
}

export const ClientApproval: React.FC<ClientApprovalProps> = ({ onApprove, onDispute }) => {
  const [comment, setComment] = useState('');
  const [showSignature, setShowSignature] = useState(false);

  if (showSignature) {
    return (
      <div className="animate-in zoom-in duration-500">
        <SignaturePad onSave={() => onApprove(comment)} />
      </div>
    );
  }

  return (
    <div className="bg-emerald-50 rounded-[3rem] p-10 border-2 border-emerald-100 animate-in zoom-in duration-500">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-white shadow-xl shadow-emerald-200">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-2">Serviço Concluído</h3>
        <p className="text-slate-500 font-medium max-w-xs mx-auto">Por favor, confirme se o atendimento foi realizado conforme o esperado.</p>
      </div>

      <div className="space-y-6">
        <textarea 
          placeholder="Deixe um comentário sobre o atendimento..."
          className="w-full h-32 p-6 bg-white border-2 border-emerald-100 rounded-[2rem] outline-none focus:border-emerald-500 transition-all font-medium text-slate-700 resize-none"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        
        <div className="flex gap-4">
          <button 
            onClick={() => onDispute(comment)}
            className="flex-1 py-4 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-2xl"
          >
            Contestar Serviço
          </button>
          <button 
            onClick={() => setShowSignature(true)}
            className="flex-[2] py-4 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-200"
          >
            Avançar para Assinatura
          </button>
        </div>
      </div>
    </div>
  );
};
