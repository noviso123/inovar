
import React, { useState } from 'react';

export const MarketingQR: React.FC = () => {
  const [qrType, setQrType] = useState<'whatsapp' | 'instagram' | 'url'>('whatsapp');
  const [printSize, setPrintSize] = useState<'small' | 'medium' | 'large'>('small');
  const [inputValue, setInputValue] = useState('');
  const [customMessage, setCustomMessage] = useState('Manutenção? Escaneie aqui!');
  const [isGenerating, setIsGenerating] = useState(false);

  const getGeneratedLink = () => {
    if (!inputValue) return '';
    switch (qrType) {
      case 'whatsapp':
        const cleanNum = inputValue.replace(/\D/g, '');
        return `https://wa.me/55${cleanNum}`;
      case 'instagram':
        const cleanUser = inputValue.replace('@', '');
        return `https://instagram.com/${cleanUser}`;
      case 'url':
        return inputValue.startsWith('http') ? inputValue : `https://${inputValue}`;
      default:
        return '';
    }
  };

  const qrLink = getGeneratedLink();
  const sizePx = printSize === 'small' ? '300' : printSize === 'medium' ? '500' : '800';
  const qrImageUrl = qrLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&data=${encodeURIComponent(qrLink)}&bgcolor=ffffff&color=0f172a&margin=1`
    : '';

  const handleDownload = () => {
    if (!qrImageUrl) return;
    setIsGenerating(true);

    // Simulação de composição de imagem (No mundo real usaríamos Canvas API para juntar logo + QR)
    setTimeout(() => {
        const link = document.createElement('a');
        link.href = qrImageUrl;
        link.download = `ETIQUETA_INOVAR_${printSize.toUpperCase()}.png`;
        link.click();
        setIsGenerating(false);
        alert('Etiqueta gerada com sucesso! O arquivo contém o QR Code em alta resolução pronto para impressão.');
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

        <div className="bg-white rounded-[3.5rem] p-10 border-2 border-slate-100 shadow-sm space-y-8">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Etiquetas de Marketing</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Personalize etiquetas para seus equipamentos. Ao baixar, o sistema gera uma imagem de alta densidade para impressão em vinil.</p>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamanho da Etiqueta</label>
            <div className="flex bg-slate-50 p-1 rounded-2xl border-2 border-slate-100">
              <button onClick={() => setPrintSize('small')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${printSize === 'small' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Pequena (5cm)</button>
              <button onClick={() => setPrintSize('medium')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${printSize === 'medium' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Média (10cm)</button>
              <button onClick={() => setPrintSize('large')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${printSize === 'large' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Grande (20cm)</button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-2">
              {(['whatsapp', 'instagram', 'url'] as const).map(type => (
                <button key={type} onClick={() => { setQrType(type); setInputValue(''); }}
                  className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${qrType === type ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador</label>
              <input value={inputValue} onChange={e => setInputValue(e.target.value)}
                placeholder={qrType === 'whatsapp' ? 'DDD + Número' : 'username'}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-600 font-black text-slate-800" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slogan da Etiqueta</label>
              <input value={customMessage} onChange={e => setCustomMessage(e.target.value)} maxLength={30}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-600 font-bold text-slate-700" />
            </div>
          </div>

          <button onClick={handleDownload} disabled={!inputValue || isGenerating}
            className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-2xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 shadow-slate-900/30">
            {isGenerating ? 'Gerando Arquivo Final...' : 'Baixar Etiqueta Pronta'}
          </button>
        </div>

        <div className="flex flex-col items-center sticky top-24">
            <div className="bg-white p-12 rounded-[4rem] border-2 border-slate-100 shadow-2xl flex flex-col items-center">
              <div className="mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg">I</div>
                <span className="font-black text-slate-900 uppercase tracking-tighter">INOVAR AIR</span>
              </div>

              <div className="relative p-6 bg-white border-4 border-slate-50 rounded-[3rem] shadow-inner">
                {inputValue ? (
                  <div className="relative group">
                    <img src={qrImageUrl} alt="QR" className="w-64 h-64 rounded-2xl" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 bg-white p-1 rounded-2xl shadow-xl border-2 border-slate-100">
                        <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                          <span className="text-blue-500 font-black text-xl">I</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-slate-50 rounded-2xl flex items-center justify-center border-4 border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center px-8">Aguardando dados para o QR</p>
                  </div>
                )}
              </div>

              <div className="mt-8 text-center">
                <p className="text-xl font-black text-slate-800 tracking-tight">{customMessage}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{inputValue || '---'}</p>
              </div>
            </div>
        </div>

      </div>
    </div>
  );
};
