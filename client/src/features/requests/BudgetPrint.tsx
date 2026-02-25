import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/shared/services/apiService';
import { ServiceRequest } from '@/shared/types';
import { QRCodeSVG } from 'qrcode.react';
import { Pix } from '@/shared/utils/pix';
import { ArrowLeft } from 'lucide-react';

export const BudgetPrint: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [request, setRequest] = useState<ServiceRequest | null>(null);
    const [company, setCompany] = useState<any>(null);
    const [pixPayload, setPixPayload] = useState<string>('');
    const hasPrinted = useRef(false);

    useEffect(() => {
        if (id) {
            apiService.getRequest(id).then(setRequest);
            apiService.getCompany().then(setCompany);
        }
    }, [id]);

    useEffect(() => {
        if (request && company && !hasPrinted.current) {
            // Generate PIX Payload
            if (company.pixKey) {
                const total = request.orcamentoItens?.reduce((acc, item) => acc + item.valorTotal, 0) || 0;
                const pix = new Pix(
                    company.razaoSocial || company.name || 'Prestador',
                    company.endereco?.city || 'Cidade',
                    company.pixKey,
                    total > 0 ? total : undefined,
                    request.numero ? request.numero.toString() : request.id.slice(0, 4)
                );
                setPixPayload(pix.getPayload());
            }

            hasPrinted.current = true;
            setTimeout(() => {
                window.print();
            }, 1000);
        }
    }, [request, company]);

    if (!request || !company) return <div>Carregando...</div>;

    const total = request.orcamentoItens?.reduce((acc, item) => acc + item.valorTotal, 0) || 0;

    return (
        <div className="bg-white p-8 max-w-[210mm] mx-auto text-black print:p-0">
            {/* Mobile/Screen Only Controls */}
            <div className="print:hidden mb-8 flex justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <span className="text-xl">🖨️</span> Visualização de Impressão
                    </p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="px-6 py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    Imprimir / Salvar PDF
                </button>
            </div>
            {/* Header */}
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    {company?.logoUrl && (
                        <img src={company.logoUrl} alt="Logo" className="h-20 w-auto object-contain" />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold uppercase">Orçamento</h1>
                        <p className="text-sm mt-1">Ref. Chamado Nº {request.numero || request.id.slice(0, 8)}</p>
                    </div>
                </div>
                <div className="text-right text-sm">
                    <h2 className="font-bold text-lg">{company?.nomeFantasia || company?.razaoSocial || company?.name || 'INOVAR REFRIGERAÇÃO'}</h2>
                    <p>{company?.cnpj || company?.document || 'CNPJ: 00.000.000/0000-00'}</p>
                    <p>{company?.email}</p>
                    <p>{company?.phone}</p>
                </div>
            </div>

            {/* Client Info */}
            <div className="mb-6 border border-black rounded p-4">
                <h3 className="font-bold uppercase text-sm mb-2 border-b border-gray-300 pb-1">Dados do Cliente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-bold">Nome:</span> {request.clientName}
                    </div>
                    <div>
                        <span className="font-bold">Data:</span> {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>

            {/* Budget Items */}
            <div className="mb-6">
                <h3 className="font-bold uppercase text-sm mb-2">Itens do Orçamento</h3>
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black">
                            <th className="py-2 px-2 border border-gray-300">Descrição</th>
                            <th className="py-2 px-2 border border-gray-300 text-center w-20">Qtd</th>
                            <th className="py-2 px-2 border border-gray-300 text-right w-32">Valor Unit.</th>
                            <th className="py-2 px-2 border border-gray-300 text-right w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {request.orcamentoItens?.map((item, i) => (
                            <tr key={i} className="border-b border-gray-200">
                                <td className="py-2 px-2 border border-gray-300">{item.descricao}</td>
                                <td className="py-2 px-2 border border-gray-300 text-center">{item.quantidade}</td>
                                <td className="py-2 px-2 border border-gray-300 text-right">R$ {item.valorUnit.toFixed(2)}</td>
                                <td className="py-2 px-2 border border-gray-300 text-right font-bold">R$ {item.valorTotal.toFixed(2)}</td>
                            </tr>
                        ))}
                        {(!request.orcamentoItens || request.orcamentoItens.length === 0) && (
                            <tr>
                                <td colSpan={4} className="py-4 text-center text-gray-500 italic border border-gray-300">
                                    Nenhum item adicionado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-100 font-bold">
                            <td colSpan={3} className="py-2 px-2 text-right border border-gray-300">TOTAL</td>
                            <td className="py-2 px-2 text-right border border-gray-300 text-lg">R$ {total.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>



            {/* Payment & PIX */}
            <div className="mb-6 grid grid-cols-2 gap-8">
                <div className="text-sm">
                    <h3 className="font-bold uppercase text-sm mb-2">Condições</h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                        <li>Validade deste orçamento: 15 dias.</li>
                        <li>Pagamento: A combinar.</li>
                        <li>Garantia dos serviços: 90 dias.</li>
                    </ul>
                </div>
                {company?.pixKey && pixPayload && (
                    <div className="border border-black rounded p-4 flex items-center gap-4">
                        <div className="bg-white p-2">
                            {/* @ts-ignore */}
                            <QRCodeSVG value={pixPayload} size={80} />
                        </div>
                        <div>
                            <h3 className="font-bold uppercase text-sm mb-1">Pague com PIX</h3>
                            <p className="text-xs text-gray-600 mb-1">Chave ({company.pixKeyType || 'PIX'}):</p>
                            <p className="font-mono font-bold text-sm">{company.pixKey}</p>
                            <p className="text-[10px] text-gray-500 mt-1">Escaneie para pagar R$ {total.toFixed(2)}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Signatures */}
            <div className="mt-12 grid grid-cols-2 gap-12">
                <div className="text-center">
                    <div className="h-16 border-b border-black mb-2"></div>
                    <p className="text-sm font-bold">Aprovado por (Cliente)</p>
                </div>
                <div className="text-center">
                    <div className="h-16 border-b border-black mb-2"></div>
                    <p className="text-sm font-bold">Responsável Técnico</p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center text-xs text-gray-500 border-t pt-4">
                <p>Gerado em {new Date().toLocaleString()} pelo sistema INOVAR.</p>
            </div>

            {/* Security Note: Used only for static print media styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }
                    body {
                        background: white;
                    }
                    .print\\:p-0 {
                        padding: 0 !important;
                    }
                }
            ` }} />
        </div >
    );
};
