
import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export const QRCodeGenerator: React.FC = () => {
  const [qrType, setQrType] = useState<'whatsapp' | 'instagram' | 'url'>('whatsapp');
  const [printSize, setPrintSize] = useState<'small' | 'medium' | 'large'>('small');
  const [inputValue, setInputValue] = useState('');
  const [customMessage, setCustomMessage] = useState('Manutenção? Escaneie aqui!');
  const [isGenerating, setIsGenerating] = useState(false);

  // Ref to the QR code canvas component to extract image data
  const qrRef = useRef<HTMLCanvasElement>(null);

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

  // Handle high-res download using Canvas API
  const handleDownload = async (format: 'png' | 'pdf' = 'png') => {
    if (!qrLink || !qrRef.current) return;
    setIsGenerating(true);

    try {
      // Create a temporary high-res canvas for the final tag
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Define dimensions (High DPI for print)
      const scale = printSize === 'small' ? 1 : printSize === 'medium' ? 2 : 3;
      const width = 600 * scale;
      const height = 800 * scale;

      canvas.width = width;
      canvas.height = height;

      // 1. Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 2. Border
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 20 * scale;
      ctx.strokeRect(0, 0, width, height);

      // 3. Header / Logo Area
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, 180 * scale);

      // Draw Logo Text
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${40 * scale}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('INOVAR AIR', width / 2, 90 * scale);

      // 4. QR Code
      const qrSize = 350 * scale;
      const qrX = (width - qrSize) / 2;
      const qrY = 220 * scale;

      if (qrRef.current) {
        ctx.drawImage(qrRef.current, qrX, qrY, qrSize, qrSize);
      }

      // 5. Custom Message (Slogan)
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${32 * scale}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(customMessage, width / 2, qrY + qrSize + (80 * scale));

      // 6. Identifier (Link/Phone)
      ctx.fillStyle = '#64748b';
      ctx.font = `bold ${24 * scale}px "Inter", sans-serif`;
      ctx.fillText(inputValue || '---', width / 2, qrY + qrSize + (130 * scale));

      // 7. Footer
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, height - (40 * scale), width, 40 * scale);

      const fileName = `ETIQUETA_INOVAR_${printSize.toUpperCase()}`;

      if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [width, height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save(`${fileName}.pdf`);
      } else {
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      }

      setIsGenerating(false);
    } catch (err) {
      console.error('Generation failed', err);
      alert('Erro ao gerar etiqueta');
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

        <div className="bg-white rounded-[3.5rem] p-10 border-2 border-slate-100 shadow-sm space-y-8">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Gerador de QR Code</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Personalize etiquetas para seus equipamentos. Ao baixar, o sistema gera uma imagem de alta densidade para impressão.</p>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamanho de Impressão</label>
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino (Link/Número)</label>
              <input value={inputValue} onChange={e => setInputValue(e.target.value)}
                placeholder={qrType === 'whatsapp' ? 'DDD + Número' : qrType === 'instagram' ? 'username' : 'https://...'}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-600 font-black text-slate-800" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensagem na Etiqueta</label>
              <input value={customMessage} onChange={e => setCustomMessage(e.target.value)} maxLength={30}
                placeholder="Ex: Agende sua limpeza!"
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-600 font-bold text-slate-700" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleDownload('png')} disabled={!inputValue || isGenerating}
              className="py-6 bg-slate-900 text-white font-black rounded-3xl shadow-2xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-[9px] flex items-center justify-center gap-3 active:scale-95 shadow-slate-900/30">
              {isGenerating ? '...' : 'Baixar PNG'}
            </button>
            <button onClick={() => handleDownload('pdf')} disabled={!inputValue || isGenerating}
              className="py-6 bg-blue-600 text-white font-black rounded-3xl shadow-2xl hover:bg-blue-700 transition-all uppercase tracking-widest text-[9px] flex items-center justify-center gap-3 active:scale-95 shadow-blue-600/30">
              {isGenerating ? '...' : 'Baixar PDF'}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center sticky top-24">
            <div className="bg-white p-12 rounded-[4rem] border-2 border-slate-100 shadow-2xl flex flex-col items-center w-full max-w-sm">
              <div className="mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg">I</div>
                <span className="font-black text-slate-900 uppercase tracking-tighter">INOVAR AIR</span>
              </div>

              <div className="relative p-6 bg-white border-4 border-slate-50 rounded-[3rem] shadow-inner mb-6">
                {inputValue ? (
                  <div className="bg-white rounded-xl">
                   <QRCodeCanvas
                      ref={qrRef}
                      value={qrLink}
                      size={200}
                      level="H"
                      includeMargin={true}
                      imageSettings={{
                        src: "/favicon.svg", // Use favicon as center logo
                        x: undefined,
                        y: undefined,
                        height: 40,
                        width: 40,
                        excavate: true,
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] bg-slate-50 rounded-2xl flex items-center justify-center border-4 border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center px-8">Aguardando dados...</p>
                  </div>
                )}
              </div>

              <div className="text-center w-full">
                <p className="text-xl font-black text-slate-800 tracking-tight break-words">{customMessage}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 truncate max-w-full">{inputValue || '---'}</p>
              </div>

              <div className="w-full h-2 bg-blue-500 rounded-full mt-8 opacity-20"></div>
            </div>

            <p className="mt-8 text-center text-xs text-slate-400 font-medium max-w-xs">
              ⓘ O arquivo baixado terá alta resolução ({printSize === 'small' ? '600x800' : printSize === 'medium' ? '1200x1600' : '1800x2400'}px) ideal para impressão.
            </p>
        </div>

      </div>
    </div>
  );
};
