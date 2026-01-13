import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ServiceRequest, RequestStatus, User, UserRole, OrcamentoItem, OrcamentoSugestao, NotaFiscal } from '../types';
import { apiService } from '../services/apiService';

interface RequestDetailProps {
  request?: ServiceRequest | null;
  currentUser: User;
  onUpdateStatus?: (newStatus: RequestStatus) => void;
  onClose?: () => void;
}

export const RequestDetail: React.FC<RequestDetailProps> = ({ request: propRequest, currentUser, onUpdateStatus, onClose }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const hasValidRequest = propRequest && propRequest.id;
  const [request, setRequest] = useState<ServiceRequest | null>(hasValidRequest ? propRequest : null);
  const [isLoading, setIsLoading] = useState(!hasValidRequest);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'orcamento' | 'assinatura' | 'nfse'>('info');

  // Budget state
  const [sugestoes, setSugestoes] = useState<OrcamentoSugestao[]>([]);
  const [newItem, setNewItem] = useState({ descricao: '', quantidade: 1, valorUnit: 0, tipo: 'SERVICO' });
  const [showSugestoes, setShowSugestoes] = useState(false);

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureType, setSignatureType] = useState<'cliente' | 'tecnico'>('cliente');

  // NFS-e state
  const [nfse, setNfse] = useState<NotaFiscal | null>(null);
  const [isIssuingNF, setIsIssuingNF] = useState(false);

  // Load request from API
  useEffect(() => {
    if (propRequest && propRequest.id) {
      setRequest(propRequest);
      setIsLoading(false);
      return;
    }

    if (id) {
      setIsLoading(true);
      apiService.getRequest(id)
        .then(data => {
          setRequest(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Failed to load request:', err);
          setError('Chamado não encontrado');
          setIsLoading(false);
        });
    }
  }, [id, propRequest]);

  // Load budget suggestions
  useEffect(() => {
    apiService.getOrcamentoSugestoes()
      .then(data => setSugestoes(data || []))
      .catch(err => console.error('Failed to load suggestions:', err));
  }, []);

  // Load NFS-e if exists
  useEffect(() => {
    if (request && activeTab === 'nfse') {
      apiService.getNFSe(request.id)
        .then(data => setNfse(data))
        .catch(() => setNfse(null)); // Ignora 404
    }
  }, [request, activeTab]);

  const handleBack = () => navigate('/chamados');

  const reloadRequest = async () => {
    if (request?.id) {
      const data = await apiService.getRequest(request.id);
      setRequest(data);
    }
  };

  // Budget functions
  const addBudgetItem = async () => {
    if (!request || !newItem.descricao || newItem.valorUnit <= 0) return;

    try {
      await apiService.addOrcamentoItem(request.id, newItem);
      await reloadRequest();
      setNewItem({ descricao: '', quantidade: 1, valorUnit: 0, tipo: 'SERVICO' });
      setShowSugestoes(false);
    } catch (err) {
      alert('Erro ao adicionar item');
    }
  };

  const removeBudgetItem = async (itemId: string) => {
    if (!request) return;
    try {
      await apiService.removeOrcamentoItem(request.id, itemId);
      await reloadRequest();
    } catch (err) {
      alert('Erro ao remover item');
    }
  };

  const approveOrcamento = async () => {
    if (!request) return;
    try {
      await apiService.aprovarOrcamento(request.id);
      await reloadRequest();
      alert('Orçamento aprovado!');
    } catch (err) {
      alert('Erro ao aprovar orçamento');
    }
  };

  const selectSugestao = (s: OrcamentoSugestao) => {
    setNewItem({ descricao: s.descricao, quantidade: 1, valorUnit: s.valorSugerido, tipo: s.tipo });
    setShowSugestoes(false);
  };

  // Signature functions
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveSignature = async () => {
    if (!request) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    try {
      await apiService.salvarAssinatura(request.id, dataUrl, signatureType);
      await reloadRequest();
      alert('Assinatura salva!');
      clearSignature();
    } catch (err) {
      alert('Erro ao salvar assinatura');
    }
  };

  // NFS-e functions
  const issueNFSe = async () => {
    if (!request) return;
    if (!confirm('Deseja realmente emitir a Nota Fiscal para este chamado?')) return;

    setIsIssuingNF(true);
    try {
      const newNF = await apiService.issueNFSe(request.id);
      setNfse(newNF);
      alert('NFS-e enviada para processamento!');
    } catch (err) {
      console.error(err);
      alert('Erro ao emitir NFS-e. Verifique se o chamado está CONCLUÍDO.');
    } finally {
      setIsIssuingNF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold text-sm">Carregando chamado...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="bg-white rounded-[2rem] p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-black text-slate-800 mb-2">{error || 'Chamado não encontrado'}</h3>
        <button onClick={handleBack} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors">
          ← Voltar
        </button>
      </div>
    );
  }

  const totalOrcamento = request.orcamentoItens?.reduce((sum, item) => sum + item.valorTotal, 0) || request.valorOrcamento || 0;
  const isClienteRole = currentUser.role === UserRole.CLIENTE;
  const canManageBudget = currentUser.role === UserRole.PRESTADOR || currentUser.role === UserRole.TECNICO || currentUser.role === UserRole.ADMIN;
  // NFS-e only for Prestador or Admin
  const canManageNFSe = currentUser.role === UserRole.PRESTADOR || currentUser.role === UserRole.ADMIN;

  return (
    <div className="animate-in fade-in duration-500 pb-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={handleBack} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">Chamado #{request.numero || request.id.slice(0, 6)}</h2>
            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
              request.status === RequestStatus.ABERTA ? 'bg-blue-100 text-blue-700' :
              request.status === RequestStatus.EM_ANDAMENTO ? 'bg-amber-100 text-amber-700' :
              request.status === RequestStatus.CONCLUIDA ? 'bg-emerald-100 text-emerald-700' :
              'bg-slate-100 text-slate-700'
            }`}>{request.status}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{request.clientName}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'info' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Informações
        </button>
        <button
          onClick={() => setActiveTab('orcamento')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'orcamento' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Orçamento
        </button>
        <button
          onClick={() => setActiveTab('assinatura')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'assinatura' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Assinatura
        </button>
        <button
          onClick={() => setActiveTab('nfse')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'nfse' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Nota Fiscal
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="p-6 space-y-6">
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Descrição</h4>
              <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl">{request.description}</p>
            </section>

            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Detalhes</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Prioridade</span>
                  <p className={`text-sm font-black mt-1 ${
                    request.priority === 'EMERGENCIAL' ? 'text-rose-600' :
                    request.priority === 'ALTA' ? 'text-orange-600' :
                    request.priority === 'MEDIA' ? 'text-amber-600' : 'text-emerald-600'
                  }`}>{request.priority}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Criado em</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Técnico</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{request.responsibleName || 'Não atribuído'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">SLA</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{new Date(request.slaLimit).toLocaleString()}</p>
                </div>
              </div>
            </section>

            {request.equipments && request.equipments.length > 0 && (
              <section>
                <h4 className="font-black text-slate-800 text-sm mb-3">Equipamentos</h4>
                <div className="space-y-2">
                  {request.equipments.map((eq, i) => (
                    <div key={i} className="bg-cyan-50 p-4 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="2" y="6" width="20" height="10" rx="2" strokeWidth="2" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{eq.equipamento?.brand} {eq.equipamento?.model}</p>
                        <p className="text-xs text-slate-500">{eq.equipamento?.btu} BTUs • {eq.equipamento?.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ORCAMENTO TAB */}
        {activeTab === 'orcamento' && (
          <div className="p-6 space-y-6">
            {/* Budget Total */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-2xl">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Valor Total</span>
              <p className="text-3xl font-black mt-1">R$ {totalOrcamento.toFixed(2)}</p>
              {request.orcamentoAprovado && (
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-500 rounded-lg text-[10px] font-black uppercase">
                  ✓ Aprovado
                </span>
              )}
            </div>

            {/* Budget Items */}
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Itens do Orçamento</h4>
              {request.orcamentoItens && request.orcamentoItens.length > 0 ? (
                <div className="space-y-2">
                  {request.orcamentoItens.map(item => (
                    <div key={item.id} className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-sm">{item.descricao}</p>
                        <p className="text-xs text-slate-500">
                          {item.quantidade}x R$ {item.valorUnit.toFixed(2)} = <strong className="text-slate-800">R$ {item.valorTotal.toFixed(2)}</strong>
                        </p>
                      </div>
                      {canManageBudget && !request.orcamentoAprovado && (
                        <button onClick={() => removeBudgetItem(item.id)} className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum item no orçamento</p>
              )}
            </section>

            {/* Add Item Form - Only for providers/technicians */}
            {canManageBudget && !request.orcamentoAprovado && (
              <section className="border-t border-slate-100 pt-6">
                <h4 className="font-black text-slate-800 text-sm mb-3">Adicionar Item</h4>

                {/* Suggestions Button */}
                <button
                  onClick={() => setShowSugestoes(!showSugestoes)}
                  className="w-full py-3 bg-cyan-50 text-cyan-700 rounded-xl font-bold text-sm mb-4 flex items-center justify-center gap-2 hover:bg-cyan-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Ver Sugestões de Serviços
                </button>

                {showSugestoes && (
                  <div className="mb-4 max-h-60 overflow-y-auto bg-slate-50 rounded-xl p-2 space-y-1">
                    {sugestoes.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => selectSugestao(s)}
                        className="w-full text-left p-3 bg-white rounded-lg hover:bg-cyan-50 transition-colors flex justify-between items-center"
                      >
                        <span className="text-sm font-medium text-slate-700">{s.descricao}</span>
                        <span className="text-sm font-bold text-emerald-600">R$ {s.valorSugerido.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Descrição do item"
                    value={newItem.descricao}
                    onChange={e => setNewItem({ ...newItem, descricao: e.target.value })}
                    className="w-full p-4 bg-slate-50 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Qtd"
                      value={newItem.quantidade}
                      onChange={e => setNewItem({ ...newItem, quantidade: parseFloat(e.target.value) || 1 })}
                      className="p-4 bg-slate-50 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <input
                      type="number"
                      placeholder="Valor Unit R$"
                      value={newItem.valorUnit || ''}
                      onChange={e => setNewItem({ ...newItem, valorUnit: parseFloat(e.target.value) || 0 })}
                      className="p-4 bg-slate-50 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <button
                    onClick={addBudgetItem}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-colors"
                  >
                    + Adicionar Item
                  </button>
                </div>
              </section>
            )}

            {/* Approve Budget - Only for clients */}
            {isClienteRole && !request.orcamentoAprovado && totalOrcamento > 0 && (
              <button
                onClick={approveOrcamento}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-colors"
              >
                ✓ Aprovar Orçamento
              </button>
            )}
          </div>
        )}

        {/* ASSINATURA TAB */}
        {activeTab === 'assinatura' && (
          <div className="p-6 space-y-6">
            {/* Existing Signatures */}
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Assinaturas Registradas</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Cliente</span>
                  {request.assinaturaCliente ? (
                    <img src={request.assinaturaCliente} alt="Assinatura Cliente" className="w-full h-20 object-contain mt-2 border border-slate-200 rounded-lg bg-white" />
                  ) : (
                    <p className="text-xs text-slate-400 mt-2">Pendente</p>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Técnico</span>
                  {request.assinaturaTecnico ? (
                    <img src={request.assinaturaTecnico} alt="Assinatura Técnico" className="w-full h-20 object-contain mt-2 border border-slate-200 rounded-lg bg-white" />
                  ) : (
                    <p className="text-xs text-slate-400 mt-2">Pendente</p>
                  )}
                </div>
              </div>
            </section>

            {/* New Signature */}
            <section className="border-t border-slate-100 pt-6">
              <h4 className="font-black text-slate-800 text-sm mb-3">Nova Assinatura</h4>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSignatureType('cliente')}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase ${
                    signatureType === 'cliente' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Cliente
                </button>
                <button
                  onClick={() => setSignatureType('tecnico')}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase ${
                    signatureType === 'tecnico' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Técnico
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-2 bg-white">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={150}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2">Desenhe sua assinatura acima</p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={clearSignature}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-200"
                >
                  Limpar
                </button>
                <button
                  onClick={saveSignature}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase hover:bg-emerald-600 transition-colors"
                >
                  Salvar Assinatura
                </button>
              </div>
            </section>
          </div>
        )}

        {/* NFS-e TAB */}
        {activeTab === 'nfse' && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
              <h4 className="font-black text-slate-800 text-lg mb-2">Nota Fiscal de Serviço</h4>
              <p className="text-sm text-slate-500 mb-6">Gerenciamento fiscal da solicitação</p>

              {!nfse ? (
                <div>
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 font-medium mb-4">Nenhuma Nota Fiscal emitida</p>

                  {canManageNFSe && (
                    <button
                      onClick={issueNFSe}
                      disabled={isIssuingNF || request.status !== RequestStatus.CONCLUIDA}
                      className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                        isIssuingNF || request.status !== RequestStatus.CONCLUIDA
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900 text-white hover:bg-cyan-600 shadow-lg'
                      }`}
                    >
                      {isIssuingNF ? 'Processando...' : request.status !== RequestStatus.CONCLUIDA ? 'Conclua o chamado primeiro' : 'Emitir NFS-e Agora'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border ${
                    nfse.status === 'EMITIDA' ? 'bg-emerald-50 border-emerald-200' :
                    nfse.status === 'ERRO' ? 'bg-rose-50 border-rose-200' :
                    'bg-amber-50 border-amber-200'
                  }`}>
                    <span className="text-[10px] uppercase font-black tracking-widest block mb-1">
                      {nfse.status === 'EMITIDA' ? 'Sucesso' : nfse.status === 'ERRO' ? 'Erro' : 'Processando'}
                    </span>
                    <p className={`text-lg font-black ${
                      nfse.status === 'EMITIDA' ? 'text-emerald-700' :
                      nfse.status === 'ERRO' ? 'text-rose-700' :
                      'text-amber-700'
                    }`}>
                      {nfse.status === 'EMITIDA' ? `Nota Fiscal Nº ${nfse.numero}` :
                       nfse.status === 'ERRO' ? 'Falha na emissão' : 'Aguardando Sefaz'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left">
                     <div className="bg-white p-3 rounded-xl border border-slate-100">
                       <span className="text-[10px] text-slate-400 font-bold uppercase">Tomador</span>
                       <p className="text-xs font-bold text-slate-700 mt-1">{nfse.tomadorNome}</p>
                       <p className="text-[10px] text-slate-500">{nfse.tomadorDocumento}</p>
                     </div>
                     <div className="bg-white p-3 rounded-xl border border-slate-100">
                       <span className="text-[10px] text-slate-400 font-bold uppercase">Valor</span>
                       <p className="text-xs font-bold text-slate-700 mt-1">R$ {nfse.valorLiquido.toFixed(2)}</p>
                     </div>
                  </div>

                  {nfse.status === 'EMITIDA' && (
                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase hover:bg-slate-800">
                        Baixar XML
                      </button>
                      <button className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-cyan-700">
                        Baixar PDF
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
