
import React, { useState, useEffect } from 'react';

interface SignaturePadProps {
  companyName?: string;
  onSave: (signatureData: string) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ companyName = 'Inovar Air', onSave }) => {
  const [signed, setSigned] = useState(false);
  const [geo, setGeo] = useState<string>('Obtendo localização...');

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeo(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`),
        () => setGeo('GPS Indisponível')
      );
    }
  }, []);

  return (
    <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-2xl relative overflow-hidden text-left">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 blur-3xl rounded-full"></div>

      <div className="mb-8">
        <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Assinatura Biométrica Digital</h5>
        <h4 className="text-xl font-black text-slate-800 tracking-tight">Aceite de Termos e Condições</h4>
      </div>

      <div
        className={`w-full h-56 bg-slate-50 border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-crosshair group relative transition-all ${signed ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-blue-300'}`}
        onClick={() => setSigned(true)}
      >
        {signed ? (
          <div className="text-center animate-in fade-in zoom-in duration-500">
            <div className="text-slate-900 font-serif text-5xl italic mb-4 tracking-tighter opacity-80">
               {companyName}
            </div>
            <div className="space-y-1">
               <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Documento Assinado Digitalmente</p>
               <p className="text-[8px] font-mono text-slate-400">GPS: {geo} | DATA: {new Date().toISOString()}</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4 shadow-sm group-hover:text-blue-500 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
             </div>
             <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Clique aqui para assinar o termo</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <p className="text-[8px] text-slate-400 font-medium max-w-[200px] leading-relaxed italic">
          Ao assinar, o cliente declara estar ciente dos serviços realizados e da garantia legal de 90 dias.
        </p>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => setSigned(false)}
            className="flex-1 sm:flex-none px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
          >
            Limpar
          </button>
          <button
            disabled={!signed}
            onClick={() => onSave('signature_payload_signed')}
            className="flex-1 sm:flex-none px-10 py-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl disabled:opacity-20 shadow-xl hover:bg-emerald-600 transition-all active:scale-95"
          >
            Finalizar Protocolo
          </button>
        </div>
      </div>
    </div>
  );
};
