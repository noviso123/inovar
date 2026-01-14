import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { ServiceRequest } from '../types';

export const BudgetPrint: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<ServiceRequest | null>(null);
    const [company, setCompany] = useState<any>(null);

    useEffect(() => {
        if (id) {
            apiService.getRequest(id).then(setRequest);
            apiService.getCompany().then(setCompany);
        }
    }, [id]);

    useEffect(() => {
        if (request && company) {
            setTimeout(() => {
                window.print();
            }, 1000);
        }
    }, [request, company]);

    if (!request) return <div>Carregando...</div>;

    const total = request.orcamentoItens?.reduce((acc, item) => acc + item.valorTotal, 0) || 0;

    return (
        <div className="bg-white p-8 max-w-[210mm] mx-auto text-black print:p-0">
            {/* Header */}
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold uppercase">Orçamento</h1>
                    <p className="text-sm mt-1">Ref. Chamado Nº {request.numero || request.id.slice(0, 8)}</p>
                </div>
                <div className="text-right text-sm">
                    <h2 className="font-bold text-lg">{company?.name || 'INOVAR REFRIGERAÇÃO'}</h2>
                    <p>{company?.document || 'CNPJ: 00.000.000/0000-00'}</p>
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

            {/* Terms */}
            <div className="mb-6 text-sm">
                <h3 className="font-bold uppercase text-sm mb-2">Condições</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Validade deste orçamento: 15 dias.</li>
                    <li>Pagamento: A combinar.</li>
                    <li>Garantia dos serviços: 90 dias.</li>
                </ul>
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
        </div>
    );
};
