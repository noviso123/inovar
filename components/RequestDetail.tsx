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
  const [activeTab, setActiveTab] = useState<'info' | 'orcamento' | 'assinatura' | 'nfse' | 'anexos'>('info');

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
  const [nfseEventos, setNfseEventos] = useState<any[]>([]);
  const [isIssuingNF, setIsIssuingNF] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .then(data => {
          setNfse(data);
          if (data) {
            apiService.getNFSeEventos(request.id).then(setNfseEventos).catch(console.error);
          }
        })
        .catch(() => setNfse(null)); // Ignora 404
    }
  }, [request, activeTab]);

  // Load attachments when tab is active
  useEffect(() => {
    if (request && activeTab === 'anexos') {
      apiService.getAttachments(request.id)
        .then(data => setAttachments(data || []))
        .catch(err => console.error('Failed to load attachments:', err));
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

  // Action Buttons Handlers
  const handleAccept = async () => {
    if (!request) return;
    try {
      await apiService.updateRequestStatus(request.id, RequestStatus.ACEITA);
      await reloadRequest();
      alert('Chamado aceito com sucesso!');
    } catch (err) {
      alert('Erro ao aceitar chamado');
    }
  };

  const handleRefuse = async () => {
    if (!request) return;
    if (!confirm('Tem certeza que deseja recusar este chamado?')) return;
    try {
      await apiService.updateRequestStatus(request.id, RequestStatus.CANCELADA);
      await reloadRequest();
      alert('Chamado recusado.');
    } catch (err) {
      alert('Erro ao recusar chamado');
    }
  };

  const handleCancelNFSe = async () => {
    if (!request || !nfse) return;
    if (!confirm('Tem certeza que deseja cancelar esta Nota Fiscal? Esta ação não pode ser desfeita.')) return;

    try {
      await apiService.cancelNFSe(request.id);
      setNfse(prev => prev ? { ...prev, status: 'CANCELADA' } : null);
      alert('Nota Fiscal cancelada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao cancelar NFS-e');
    }
  };

  // Attachment functions
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !request) return;

    setIsUploadingAttachment(true);
    try {
      for (const file of Array.from(files)) {
        await apiService.uploadAttachment(request.id, file);
      }
      // Reload attachments
      const data = await apiService.getAttachments(request.id);
      setAttachments(data || []);
      alert('Arquivo(s) enviado(s) com sucesso!');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Erro ao enviar arquivo');
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!request) return;
    if (!confirm('Deseja remover este anexo?')) return;

    try {
      await apiService.deleteAttachment(request.id, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Erro ao excluir anexo');
    }
  };

  const isImageFile = (mimeType: string) => {
    return mimeType?.startsWith('image/');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
        <button onClick={handleBack} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors">
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
            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${request.status === RequestStatus.ABERTA ? 'bg-blue-100 text-blue-700' :
              request.status === RequestStatus.EM_ANDAMENTO ? 'bg-amber-100 text-amber-700' :
                request.status === RequestStatus.CONCLUIDA ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-700'
              }`}>{request.status}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{request.clientName}</p>
        </div>
        <button
          onClick={() => window.open(`/print/os/${request.id}`, '_blank')}
          className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          title="Imprimir Ordem de Serviço"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'info' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          Informações
        </button>
        <button
          onClick={() => setActiveTab('orcamento')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'orcamento' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          Orçamento
        </button>
        <button
          onClick={() => setActiveTab('assinatura')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'assinatura' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          Assinatura
        </button>
        <button
          onClick={() => setActiveTab('nfse')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'nfse' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          Nota Fiscal
        </button>
        <button
          onClick={() => setActiveTab('anexos')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'anexos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          Anexos
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
                  <p className={`text-sm font-black mt-1 ${request.priority === 'EMERGENCIAL' ? 'text-rose-600' :
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

            {/* Contacts Section */}
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Contatos</h4>
              <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-800 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{request.clientName}</p>
                  <p className="text-xs text-slate-500">Cliente</p>
                </div>
              </div>
            </section>

            {/* Usage Policies */}
            <section>
              <div className="border border-slate-200 rounded-2xl p-4">
                <h4 className="font-black text-slate-800 text-sm mb-2">Políticas de Uso</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ao aceitar este chamado, você concorda com os termos de serviço e as políticas de privacidade da plataforma. Certifique-se de cumprir os prazos de SLA estabelecidos.
                </p>
              </div>
            </section>

            {/* Documents Section */}
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Documentos</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => window.open(`/print/os/${request.id}`, '_blank')}
                  className="p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl flex items-center gap-4 hover:bg-blue-100 hover:border-blue-200 transition-all text-left group shadow-sm hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-black text-blue-900 text-sm">Ordem de Serviço</p>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Visualizar PDF</p>
                  </div>
                </button>

                {totalOrcamento > 0 && (
                  <button
                    onClick={() => window.open(`/print/budget/${request.id}`, '_blank')}
                    className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center gap-4 hover:bg-emerald-100 hover:border-emerald-200 transition-all text-left group shadow-sm hover:shadow-md"
                  >
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-black text-emerald-900 text-sm">Orçamento</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Visualizar PDF</p>
                    </div>
                  </button>
                )}

                {nfse && (
                  <button
                    onClick={() => setActiveTab('nfse')}
                    className="p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center gap-4 hover:bg-amber-100 hover:border-amber-200 transition-all text-left group shadow-sm hover:shadow-md"
                  >
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-black text-amber-900 text-sm">Nota Fiscal</p>
                      <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">{nfse.status}</p>
                    </div>
                  </button>
                )}
              </div>
            </section>

            {/* Action Buttons (Accept/Refuse) - Only for Technicians/Providers and if status is appropriate */}
            {(currentUser.role === UserRole.TECNICO || currentUser.role === UserRole.PRESTADOR) &&
              (request.status === RequestStatus.PENDENTE || request.status === RequestStatus.ATRIBUIDA) && (
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleRefuse}
                    className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-rose-900/20 hover:bg-rose-700 transition-colors"
                  >
                    Recusar Chamado
                  </button>
                  <button
                    onClick={handleAccept}
                    className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-colors"
                  >
                    Aceitar Chamado
                  </button>
                </div>
              )}
          </div>
        )}

        {/* ORCAMENTO TAB */}
        {activeTab === 'orcamento' && (
          <div className="p-6 space-y-6">
            {/* Budget Total */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Valor Total</span>
                  <p className="text-3xl font-black mt-1">R$ {totalOrcamento.toFixed(2)}</p>
                  {request.orcamentoAprovado && (
                    <span className="inline-block mt-2 px-3 py-1 bg-emerald-500 rounded-lg text-[10px] font-black uppercase">
                      ✓ Aprovado
                    </span>
                  )}
                </div>
                <button
                  onClick={() => window.open(`/print/budget/${request.id}`, '_blank')}
                  className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  title="Imprimir Orçamento"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
              </div>
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
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-colors"
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
                  className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase ${signatureType === 'cliente' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  Cliente
                </button>
                <button
                  onClick={() => setSignatureType('tecnico')}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase ${signatureType === 'tecnico' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'
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
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-emerald-600 transition-colors"
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
                      className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${isIssuingNF || request.status !== RequestStatus.CONCLUIDA
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-cyan-600 shadow-lg'
                        }`}
                    >
                      {isIssuingNF ? 'Processando...' : request.status !== RequestStatus.CONCLUIDA ? 'Conclua o chamado primeiro' : 'Emitir NFS-e Agora'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={`p-6 rounded-[2rem] border-2 ${nfse.status === 'EMITIDA' ? 'bg-emerald-50 border-emerald-100' :
                    nfse.status === 'ERRO' ? 'bg-rose-50 border-rose-100' :
                      'bg-amber-50 border-amber-100'
                    }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full ${nfse.status === 'EMITIDA' ? 'bg-emerald-500 text-white' :
                          nfse.status === 'ERRO' ? 'bg-rose-500 text-white' :
                            'bg-amber-500 text-white'
                          }`}>
                          {nfse.status === 'EMITIDA' ? 'Emitida' : nfse.status === 'ERRO' ? 'Erro' : 'Processando'}
                        </span>
                        <p className={`text-2xl font-black mt-2 ${nfse.status === 'EMITIDA' ? 'text-emerald-800' :
                          nfse.status === 'ERRO' ? 'text-rose-800' :
                            'text-amber-800'
                          }`}>
                          {nfse.status === 'EMITIDA' ? `NFS-e #${nfse.numero}` :
                            nfse.status === 'ERRO' ? 'Falha na emissão' : 'Processando via GOV.BR'}
                        </p>
                      </div>
                      {nfse.status === 'EMITIDA' && (
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-black uppercase">Código Verificação</p>
                          <p className="text-xs font-mono font-bold text-slate-600">{nfse.codigoVerificacao || '---'}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/40">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tomador</span>
                        <p className="text-sm font-black text-slate-800 mt-1">{nfse.tomadorNome}</p>
                        <p className="text-xs font-bold text-slate-500">{nfse.tomadorDocumento}</p>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/40">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Resumo Financeiro</span>
                        <div className="flex justify-between items-end mt-1">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold">Valor Bruto</p>
                            <p className="text-sm font-black text-slate-800">R$ {nfse.valorServicos.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-emerald-600 font-bold">Valor Líquido</p>
                            <p className="text-lg font-black text-emerald-700">R$ {nfse.valorLiquido.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {nfse.status === 'EMITIDA' && (
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => window.open(`/api/requests/${request.id}/nfse/danfse`, '_blank')}
                          className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95"
                        >
                          Visualizar DANFS-e
                        </button>
                        <button
                          onClick={() => window.open(`/api/requests/${request.id}/nfse`, '_blank')}
                          className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-800/30 hover:bg-slate-900 transition-all active:scale-95"
                        >
                          Baixar XML
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Event History */}
                  {nfseEventos.length > 0 && (
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Histórico de Eventos</h5>
                      <div className="space-y-4">
                        {nfseEventos.map((evento, idx) => (
                          <div key={evento.id} className="flex gap-4 relative">
                            {idx < nfseEventos.length - 1 && (
                              <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-slate-100"></div>
                            )}
                            <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 z-10 ${evento.tipo === 'EMISSAO' ? 'bg-blue-500' :
                              evento.tipo === 'CANCELAMENTO' ? 'bg-rose-500' :
                                'bg-slate-300'
                              }`}></div>
                            <div className="flex-1 pb-4">
                              <div className="flex justify-between items-start">
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{evento.tipo}</p>
                                <span className="text-[9px] font-bold text-slate-400">{new Date(evento.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{evento.mensagem}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {canManageNFSe && nfse.status !== 'CANCELADA' && (
                    <div className="pt-4">
                      <button
                        onClick={() => {
                          const motivo = prompt("Motivo do cancelamento:\n1 - Erro na Emissão\n2 - Serviço não Prestado\n3 - Duplicidade\n4 - Erro de Preenchimento", "1");
                          if (motivo) {
                            const justificativa = prompt("Justificativa (opcional):");
                            apiService.cancelNFSeWithMotivo(request.id, parseInt(motivo), justificativa || undefined)
                              .then(() => {
                                alert('Cancelamento solicitado com sucesso!');
                                // Trigger reload
                                apiService.getNFSe(request.id).then(setNfse);
                                apiService.getNFSeEventos(request.id).then(setNfseEventos);
                              })
                              .catch(err => alert('Erro ao cancelar: ' + err.message));
                          }
                        }}
                        className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-rose-100 hover:bg-rose-100 transition-all"
                      >
                        Cancelar NFS-e Nacional
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANEXOS TAB */}
        {activeTab === 'anexos' && (
          <div className="p-6 space-y-6">
            {/* Upload Section */}
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Enviar Arquivos</h4>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${isUploadingAttachment
                  ? 'border-cyan-400 bg-cyan-50'
                  : 'border-slate-200 hover:border-cyan-500 hover:bg-slate-50'
                  }`}
              >
                {isUploadingAttachment ? (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-sm font-bold text-cyan-600">Enviando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-bold text-slate-600">Clique para enviar arquivos</span>
                    <span className="text-xs text-slate-400 mt-1">Imagens, PDF, Word, Excel</span>
                  </div>
                )}
              </label>
            </section>

            {/* Attachments List */}
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Arquivos Anexados ({attachments.length})</h4>
              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="bg-slate-50 p-4 rounded-xl flex items-center gap-3 group">
                      {/* Thumbnail or Icon */}
                      <div className="flex-shrink-0">
                        {isImageFile(attachment.mimeType) ? (
                          <a href={attachment.filePath || attachment.externalUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={attachment.thumbnailUrl || attachment.filePath || attachment.externalUrl}
                              alt={attachment.fileName}
                              className="w-14 h-14 object-cover rounded-lg border border-slate-200 hover:border-cyan-500 transition-colors"
                            />
                          </a>
                        ) : (
                          <div className="w-14 h-14 bg-slate-200 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <a
                          href={attachment.filePath || attachment.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-slate-800 truncate block hover:text-cyan-600"
                        >
                          {attachment.fileName}
                        </a>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(attachment.fileSize)} • {attachment.uploadedByName || 'Sistema'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(attachment.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={attachment.filePath || attachment.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600 hover:bg-cyan-200"
                          title="Abrir"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <button
                          onClick={() => deleteAttachment(attachment.id)}
                          className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-200"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                  <p className="text-slate-500 font-medium">Nenhum anexo neste chamado</p>
                  <p className="text-xs text-slate-400 mt-1">Envie fotos, documentos ou outros arquivos</p>
                </div>
              )}
            </section>
          </div>
        )}

      </div>
    </div>
  );
};
