import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Equipment, User, UserRole } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Search, ArrowLeft, SlidersHorizontal } from 'lucide-react';

export const QRCodeManager: React.FC = () => {
    const navigate = useNavigate();
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [clients, setClients] = useState<any[]>([]);

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

            // Enrich equipments with client names
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

    const filteredEquipments = equipments.filter(e => {
        const matchesSearch =
            e.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.location.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesClient = filterClient ? e.clientId === filterClient : true;

        return matchesSearch && matchesClient;
    });

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
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
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Etiquetas para Identificação de Ativos</p>
                    </div>
                </div>

                <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl"
                >
                    <Printer className="w-4 h-4" />
                    Imprimir Etiquetas
                </button>
            </div>

            {/* Filters - Hidden on print */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 print:hidden">
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
            </div>

            {/* Loading State */}
            {loading && (
                <div className="py-20 text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Ativos...</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredEquipments.length === 0 && (
                <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">Nenhum equipamento encontrado com esses filtros.</p>
                </div>
            )}

            {/* Stickers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-3 print:gap-4">
                {filteredEquipments.map((e) => (
                    <div key={e.id} className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 flex flex-col items-center text-center space-y-4 hover:border-blue-200 transition-all group print:border-slate-300 print:shadow-none print:break-inside-avoid print:p-4">
                        <div className="w-full text-left">
                            <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1 truncate">{(e as any).clientName}</p>
                            <h4 className="text-base font-black text-slate-800 leading-tight truncate">{e.brand}</h4>
                            <p className="text-[10px] font-bold text-slate-400 truncate">{e.model}</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-blue-50 transition-colors print:bg-white print:p-2">
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

                        <div className="w-full pt-2 border-t border-dashed border-slate-100 print:hidden">
                             <p className="text-[7px] font-bold text-slate-400 text-center">Escaneie para abrir um chamado técnico</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* CSS for printing stickers */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; }

                    /* Reset container for print */
                    #root > div > main { margin: 0 !important; padding: 0 !important; }
                    .animate-in { animation: none !important; }

                    /* Show only the grid items */
                    div.grid { visibility: visible !important; display: grid !important; }
                    div.grid > div { visibility: visible !important; border: 1px solid #ddd !important; border-radius: 8px !important; }

                    @page { margin: 1cm; }
                }
            ` }} />
        </div>
    );
};
