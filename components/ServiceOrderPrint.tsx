import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { ServiceRequest } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Pix } from '../utils/pix';

export const ServiceOrderPrint: React.FC = () => {
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

    return (
        <div className="bg-white p-8 max-w-[210mm] mx-auto text-black print:p-0">
            {/* Header */}
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold uppercase">Ordem de Serviço</h1>
                    <p className="text-sm mt-1">Nº {request.numero || request.id.slice(0, 8)}</p>
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
                        <span className="font-bold">Data Solicitação:</span> {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                    <div className="col-span-2">
                        <span className="font-bold">Endereço:</span> {request.client?.address || 'Endereço não cadastrado'}
                    </div>
                </div>
            </div>

            {/* Equipment Info */}
            <div className="mb-6 border border-black rounded p-4">
                <h3 className="font-bold uppercase text-sm mb-2 border-b border-gray-300 pb-1">Equipamentos</h3>
                {request.equipments && request.equipments.length > 0 ? (
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-gray-300">
                                <th className="py-1">Equipamento</th>
                                <th className="py-1">Marca/Modelo</th>
                                <th className="py-1">Local</th>
                            </tr>
                        </thead>
                        <tbody>
                            {request.equipments.map((eq, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                    <td className="py-1">{eq.equipamento?.name}</td>
                                    <td className="py-1">{eq.equipamento?.brand} {eq.equipamento?.model}</td>
                                    <td className="py-1">{eq.equipamento?.location}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-sm italic">Nenhum equipamento vinculado.</p>
                )}
            </div>

            {/* Service Details */}
            <div className="mb-6 border border-black rounded p-4">
                <h3 className="font-bold uppercase text-sm mb-2 border-b border-gray-300 pb-1">Detalhes do Serviço</h3>
                <div className="text-sm mb-4">
                    <p><span className="font-bold">Tipo de Serviço:</span> {request.serviceType}</p>
                    <p><span className="font-bold">Prioridade:</span> {request.priority}</p>
                    <p className="mt-2"><span className="font-bold">Descrição do Problema:</span></p>
                    <p className="bg-gray-50 p-2 rounded border border-gray-200 mt-1">{request.description}</p>
                </div>
            </div>

            {/* Technical Report (Space for writing) */}
            <div className="mb-6 border border-black rounded p-4 min-h-[150px]">
                <h3 className="font-bold uppercase text-sm mb-2 border-b border-gray-300 pb-1">Relatório Técnico</h3>
                <div className="text-sm text-gray-400 italic p-4 text-center">
                    Espaço reservado para preenchimento técnico manual
                </div>
            </div>

            {/* Payment & PIX */}
            {company?.pixKey && (
                <div className="mb-6 border border-black rounded p-4 flex items-center gap-4 break-inside-avoid">
                    <div className="bg-white p-2">
                        {/* @ts-ignore */}
                        <QRCodeSVG
                            value={new Pix(
                                company.razaoSocial || company.name || 'Prestador',
                                company.endereco?.city || 'Cidade',
                                company.pixKey,
                                undefined, // No amount for OS
                                request.numero ? request.numero.toString() : request.id.slice(0, 4)
                            ).getPayload()}
                            size={80}
                        />
                    </div>
                    <div>
                        <h3 className="font-bold uppercase text-sm mb-1">Pagamento via PIX</h3>
                        <p className="text-xs text-gray-600 mb-1">Chave ({company.pixKeyType || 'PIX'}):</p>
                        <p className="font-mono font-bold text-sm">{company.pixKey}</p>
                    </div>
                </div>
            )}

            {/* Signatures */}
            <div className="mt-12 grid grid-cols-2 gap-12">
                <div className="text-center">
                    {request.assinaturaTecnico ? (
                        <img src={request.assinaturaTecnico} alt="Assinatura Técnico" className="h-16 mx-auto mb-2" />
                    ) : (
                        <div className="h-16"></div>
                    )}
                    <div className="border-t border-black pt-2">
                        <p className="text-sm font-bold">Técnico Responsável</p>
                        <p className="text-xs">{request.responsibleName}</p>
                    </div>
                </div>
                <div className="text-center">
                    {request.assinaturaCliente ? (
                        <img src={request.assinaturaCliente} alt="Assinatura Cliente" className="h-16 mx-auto mb-2" />
                    ) : (
                        <div className="h-16"></div>
                    )}
                    <div className="border-t border-black pt-2">
                        <p className="text-sm font-bold">Cliente</p>
                        <p className="text-xs">{request.clientName}</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center text-xs text-gray-500 border-t pt-4">
                <p>Gerado em {new Date().toLocaleString()} pelo sistema INOVAR.</p>
            </div>
        </div>
    );
};
