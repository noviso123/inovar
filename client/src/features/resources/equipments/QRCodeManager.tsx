import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Equipment } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Printer, Search, ArrowLeft, SlidersHorizontal, Plus, Trash2, Smartphone, Instagram, Globe, AlignLeft, LayoutGrid, Sparkles, Download, MessageCircle } from 'lucide-react';

type QRMode = 'assets' | 'custom';
type CustomQRType = 'whatsapp' | 'instagram' | 'url' | 'text';

interface CustomSticker {
    id: string;
    type: CustomQRType;
    title: string;
    subtitle: string;
    footerMessage: string;
    content: string;
    value: string;
}

export const QRCodeManager: React.FC = () => {
    const navigate = useNavigate();

    // UI State
    const [activeTab, setActiveTab] = useState<QRMode>('assets');
    const [loading, setLoading] = useState(true);
    const [printingId, setPrintingId] = useState<string | null>(null);

    // Assets Data
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [clients, setClients] = useState<any[]>([]);

    // Custom QR State
    const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);
    const [newSticker, setNewSticker] = useState<Partial<CustomSticker>>({
        type: 'url',
        title: '',
        subtitle: '',
        footerMessage: ''
    });
    const [formValues, setFormValues] = useState({
        phone: '',
        message: '',
        igUser: '',
        url: '',
        text: ''
    });

    const stickerRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [equipsData, clientsData, customData] = await Promise.all([
                apiService.getEquipments(),
                apiService.getClients(),
                apiService.getCustomQRs()
            ]);

            const enriched = equipsData.map((e: any) => ({
                ...e,
                clientName: clientsData.find((c: any) => c.id === e.clientId)?.name || 'Cliente Desconhecido'
            }));

            setEquipments(enriched);
            setClients(clientsData);
            setCustomStickers(customData);
        } catch (err) {
            console.error('Failed to load QR code data', err);
        } finally {
            setLoading(false);
        }
    };

    const generateQRValue = () => {
        const { phone, message, igUser, url, text } = formValues;
        switch (newSticker.type) {
            case 'whatsapp':
                const cleanPhone = phone.replace(/\D/g, '');
                return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            case 'instagram':
                const cleanUser = igUser.replace('@', '');
                return `https://instagram.com/${cleanUser}`;
            case 'url':
                return url.startsWith('http') ? url : `https://${url}`;
            case 'text':
                return text;
            default:
                return '';
        }
    };

    const addCustomSticker = async () => {
        if (!newSticker.title || !generateQRValue()) return;

        try {
            const stickerData = {
                type: newSticker.type as CustomQRType,
                title: newSticker.title!,
                subtitle: newSticker.subtitle || '',
                footerMessage: newSticker.footerMessage || '',
                content: generateQRValue(),
                value: generateQRValue()
            };

            const savedSticker = await apiService.createCustomQR(stickerData);
            setCustomStickers([savedSticker, ...customStickers]);

            // Reset form
            setFormValues({ phone: '', message: '', igUser: '', url: '', text: '' });
            setNewSticker({ type: 'url', title: '', subtitle: '', footerMessage: '' });
        } catch (err) {
            console.error('Failed to save sticker', err);
        }
    };

    const removeCustomSticker = async (id: string) => {
        try {
            await apiService.deleteCustomQR(id);
            setCustomStickers(customStickers.filter(s => s.id !== id));
        } catch (err) {
            console.error('Failed to delete sticker', err);
        }
    };

    const downloadPNG = async (id: string, title: string) => {
        const node = stickerRefs.current[id];
        if (!node) return;

        try {
            const dataUrl = await toPng(node, {
                pixelRatio: 4, // Ultra high quality
                backgroundColor: '#ffffff'
            });
            const link = document.createElement('a');
            link.download = `sticker-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Download failed', err);
        }
    };

    const printIndividual = (id: string) => {
        setPrintingId(id);
        setTimeout(() => {
            window.print();
            setPrintingId(null);
        }, 300);
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

    const handlePrintAll = () => {
        setPrintingId(null);
        window.print();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
            {/* Header - Hidden on print */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gerador de QR Codes</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Identificação de Ativos e Marketing</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'assets' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        <LayoutGrid className="w-4 h-4 mb-1 mx-auto" />
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
                    {/* Assets Filters */}
                    <div className="bg-white p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 print:hidden">
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
                            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                            <select
                                className="bg-slate-50 border-transparent rounded-xl text-sm font-medium px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 appearance-none min-w-[200px]"
                                value={filterClient}
                                onChange={(e) => setFilterClient(e.target.value)}
                            >
                                <option value="">Todos os Clientes</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handlePrintAll}
                            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-blue-600 transition-colors"
                            title="Imprimir Selecionados"
                        >
                            <Printer className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="py-20 text-center">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Ativos...</p>
                        </div>
                    )}

                    {/* Stickers Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 print:grid-cols-3 print:gap-4 print:pt-4">
                        {filteredEquipments.map((e) => (
                            <div key={e.id} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-100 flex flex-col items-center text-center space-y-4 transition-all group print:border-slate-300 print:p-4 print:break-inside-avoid">
                                <div className="w-full text-left">
                                    <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1 truncate">{(e as any).clientName}</p>
                                    <h4 className="text-base font-black text-slate-800 leading-tight truncate">{e.brand}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{e.model}</p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl print:bg-white print:p-2">
                                    <QRCodeSVG
                                        value={`${window.location.origin}/open-request/${e.id}`}
                                        size={120}
                                        level="H"
                                        includeMargin={true}
                                        className="mx-auto"
                                    />
                                </div>

                                <div className="w-full space-y-1">
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                                        <span>Localização</span>
                                        <span className="text-slate-800">{e.location}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                                        <span>Nº de Série</span>
                                        <span className="text-slate-800">{e.serialNumber || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Custom Form */}
                    <div className="lg:col-span-1 space-y-6 print:hidden">
                        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" />
                                Nova Etiqueta
                            </h3>

                            {/* Type Selector */}
                            <div className="grid grid-cols-4 gap-2">
                                {(['whatsapp', 'instagram', 'url', 'text'] as CustomQRType[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setNewSticker(prev => ({ ...prev, type: t }))}
                                        className={`h-12 rounded-xl flex items-center justify-center transition-all ${newSticker.type === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                        title={t}
                                    >
                                        {t === 'whatsapp' && <Smartphone className="w-5 h-5" />}
                                        {t === 'instagram' && <Instagram className="w-5 h-5" />}
                                        {t === 'url' && <Globe className="w-5 h-5" />}
                                        {t === 'text' && <AlignLeft className="w-5 h-5" />}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Título Principal (ex: Inovar Gestão)"
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newSticker.title || ''}
                                    onChange={e => setNewSticker(prev => ({ ...prev, title: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    placeholder="Subtítulo (ex: @inovar_sistema)"
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newSticker.subtitle || ''}
                                    onChange={e => setNewSticker(prev => ({ ...prev, subtitle: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    placeholder="Mensagem de Marketing (abaixo do QR)"
                                    className="w-full px-4 py-3 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700"
                                    value={newSticker.footerMessage || ''}
                                    onChange={e => setNewSticker(prev => ({ ...prev, footerMessage: e.target.value }))}
                                />

                                {newSticker.type === 'whatsapp' && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <input
                                            type="text"
                                            placeholder="WhatsApp (ex: 11999999999)"
                                            className="w-full px-4 py-3 bg-blue-50/50 rounded-xl text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formValues.phone}
                                            onChange={e => setFormValues(prev => ({ ...prev, phone: e.target.value }))}
                                        />
                                        <textarea
                                            placeholder="Mensagem Pré-definida"
                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none h-20"
                                            value={formValues.message}
                                            onChange={e => setFormValues(prev => ({ ...prev, message: e.target.value }))}
                                        />
                                    </div>
                                )}

                                {newSticker.type === 'instagram' && (
                                    <input
                                        type="text"
                                        placeholder="Usuário Instagram (ex: inovar.sistema)"
                                        className="w-full px-4 py-3 bg-pink-50/50 rounded-xl text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none animate-in slide-in-from-top-2"
                                        value={formValues.igUser}
                                        onChange={e => setFormValues(prev => ({ ...prev, igUser: e.target.value }))}
                                    />
                                )}

                                {newSticker.type === 'url' && (
                                    <input
                                        type="text"
                                        placeholder="Link do Site (ex: inovar.com)"
                                        className="w-full px-4 py-3 bg-blue-50/50 rounded-xl text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none animate-in slide-in-from-top-2"
                                        value={formValues.url}
                                        onChange={e => setFormValues(prev => ({ ...prev, url: e.target.value }))}
                                    />
                                )}

                                {newSticker.type === 'text' && (
                                    <textarea
                                        placeholder="Texto ou Código Livre"
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none h-32 animate-in slide-in-from-top-2"
                                        value={formValues.text}
                                        onChange={e => setFormValues(prev => ({ ...prev, text: e.target.value }))}
                                    />
                                )}

                                <button
                                    onClick={addCustomSticker}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                                >
                                    Gerar Etiqueta
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stickers Preview/List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between print:hidden">
                             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Etiquetas Criadas ({customStickers.length})</h3>
                             {customStickers.length > 0 && (
                                 <button onClick={handlePrintAll} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                                     <Printer className="w-4 h-4" /> Imprimir Folha Completa
                                 </button>
                             )}
                        </div>

                        {customStickers.length === 0 ? (
                            <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 print:hidden">
                                <Sparkles className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold">Crie etiquetas de marketing para seus clientes.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:grid-cols-1">
                                {customStickers.map(s => {
                                    // Logic to show only one during individual print
                                    const isVisible = printingId ? printingId === s.id : true;
                                    if (!isVisible) return null;

                                    return (
                                        <div
                                            key={s.id}
                                            ref={el => stickerRefs.current[s.id] = el}
                                            className={`relative bg-white p-8 rounded-[2rem] border-2 border-slate-100 flex flex-col items-center text-center space-y-4 print:border-slate-300 print:p-6 print:break-inside-avoid print:shadow-none ${printingId === s.id ? 'print:block' : ''}`}
                                        >
                                            <div className="absolute top-4 right-4 flex gap-1 print:hidden">
                                                <button
                                                    onClick={() => downloadPNG(s.id, s.title)}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                    title="Download PNG"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => printIndividual(s.id)}
                                                    className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                                    title="Imprimir"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => removeCustomSticker(s.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="w-full">
                                                 <div className="flex items-center justify-center gap-2 mb-1">
                                                     {s.type === 'whatsapp' && <MessageCircle className="w-3 h-3 text-emerald-500" />}
                                                     {s.type === 'instagram' && <Instagram className="w-3 h-3 text-pink-500" />}
                                                     {s.type === 'url' && <Globe className="w-3 h-3 text-blue-500" />}
                                                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{s.type}</span>
                                                 </div>
                                                 <h4 className="text-xl font-black text-slate-800 leading-tight">{s.title}</h4>
                                                 {s.subtitle && <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{s.subtitle}</p>}
                                            </div>

                                            <div className="bg-white p-2 rounded-3xl group-hover:scale-105 transition-transform">
                                                 <QRCodeSVG
                                                    value={s.value}
                                                    size={160}
                                                    level="H"
                                                    includeMargin={true}
                                                    className="mx-auto"
                                                />
                                            </div>

                                            {s.footerMessage && (
                                                <div className="w-full bg-blue-600 py-3 px-4 rounded-2xl shadow-lg shadow-blue-100">
                                                     <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{s.footerMessage}</p>
                                                </div>
                                            )}

                                            <div className="w-full pt-2 text-center opacity-30">
                                                 <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Gerado por Inovar Gestão</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Print CSS - Logic for A4 vs Individual */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body { background: white !important; margin: 0 !important; }
                    #root > div > div { padding: 0 !important; margin: 0 !important; }
                    .print\\:hidden { display: none !important; }

                    /* If printing individual, center it */
                    ${printingId ? `
                        .grid {
                            display: flex !important;
                            justify-content: center !important;
                            align-items: center !important;
                            height: 100vh !important;
                        }
                        .grid > div {
                            width: 80mm !important;
                            border: 2px solid #ccc !important;
                        }
                    ` : `
                        .grid {
                            display: grid !important;
                            grid-template-columns: repeat(3, 1fr) !important;
                            gap: 10mm !important;
                            visibility: visible !important;
                        }
                        .grid > div {
                            visibility: visible !important;
                            border: 1px solid #eee !important;
                            break-inside: avoid !important;
                        }
                    `}

                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                }
            ` }} />
        </div>
    );
};
