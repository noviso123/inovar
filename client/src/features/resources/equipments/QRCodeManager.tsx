import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Equipment } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { QRCodeCanvas } from 'qrcode.react';
import { Search, ArrowLeft, Monitor, Sparkles, Printer } from 'lucide-react';

type QRMode = 'assets' | 'custom';

export const QRCodeManager: React.FC = () => {
    const navigate = useNavigate();

    // UI State
    const [activeTab, setActiveTab] = useState<QRMode>('assets');
    const [loading, setLoading] = useState(true);

    // Assets Data
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [clients, setClients] = useState<any[]>([]);

    // Legacy Generator State (2 weeks ago)
    const [qrType, setQrType] = useState<'whatsapp' | 'instagram' | 'url'>('whatsapp');
    const [printSize, setPrintSize] = useState<'small' | 'medium' | 'large'>('small');
    const [inputValue, setInputValue] = useState('');
    const [customMessage, setCustomMessage] = useState('Manutenção? Escaneie aqui!');
    const [isGenerating, setIsGenerating] = useState(false);
    const qrRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [equipsData, clientsData] = await Promise.all([
                apiService.getEquipments(),
                apiService.getClients()
            ]);

            const enriched = equipsData.map((e: any) => ({
                ...e,
                clientName: clientsData.find((c: any) => c.id === e.clientId)?.name || 'Cliente Desconhecido'
            }));

            setEquipments(enriched);
            setClients(clientsData);
        } catch (err) {
            console.error('Failed to load QR code data', err);
        } finally {
            setLoading(false);
        }
    };

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

    const handleDownload = async (format: 'png' | 'pdf' = 'png') => {
        if (!qrLink || !qrRef.current) return;
        setIsGenerating(true);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // --- EXTREME QUALITY SETTINGS ---
            const scale = printSize === 'small' ? 3 : printSize === 'medium' ? 6 : 10; // High DPI (up to 6000px height)
            const width = 600 * scale;
            const height = 800 * scale;

            canvas.width = width;
            canvas.height = height;

            // Enable high quality image smoothing for crisp edges
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

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

            // Draw Logo Text (Crisp Typography)
            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${40 * scale}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('INOVAR REFRIGERAÇÃO', width / 2, 90 * scale);

            // 4. QR Code (HDR Rendering)
            const qrSize = 350 * scale;
            const qrX = (width - qrSize) / 2;
            const qrY = 220 * scale;

            // Draw the QR base from the reference (will be smooth but we'll improve the logo)
            ctx.drawImage(qrRef.current, qrX, qrY, qrSize, qrSize);

            // --- HDR LOGO INJECTION ---
            // Bypass low-res preview and draw logo directly at high resolution
            try {
                const logoImg = new Image();
                logoImg.src = "/logo.png";
                await new Promise((resolve, reject) => {
                    logoImg.onload = resolve;
                    logoImg.onerror = reject;
                });

                const logoSize = qrSize * 0.22;
                const logoX = qrX + (qrSize - logoSize) / 2;
                const logoY = qrY + (qrSize - logoSize) / 2;

                // Create a crisp white background for the logo
                ctx.fillStyle = '#ffffff';
                const padding = 4 * scale;
                ctx.fillRect(logoX - padding, logoY - padding, logoSize + (padding * 2), logoSize + (padding * 2));

                // Draw high-res logo
                ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
            } catch (err) {
                console.warn("High-res logo failed, using QR default", err);
            }

            // 5. Custom Message
            ctx.fillStyle = '#0f172a';
            ctx.font = `bold ${32 * scale}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(customMessage, width / 2, qrY + qrSize + (100 * scale));

            // 6. Footer
            ctx.fillStyle = '#3d6b8c';
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
            setIsGenerating(false);
        }
    };

    const filteredEquipments = equipments.filter(e => {
        const matchesSearch =
            e.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClient = filterClient ? e.clientId === filterClient : true;
        return matchesSearch && matchesClient;
    });

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-20 px-2 md:px-6 max-w-[1920px] mx-auto">
            {/* Header - Hidden on print */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden pt-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">QR Codes</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Identificação e Marketing</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'assets' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        <Monitor className="w-4 h-4 mb-1 mx-auto" />
                        Ativos
                    </button>
                    <button
                        onClick={() => setActiveTab('custom')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        <Sparkles className="w-4 h-4 mb-1 mx-auto" />
                        Marketing
                    </button>
                </div>
            </div>

            {activeTab === 'assets' ? (
                <>
                    <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 print:hidden">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por marca, modelo ou série..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                className="bg-slate-50 border-transparent rounded-xl text-sm font-medium px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 appearance-none flex-1 md:min-w-[200px]"
                                value={filterClient}
                                onChange={(e) => setFilterClient(e.target.value)}
                            >
                                <option value="">Todos os Clientes</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={() => window.print()} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                            <Printer className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase">Imprimir Tudo</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 print:grid-cols-3 print:gap-4 print:pt-4">
                        {filteredEquipments.map((e) => (
                            <div key={e.id} className="bg-white p-5 md:p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col items-center text-center space-y-4 print:border-slate-300 print:break-inside-avoid shadow-sm hover:shadow-md transition-all">
                                <div className="w-full text-left">
                                    <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1 truncate">{(e as any).clientName}</p>
                                    <h4 className="text-base font-black text-slate-800 leading-tight truncate">{e.brand}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{e.model}</p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl print:bg-white relative w-full flex justify-center">
                                    <QRCodeCanvas
                                        ref={qrRef}
                                        value={`${window.location.origin}/open-request/${e.id}`}
                                        size={140}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>

                                <div className="w-full space-y-1">
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                                        <span>Localização</span>
                                        <span className="text-slate-800">{e.location}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                                        <span>Série</span>
                                        <span className="text-slate-800">{e.serialNumber || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-700 text-left">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
                        {/* Settings Panel */}
                        <div className="lg:col-span-5 bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-10 border-2 border-slate-100 shadow-sm space-y-6 md:space-y-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Gerador de Marketing</h3>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">Personalize etiquetas para seus equipamentos. Alta densidade para impressão.</p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamanho de Impressão</label>
                                <div className="flex bg-slate-50 p-1 rounded-2xl border-2 border-slate-100 overflow-x-auto no-scrollbar">
                                    {(['small', 'medium', 'large'] as const).map(size => (
                                        <button key={size} onClick={() => setPrintSize(size)} className={`flex-1 py-3 px-2 min-w-[80px] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${printSize === size ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
                                            {size === 'small' ? 'Pequena' : size === 'medium' ? 'Média' : 'Grande'}
                                        </button>
                                    ))}
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
                                        className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl outline-none focus:border-blue-600 font-black text-slate-800" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensagem na Etiqueta</label>
                                    <input value={customMessage} onChange={e => setCustomMessage(e.target.value)} maxLength={30}
                                        placeholder="Ex: Agende sua limpeza!"
                                        className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl outline-none focus:border-blue-600 font-bold text-slate-700" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => handleDownload('png')} disabled={!inputValue || isGenerating}
                                    className="py-5 md:py-6 bg-slate-900 text-white font-black rounded-2xl md:rounded-3xl shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-[9px] flex items-center justify-center gap-3 active:scale-95">
                                    {isGenerating ? '...' : 'Baixar PNG'}
                                </button>
                                <button onClick={() => handleDownload('pdf')} disabled={!inputValue || isGenerating}
                                    className="py-5 md:py-6 bg-blue-600 text-white font-black rounded-2xl md:rounded-3xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-[9px] flex items-center justify-center gap-3 active:scale-95">
                                    {isGenerating ? '...' : 'Baixar PDF'}
                                </button>
                            </div>
                        </div>

                        {/* Preview Panel */}
                        <div className="lg:col-span-7 flex flex-col items-center sticky top-24 w-full">
                            <div className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border-2 border-slate-100 shadow-2xl flex flex-col items-center w-full max-w-2xl">
                                <div className="mb-6 md:mb-8 flex items-center gap-3">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg flex items-center justify-center bg-[#0f172a] text-white overflow-hidden">
                                        <div className="bg-[#3d6b8c] w-full h-full flex items-center justify-center text-[8px] md:text-[10px] font-black">LOGO</div>
                                    </div>
                                    <span className="font-black text-slate-900 uppercase tracking-tighter text-sm md:text-lg">INOVAR REFRIGERAÇÃO</span>
                                </div>

                                <div className="relative p-6 md:p-10 bg-white border-4 border-slate-50 rounded-[2.5rem] md:rounded-[3.5rem] shadow-inner mb-6 w-full flex justify-center max-w-md">
                                    {inputValue ? (
                                        <div className="bg-white rounded-xl">
                                            <QRCodeCanvas
                                                ref={qrRef}
                                                value={qrLink}
                                                size={window.innerWidth < 768 ? 200 : 300}
                                                level="H"
                                                includeMargin={true}
                                                imageSettings={{
                                                    src: "/logo.png",
                                                    x: undefined,
                                                    y: undefined,
                                                    height: window.innerWidth < 768 ? 45 : 65,
                                                    width: window.innerWidth < 768 ? 45 : 65,
                                                    excavate: true,
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-[200px] h-[200px] md:w-[300px] md:h-[300px] bg-slate-50 rounded-2xl flex items-center justify-center border-4 border-dashed border-slate-200">
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center px-8">Aguardando dados...</p>
                                        </div>
                                    )}
                                </div>

                                <div className="text-center w-full">
                                    <p className="text-xl md:text-3xl font-black text-slate-800 tracking-tight break-words">{customMessage}</p>
                                </div>

                                <div className="w-full h-2 bg-blue-500 rounded-full mt-8 opacity-20"></div>
                            </div>

                            <p className="mt-8 text-center text-xs text-slate-400 font-medium max-w-xs">
                                ⓘ O arquivo baixado terá alta resolução ideal para impressão.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body { background: white !important; margin: 0 !important; }
                    #root > div > main { padding: 0 !important; margin: 0 !important; }
                    .print\\:hidden { display: none !important; }
                    .grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 10mm !important; }
                    .grid > div { border: 1px solid #ddd !important; break-inside: avoid !important; }
                    @page { size: A4; margin: 10mm; }
                }
            ` }} />
        </div>
    );
};
