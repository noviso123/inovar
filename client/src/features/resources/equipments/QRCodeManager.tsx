import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Equipment } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { QRCodeSVG } from 'qrcode.react';
import { toPng, toSvg } from 'html-to-image';
import {
    Printer, Search, ArrowLeft, SlidersHorizontal, Plus, Trash2,
    Smartphone, Instagram, Globe, AlignLeft, LayoutGrid, Sparkles,
    Download, MessageCircle, Palette, Monitor, Shield, FileCode
} from 'lucide-react';

type QRMode = 'assets' | 'custom';
type CustomQRType = 'whatsapp' | 'instagram' | 'url' | 'text';
type LayoutType = 'marketing' | 'asset' | 'minimal';

interface CustomSticker {
    id: string;
    type: CustomQRType;
    title: string;
    subtitle: string;
    footerMessage: string;
    primaryColor: string;
    secondaryColor: string;
    layoutType: LayoutType;
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
        layoutType: 'marketing',
        primaryColor: '#2563eb',
        secondaryColor: '#ffffff',
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
                primaryColor: newSticker.primaryColor || '#2563eb',
                secondaryColor: newSticker.secondaryColor || '#ffffff',
                layoutType: newSticker.layoutType || 'marketing',
                content: generateQRValue(),
                value: generateQRValue()
            };

            const savedSticker = await apiService.createCustomQR(stickerData);
            setCustomStickers([savedSticker, ...customStickers]);

            // Reset form
            setFormValues({ phone: '', message: '', igUser: '', url: '', text: '' });
            setNewSticker({
                type: 'url',
                layoutType: 'marketing',
                primaryColor: '#2563eb',
                secondaryColor: '#ffffff',
                title: '', subtitle: '', footerMessage: ''
            });
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

    const exportSticker = async (id: string, title: string, format: 'png' | 'svg') => {
        const node = stickerRefs.current[id];
        if (!node) return;

        try {
            const options = {
                pixelRatio: 4,
                backgroundColor: 'transparent'
            };

            const dataUrl = format === 'png' ? await toPng(node, options) : await toSvg(node, options);
            const link = document.createElement('a');
            link.download = `sticker-${title.toLowerCase().replace(/\s+/g, '-')}.${format}`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error(`Export ${format} failed`, err);
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

    // Helper to render premium QR
    const PremiumQR = ({ value, color, size = 160 }: { value: string, color: string, size?: number }) => (
        <div className="relative group">
            <QRCodeSVG
                value={value}
                size={size}
                level="H"
                includeMargin={true}
                fgColor={color}
                className="mx-auto"
            />
        </div>
    );

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
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                             QR Code Creator
                             <span className="bg-blue-600 text-[8px] text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Premium v2</span>
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Identidade e Marketing Inteligente</p>
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
                            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                            <Printer className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase hidden md:inline">Imprimir Tudo</span>
                        </button>
                    </div>

                    {/* Stickers Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 print:grid-cols-3 print:gap-4 print:pt-4">
                        {filteredEquipments.map((e) => (
                            <div key={e.id} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-100 flex flex-col items-center text-center space-y-4 transition-all group print:border-slate-300 print:p-4 print:break-inside-avoid">
                                <div className="w-full text-left">
                                    <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1 truncate">{(e as any).clientName}</p>
                                    <h4 className="text-base font-black text-slate-800 leading-tight truncate">{e.brand}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{e.model}</p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl print:bg-white print:p-2 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <PremiumQR
                                        value={`${window.location.origin}/open-request/${e.id}`}
                                        color="#0f172a"
                                        size={120}
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Custom Form - Left Side */}
                    <div className="lg:col-span-4 space-y-6 print:hidden">
                        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" />
                                Customização Pro
                            </h3>

                            {/* Type Selector */}
                            <div className="flex gap-2 p-1 bg-slate-50 rounded-xl">
                                {(['whatsapp', 'instagram', 'url', 'text'] as CustomQRType[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setNewSticker(prev => ({ ...prev, type: t }))}
                                        className={`flex-1 h-10 rounded-lg flex items-center justify-center transition-all ${newSticker.type === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {t === 'whatsapp' && <Smartphone className="w-4 h-4" />}
                                        {t === 'instagram' && <Instagram className="w-4 h-4" />}
                                        {t === 'url' && <Globe className="w-4 h-4" />}
                                        {t === 'text' && <AlignLeft className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>

                            {/* Theme & Layout Selector */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layout do Adesivo</label>
                                    <LayoutGrid className="w-4 h-4 text-slate-300" />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['marketing', 'asset', 'minimal'] as LayoutType[]).map(l => (
                                        <button
                                            key={l}
                                            onClick={() => setNewSticker(prev => ({ ...prev, layoutType: l }))}
                                            className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all border-2 ${newSticker.layoutType === l ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cor Principal</label>
                                         <div className="flex items-center gap-2">
                                             <input
                                                type="color"
                                                className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                                                value={newSticker.primaryColor}
                                                onChange={e => setNewSticker(prev => ({ ...prev, primaryColor: e.target.value }))}
                                            />
                                            <span className="text-xs font-mono text-slate-400 uppercase">{newSticker.primaryColor}</span>
                                         </div>
                                    </div>
                                    <div className="flex-1">
                                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fundo</label>
                                         <div className="flex items-center gap-2">
                                             <input
                                                type="color"
                                                className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                                                value={newSticker.secondaryColor}
                                                onChange={e => setNewSticker(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                            />
                                            <span className="text-xs font-mono text-slate-400 uppercase">{newSticker.secondaryColor}</span>
                                         </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Título Principal"
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all"
                                    value={newSticker.title || ''}
                                    onChange={e => setNewSticker(prev => ({ ...prev, title: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    placeholder="Subtítulo ou Link visível"
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all"
                                    value={newSticker.subtitle || ''}
                                    onChange={e => setNewSticker(prev => ({ ...prev, subtitle: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    placeholder="Mensagem Impactante (Footer)"
                                    className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 text-blue-700 font-bold rounded-xl text-sm focus:bg-white outline-none transition-all"
                                    value={newSticker.footerMessage || ''}
                                    onChange={e => setNewSticker(prev => ({ ...prev, footerMessage: e.target.value }))}
                                />

                                {newSticker.type === 'whatsapp' && (
                                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl animate-in slide-in-from-top-2">
                                        <input
                                            type="text"
                                            placeholder="WhatsApp com DDD"
                                            className="w-full px-4 py-2.5 bg-white rounded-lg text-sm border-slate-200 outline-none"
                                            value={formValues.phone}
                                            onChange={e => setFormValues(prev => ({ ...prev, phone: e.target.value }))}
                                        />
                                        <textarea
                                            placeholder="Mensagem do Link"
                                            className="w-full px-4 py-2.5 bg-white rounded-lg text-sm border-slate-200 outline-none h-16"
                                            value={formValues.message}
                                            onChange={e => setFormValues(prev => ({ ...prev, message: e.target.value }))}
                                        />
                                    </div>
                                )}

                                {newSticker.type === 'instagram' && (
                                    <input
                                        type="text"
                                        placeholder="Seu @usuário"
                                        className="w-full px-4 py-3 bg-pink-50 text-pink-700 font-bold rounded-xl text-sm border-transparent focus:bg-white outline-none animate-in slide-in-from-top-2"
                                        value={formValues.igUser}
                                        onChange={e => setFormValues(prev => ({ ...prev, igUser: e.target.value }))}
                                    />
                                )}

                                {newSticker.type === 'url' && (
                                    <input
                                        type="text"
                                        placeholder="https://seu-site.com"
                                        className="w-full px-4 py-3 bg-blue-50 text-blue-700 font-bold rounded-xl text-sm border-transparent focus:bg-white outline-none animate-in slide-in-from-top-2"
                                        value={formValues.url}
                                        onChange={e => setFormValues(prev => ({ ...prev, url: e.target.value }))}
                                    />
                                )}

                                <button
                                    onClick={addCustomSticker}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95"
                                >
                                    Criar Sticker Premium
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stickers Display - Center/Right */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between print:hidden">
                             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Galeria de Design ({customStickers.length})</h3>
                             {customStickers.length > 0 && (
                                 <button onClick={handlePrintAll} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 transition-transform">
                                     <Printer className="w-4 h-4" /> Imprimir Folha A4
                                 </button>
                             )}
                        </div>

                        {customStickers.length === 0 ? (
                            <div className="py-32 text-center bg-slate-50 rounded-[3.5rem] border-4 border-dashed border-slate-100 print:hidden group">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-10 h-10 text-blue-600" />
                                </div>
                                <h4 className="text-xl font-black text-slate-800">Crie seu primeiro adesivo!</h4>
                                <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2">Escolha cores, layouts e gere artes incríveis para o seu negócio.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-1">
                                {customStickers.map(s => {
                                    const isVisible = printingId ? printingId === s.id : true;
                                    if (!isVisible) return null;

                                    return (
                                        <div
                                            key={s.id}
                                            className="group relative animate-in zoom-in-95 duration-300"
                                        >
                                            {/* Action Buttons - Floating Container */}
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-10 print:hidden scale-90 group-hover:scale-100">
                                                <button onClick={() => exportSticker(s.id, s.title, 'png')} className="p-2.5 bg-white text-blue-600 rounded-xl shadow-xl hover:bg-blue-600 hover:text-white transition-all" title="PNG Alta"><Download className="w-4 h-4" /></button>
                                                <button onClick={() => exportSticker(s.id, s.title, 'svg')} className="p-2.5 bg-white text-emerald-600 rounded-xl shadow-xl hover:bg-emerald-600 hover:text-white transition-all" title="SVG Vetor"><FileCode className="w-4 h-4" /></button>
                                                <button onClick={() => printIndividual(s.id)} className="p-2.5 bg-white text-slate-800 rounded-xl shadow-xl hover:bg-slate-900 hover:text-white transition-all" title="Imprimir"><Printer className="w-4 h-4" /></button>
                                                <button onClick={() => removeCustomSticker(s.id)} className="p-2.5 bg-white text-red-500 rounded-xl shadow-xl hover:bg-red-500 hover:text-white transition-all" title="Remover"><Trash2 className="w-4 h-4" /></button>
                                            </div>

                                            {/* The Sticker Itself */}
                                            <div
                                                ref={el => stickerRefs.current[s.id] = el}
                                                className={`
                                                    w-full rounded-[2.5rem] border-4 flex flex-col items-center justify-between overflow-hidden shadow-2xl transition-all h-[420px]
                                                    ${s.layoutType === 'marketing' ? 'p-0' : 'p-8'}
                                                    print:h-auto print:shadow-none print:border-slate-200
                                                `}
                                                style={{
                                                    borderColor: s.primaryColor + '20',
                                                    backgroundColor: s.secondaryColor
                                                }}
                                            >
                                                {/* LAYOUT: MARKETING MAX */}
                                                {s.layoutType === 'marketing' && (
                                                    <>
                                                        <div className="w-full pt-10 px-8 text-center">
                                                            <div className="flex items-center justify-center gap-2 mb-2">
                                                                <Palette className="w-4 h-4" style={{ color: s.primaryColor }} />
                                                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">{s.type}</span>
                                                            </div>
                                                            <h4 className="text-2xl font-black leading-tight" style={{ color: s.primaryColor }}>{s.title}</h4>
                                                            <p className="text-xs font-bold text-slate-400 mt-1 opacity-80">{s.subtitle}</p>
                                                        </div>
                                                        <div className="flex-1 flex items-center justify-center py-6">
                                                            <div className="bg-white p-4 rounded-[2rem] shadow-inner border-2" style={{ borderColor: s.primaryColor + '10' }}>
                                                                <PremiumQR value={s.value} color={s.primaryColor} size={180} />
                                                            </div>
                                                        </div>
                                                        {s.footerMessage && (
                                                            <div className="w-full py-5 px-6 text-center" style={{ backgroundColor: s.primaryColor }}>
                                                                <p className="text-xs font-black text-white uppercase tracking-[0.25em]">{s.footerMessage}</p>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* LAYOUT: ASSET PRO */}
                                                {s.layoutType === 'asset' && (
                                                    <div className="w-full h-full flex flex-col justify-between border-8 p-6 rounded-[2.5rem]" style={{ borderColor: s.primaryColor }}>
                                                        <div className="flex justify-between items-start">
                                                            <div className="text-left">
                                                                <h4 className="text-lg font-black" style={{ color: s.primaryColor }}>{s.title}</h4>
                                                                <p className="text-[10px] font-bold text-slate-400">{s.subtitle}</p>
                                                            </div>
                                                            <Shield className="w-6 h-6" style={{ color: s.primaryColor }} />
                                                        </div>
                                                        <div className="flex-1 flex items-center justify-center">
                                                             <PremiumQR value={s.value} color="#0f172a" size={160} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full w-1/3" style={{ backgroundColor: s.primaryColor }}></div>
                                                            </div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">{s.footerMessage || "QR Code de Identificação"}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* LAYOUT: MINIMALISTA */}
                                                {s.layoutType === 'minimal' && (
                                                    <div className="w-full h-full flex flex-col items-center justify-center space-y-8">
                                                        <PremiumQR value={s.value} color={s.primaryColor} size={200} />
                                                        <div className="text-center">
                                                            <h4 className="text-xl font-black" style={{ color: s.primaryColor }}>{s.title}</h4>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.footerMessage}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Print CSS - Enhanced for Premium Layouts */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body { background: white !important; margin: 0 !important; }
                    #root > div > div { padding: 0 !important; margin: 0 !important; }
                    .print\\:hidden { display: none !important; }

                    ${printingId ? `
                        .grid, .grid-cols-1 {
                            display: flex !important;
                            justify-content: center !important;
                            align-items: center !important;
                            height: 100vh !important;
                            width: 100vw !important;
                            padding: 0 !important;
                        }
                        .grid > div {
                            width: 100mm !important;
                            height: 150mm !important;
                        }
                    ` : `
                        .grid {
                            display: grid !important;
                            grid-template-columns: repeat(2, 1fr) !important;
                            gap: 15mm !important;
                        }
                        .grid > div {
                            height: 120mm !important;
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
