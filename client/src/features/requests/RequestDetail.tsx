import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ServiceRequest, RequestStatus, User, UserRole, OrcamentoItem, OrcamentoSugestao, NotaFiscal, Attachment } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { ArrowLeft, Printer, Info, DollarSign, PenTool, FileSpreadsheet, Paperclip, CheckCircle, XCircle, Trash2, Plus, Download, AlertTriangle, Calendar, Clock } from 'lucide-react';

interface RequestDetailProps {
  request?: ServiceRequest | null;
  currentUser: User;
  onUpdateStatus?: (newStatus: RequestStatus) => void;
  onClose?: () => void;
}

// Helper formatters
const formatPhone = (phone?: string) => {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`;
  if (clean.length === 10) return `(${clean.slice(0,2)}) ${clean.slice(2,6)}-${clean.slice(6)}`;
  return phone;
};

const formatCEP = (cep?: string) => {
  if (!cep) return '';
  const clean = cep.replace(/\D/g, '');
  if (clean.length === 8) return `${clean.slice(0,5)}-${clean.slice(5)}`;
  return cep;
};

export const RequestDetail: React.FC<RequestDetailProps> = ({ request: propRequest, currentUser, onUpdateStatus, onClose }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const hasValidRequest = propRequest && propRequest.id;
  const [request, setRequest] = useState<ServiceRequest | null>(hasValidRequest ? propRequest : null);
  const [isLoading, setIsLoading] = useState(!hasValidRequest);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'orcamento' | 'agendamento' | 'assinatura' | 'nfse' | 'anexos'>('info');

  // Checklist State
  const [checklists, setChecklists] = useState<any[]>([]);
  const [newChecklistDesc, setNewChecklistDesc] = useState('');
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(false);

  // Admin Edit State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editPriority, setEditPriority] = useState('');
  const [editResponsibleId, setEditResponsibleId] = useState('');
  const [technicians, setTechnicians] = useState<User[]>([]);

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
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null); // New state for modal

  // Form State
  const [technicalReport, setTechnicalReport] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [nextMaintenanceAt, setNextMaintenanceAt] = useState('');
  const [preventiveDone, setPreventiveDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New state for auto-save feedback

  // Scheduling state
  const [schedulingDate, setSchedulingDate] = useState('');
  const [schedulingTime, setSchedulingTime] = useState('');
  const [schedulingDescription, setSchedulingDescription] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  // HELPERS FOR SUGGESTIONS
  const saveProgress = async (newReport: string, newMat: string) => {
      if (!id || !request) return;
      setIsSaving(true);
      try {
        await apiService.updateRequestStatus(
            id,
            request.status,
            newReport,
            newMat,
            nextMaintenanceAt,
            request.scheduledAt ? new Date(request.scheduledAt).toISOString() : undefined,
            preventiveDone
        );
        // CRITICAL: Synchronize local state with what was sent
        setTechnicalReport(newReport);
        setMaterialsUsed(newMat);
      } catch (err) {
        console.error("Auto-save failed:", err);
        alert("Erro ao salvar automaticamente alguns dados. Por favor, verifique sua conexão.");
      } finally {
        setTimeout(() => setIsSaving(false), 800);
      }
  };

  const addTextSuggestion = (current: string, setFunc: (s: string) => void, item: string, type: 'report' | 'material') => {
      // Avoid duplicates
      if (current.includes(item)) return;

      const separator = current.trim().length > 0 ? (current.endsWith(',') || current.endsWith('.') ? ' ' : ', ') : '';
      const newVal = current + separator + item;
      setFunc(newVal);
      if (type === 'report') saveProgress(newVal, materialsUsed);
      else saveProgress(technicalReport, newVal);
  };

  const loadChecklistPreset = async (type: 'preventiva' | 'instalacao') => {
      if (!id) return;
      const items = type === 'preventiva'
            ? ["Limpeza de filtros", "Higienização serpentina", "Verificação elétrica", "Teste de drenagem", "Medição de gás"]
            : ["Fixação evaporadora", "Instalação condensadora", "Conexão tubulação", "Vácuo", "Teste estanqueidade"];

      // Filter out items that already exist
      const existingDescriptions = new Set(checklists.map(c => c.description));
      const newItems = items.filter(desc => !existingDescriptions.has(desc));

      if (newItems.length === 0) return;

      setIsLoadingChecklists(true);
      try {
          const newlyCreated = await Promise.all(newItems.map(desc => apiService.createChecklist(id, { description: desc })));
          setChecklists(prev => [...prev, ...newlyCreated]);
      } catch (err) {
          console.error("Failed to load presets", err);
          alert("Erro ao adicionar itens padrão.");
      } finally {
          setIsLoadingChecklists(false);
      }
  };

  const handleClearChecklist = async () => {
      if (!id || checklists.length === 0) return;
      if (!confirm('Tem certeza que deseja excluir todos os itens do checklist?')) return;

      setIsLoadingChecklists(true);
      try {
          await Promise.all(checklists.map(item => apiService.deleteChecklist(id, item.id)));
          setChecklists([]);
      } catch (err) {
          console.error(err);
          alert(`Erro ao limpar checklist: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      } finally {
          setIsLoadingChecklists(false);
      }
  };


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
          if (data.observation) setTechnicalReport(data.observation);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Failed to load request:', err);
          setError('Chamado não encontrado');
          setIsLoading(false);
        });
    }
  }, [id, propRequest]);

  // Load checklists and technicians
  useEffect(() => {
    if (!id) return;

    // Load checklists
    setIsLoadingChecklists(true);
    apiService.getChecklists(id)
        .then(setChecklists)
        .catch(err => console.error("Failed to load checklists", err))
        .finally(() => setIsLoadingChecklists(false));

    // Load technicians if admin
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.PRESTADOR) {
        apiService.getUsers().then(users => {
            setTechnicians(users.filter(u => u.role === UserRole.TECNICO || u.role === UserRole.PRESTADOR));
        });
        if (id) loadChecklists(id);
    }
  }, [id, currentUser]);

  const loadChecklists = async (requestId: string) => {
      try {
          const items = await apiService.getChecklists(requestId);
          setChecklists(items || []);
      } catch (err) {
          console.error('Erro ao carregar checklist:', err);
      }
  };

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

  const handleBack = () => navigate(-1);

  const reloadRequest = async () => {
    if (request?.id) {
      const data = await apiService.getRequest(request.id);
      setRequest(data);
    }
  };

  // Budget functions
  const addBudgetItem = async () => {
    if (!request) return;
    if (!newItem.descricao || newItem.quantidade <= 0 || newItem.valorUnit <= 0) {
      alert('Por favor, preencha a descrição, quantidade (>0) e valor unitário (>0).');
      return;
    }
    try {
      await apiService.addOrcamentoItem(request.id, newItem);
      await reloadRequest();
      setNewItem({ descricao: '', quantidade: 1, valorUnit: 0, tipo: 'SERVICO' });
      setShowSugestoes(false);
    } catch (err) {
      alert('Erro ao adicionar item ao orçamento');
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
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // Scale coordinates to handle CSS resizing
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling on touch
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const { x, y } = getCoordinates(e, canvas);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const { x, y } = getCoordinates(e, canvas);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
     e.preventDefault();
     setIsDrawing(false);
  };

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

    // Check if empty (simple check: if dataURL is very small or matches empty)
    // For now we trust user.
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

  const handleAdminAdvance = async () => {
    if (!request) return;
    if (!confirm('Avançar sem assinatura do cliente? Isso será registrado no histórico.')) return;
    try {
        // Use a transparent 1x1 pixel as placeholder
        const placeholderSig = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        await apiService.salvarAssinatura(request.id, placeholderSig, 'cliente');
        await reloadRequest();
        alert('Avanço administrativo registrado.');
    } catch (err) {
        alert('Erro ao avançar administrativamente');
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

  // Checklist Handlers
  const handleAddChecklist = async () => {
      if (!request || !newChecklistDesc.trim()) return;
      try {
          const newItem = await apiService.createChecklist(request.id, { description: newChecklistDesc });
          setChecklists(prev => [...prev, newItem]);
          setNewChecklistDesc('');
      } catch (err) {
          alert('Erro ao adicionar item.');
      }
  };

  const handleToggleChecklist = async (itemId: string, checked: boolean) => {
      if (!request) return;
      // Optimistic update
      setChecklists(prev => prev.map(c => c.id === itemId ? { ...c, checked } : c));
      try {
          await apiService.updateChecklist(request.id, itemId, { checked, observation: '' });
          // Reload to ensure sync
          await reloadRequest();
      } catch (err) {
          console.error(err);
          // Revert in case of error (reload)
          await reloadRequest();
          alert('Erro ao atualizar checklist');
      }
  };

  const handleDeleteChecklist = async (itemId: string) => {
      if (!request) return;
      if (!confirm('Excluir item?')) return;
      try {
          await apiService.deleteChecklist(request.id, itemId);
          setChecklists(prev => prev.filter(c => c.id !== itemId));
      } catch (err) {
          console.error(err);
          alert(`Erro ao excluir item: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
  };

  // Admin Update details
  const handleUpdateDetails = async () => {
    if (!request) return;
    try {
        const selectedTech = technicians.find(t => t.id === editResponsibleId);
        const responsibleName = selectedTech ? selectedTech.name : request.responsibleName;

        await apiService.updateRequestDetails(request.id, {
            priority: editPriority,
            responsibleId: editResponsibleId,
            responsibleName: responsibleName
        });
        await reloadRequest();
        setIsEditingDetails(false);
        alert('Detalhes atualizados com sucesso!');
    } catch (err) {
        alert('Erro ao atualizar detalhes.');
    }
  };

  // Scheduling functions
  const handleSchedule = async () => {
    if (!request) return;
    if (!schedulingDate || !schedulingTime) {
      alert('Selecione data e hora para agendar.');
      return;
    }
      const dateTime = new Date(`${schedulingDate}T${schedulingTime}:00`).toISOString();
      const dateFormatted = new Date(dateTime).toLocaleString();
      const historyMsg = schedulingDescription
        ? `Agendado para: ${dateFormatted}. Serviços previstos: ${schedulingDescription}`
        : `Agendado para: ${dateFormatted}`;

      try {
        await apiService.updateRequestStatus(
          request.id,
          RequestStatus.AGENDADA,
          historyMsg,
          undefined,
          undefined,
          dateTime // Pass scheduledAt
        );
        await reloadRequest();
        setScheduleSuccess(true);
        setSchedulingDescription(''); // Clear description
        setTimeout(() => setScheduleSuccess(false), 3000);
        // alert('Chamado agendado com sucesso!');
    } catch (err) {
      alert('Erro ao agendar chamado');
    }
  };
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

  const handleAcceptRequest = async () => {
    if (!request || !currentUser) return;
    try {
        // 1. Assign to self
        await apiService.assignRequest(request.id, currentUser.id, currentUser.name);
        // 2. Update status to IN PROGRESS
        await apiService.updateRequestStatus(request.id, RequestStatus.EM_ANDAMENTO);
        await reloadRequest();
        alert('Chamado aceito! Você é o responsável.');
    } catch (err) {
        alert('Erro ao aceitar chamado.');
    }
  };

  const handleReleaseRequest = async () => {
      if (!request) return;
      if (!confirm('Deseja cancelar a aceitação e liberar este chamado?')) return;
      try {
          // 1. Unassign (backend handles "REMOVE")
          await apiService.assignRequest(request.id, "REMOVE", "REMOVE");
          // 2. Set status back to OPEN
          await apiService.updateRequestStatus(request.id, RequestStatus.ABERTA);
          await reloadRequest();
          alert('Chamado liberado com sucesso.');
      } catch (err) {
          alert('Erro ao liberar chamado.');
      }
  };

  const handleConcludeService = async () => {
    if (!request) return;
    if (!technicalReport) {
      alert('Por favor, descreva o serviço realizado no Relatório Técnico.');
      return;
    }

    // ENFORCE SIGNATURES for Omega Pro Max
    if (!request.assinaturaCliente) {
      alert('A assinatura do CLIENTE é obrigatória para concluir o chamado. Vá para a aba "Conclusão" e colha a assinatura.');
      setActiveTab('assinatura');
      return;
    }

    if (!request.assinaturaTecnico) {
      alert('A sua assinatura (TÉCNICO) é obrigatória para concluir o chamado. Vá para a aba "Conclusão" e assine.');
      setActiveTab('assinatura');
      return;
    }

    try {
      // Ensure all current values are sent to prevent rollback
      await apiService.updateRequestStatus(
        request.id,
        RequestStatus.CONCLUIDA,
        technicalReport,
        materialsUsed,
        nextMaintenanceAt || undefined,
        request.scheduledAt ? new Date(request.scheduledAt).toISOString() : undefined,
        preventiveDone
      );

      // Update local state before showing success
      if (onUpdateStatus) onUpdateStatus(RequestStatus.CONCLUIDA);

      // Full reload to ensure UI is in sync
      await reloadRequest();

      alert('Chamado concluído com sucesso!');
    } catch (err: any) {
      console.error("Conclude error:", err);
      alert('Erro ao concluir chamado: ' + (err.message || 'Erro interno'));
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

  const handleDeleteRequest = async () => {
    if (!request) return;
    if (!confirm('ATENÇÃO: Deseja realmente excluir este chamado permanentemente? Esta ação não pode ser desfeita.')) return;

    try {
        await apiService.deleteRequest(request.id);
        alert('Chamado excluído com sucesso.');
        navigate(-1);
    } catch (err) {
        alert('Erro ao excluir chamado.');
    }
  };

  // Attachment functions
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !request) return;

    setIsUploadingAttachment(true);
    try {
      for (const file of Array.from(files) as File[]) {
        let type = 'anexo';
        if (file.name.toLowerCase().includes('orcamento')) type = 'orcamento';
        else if (file.name.toLowerCase().includes('laudo') || file.name.toLowerCase().includes('concluido')) type = 'laudo';

        await apiService.uploadAttachment(request.id, file, type, request.numero?.toString());
      }
      // Reload attachments
      const data = await apiService.getAttachments(request.id);
      setAttachments(data || []);
      alert('Arquivo(s) enviado(s) com sucesso!');
    } catch (err) {
      console.error('Upload failed:', err);
      alert(`Erro ao enviar arquivo: ${err instanceof Error ? err.message : String(err)}`);
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
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-slate-800">Chamado #{request.numero || request.id.slice(0, 6)}</h2>
            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap ${request.status === RequestStatus.ABERTA ? 'bg-blue-100 text-blue-700' :
              request.status === RequestStatus.EM_ANDAMENTO ? 'bg-amber-100 text-amber-700' :
                request.status === RequestStatus.CONCLUIDA ? 'bg-emerald-100 text-emerald-700' :
                  request.status === RequestStatus.AGENDADA ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                    'bg-slate-100 text-slate-700'
              }`}>{request.status}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex flex-col gap-1.5 mt-1">
             <span className="text-slate-500">{request.clientName}</span>

             {request.client?.endereco ? (
                <div className="bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg flex items-start gap-1.5 w-full">
                    <span className="text-xs mt-0.5">📍</span>
                    <div className="flex-1 leading-relaxed">
                        <span className="font-bold mr-1">Endereço:</span>
                        {`${request.client.endereco.street}, ${request.client.endereco.number} - ${request.client.endereco.district}, ${request.client.endereco.city}/${request.client.endereco.state}`}
                    </div>
                </div>
             ) : (
                <div className="bg-rose-50 text-rose-600 px-2 py-1.5 rounded-lg flex items-center gap-1.5 w-full font-bold">
                    <AlertTriangle className="w-3 h-3" />
                     Endereço não cadastrado
                </div>
             )}

             {request.equipments?.[0]?.equipamento?.location && (
                <div className="bg-blue-50 text-blue-600 px-2 py-1.5 rounded-lg flex items-start gap-1.5 w-full">
                    <span className="text-xs mt-0.5">🔧</span>
                     <div className="flex-1 leading-relaxed">
                        <span className="font-bold mr-1">Local:</span>
                        {request.equipments[0].equipamento.location}
                     </div>
                </div>
             )}
          </div>
        </div>
        <button
          onClick={() => window.open(`/print/os/${request.id}`, '_blank')}
          className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          title="Imprimir Ordem de Serviço"
        >
          <Printer className="w-5 h-5" />
        </button>
        {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PRESTADOR) && (
            <button
                onClick={handleDeleteRequest}
                className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-colors"
                title="Excluir Chamado (Admin/Prestador)"
            >
                <Trash2 className="w-5 h-5" />
            </button>
        )}
      </div>

      {/* Tab Navigation - Workflow Enforced */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'info' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <Info className="w-4 h-4" /> Informações
        </button>
        <button
          onClick={() => setActiveTab('orcamento')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'orcamento' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <DollarSign className="w-4 h-4" /> Orçamento
        </button>
        <button
          onClick={() => setActiveTab('agendamento')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'agendamento' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Calendar className="w-4 h-4" /> Agendamento
        </button>
        <button
          onClick={() => setActiveTab('assinatura')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'assinatura' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <CheckCircle className="w-4 h-4" /> Conclusão
        </button>
        <button
          onClick={() => setActiveTab('nfse')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'nfse' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Nota Fiscal
        </button>
        <button
          onClick={() => setActiveTab('anexos')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'anexos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <Paperclip className="w-4 h-4" /> Anexos
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
              <h4 className="font-black text-slate-800 text-sm mb-3 flex justify-between items-center">
                  Detalhes
                  {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PRESTADOR) && (
                      <button onClick={() => {
                          if (isEditingDetails) handleUpdateDetails();
                          else {
                              setEditPriority(request.priority);
                              setEditResponsibleId(request.responsibleId || '');
                              setIsEditingDetails(true);
                          }
                      }} className="text-blue-600 text-[10px] font-bold uppercase hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                          {isEditingDetails ? 'Salvar Alterações' : 'Editar Detalhes'}
                      </button>
                  )}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Prioridade</span>
                  {isEditingDetails ? (
                      <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value)}
                          className="w-full mt-1 p-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                          <option value="BAIXA">BAIXA (72h)</option>
                          <option value="MEDIA">MEDIA (48h)</option>
                          <option value="ALTA">ALTA (24h)</option>
                          <option value="EMERGENCIAL">EMERGENCIAL (6h)</option>
                      </select>
                  ) : (
                      <p className={`text-sm font-black mt-1 ${request.priority === 'EMERGENCIAL' ? 'text-rose-600' :
                        request.priority === 'ALTA' ? 'text-orange-600' :
                          request.priority === 'MEDIA' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>{request.priority}</p>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Criado em</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Técnico</span>
                  {isEditingDetails ? (
                      <select
                          value={editResponsibleId}
                          onChange={(e) => setEditResponsibleId(e.target.value)}
                          className="w-full mt-1 p-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                          <option value="REMOVE">Não atribuído</option>
                          {technicians.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                      </select>
                  ) : (
                      <p className="text-sm font-bold text-slate-800 mt-1">{request.responsibleName || 'Não atribuído'}</p>
                  )}
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

            {/* Contacts & Address - FINAL FIX */}
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3 uppercase tracking-widest">Contatos & Localização</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Card */}
                  <div className="bg-slate-50 p-6 rounded-[2rem] flex items-center gap-4 border border-slate-100 shadow-sm">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-md shadow-blue-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-lg uppercase tracking-tight">{request.clientName}</p>
                      <div className="flex flex-col gap-1 mt-1">
                          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                             {formatPhone(request.client?.phone) || 'Sem Telefone'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                             {request.client?.email || 'Sem E-mail'}
                          </p>
                      </div>
                    </div>
                  </div>

                  {/* Address Card */}
                  <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-colors">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-[4rem]"></div>

                     <div className="flex gap-4 relative z-10">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                        </div>

                        <div className="flex-1">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço de atendimento</p>
                           {request.client?.endereco ? (
                              <div className="space-y-1">
                                 <p className="text-base font-black text-slate-800 leading-tight">
                                    {request.client.endereco.street}, {request.client.endereco.number}
                                 </p>
                                 {request.client.endereco.complement && (
                                    <p className="text-xs font-bold text-slate-500">
                                       {request.client.endereco.complement}
                                    </p>
                                 )}
                                 <div className="flex items-center gap-2 mt-2">
                                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                       {request.client.endereco.district}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                       {request.client.endereco.city}/{request.client.endereco.state}
                                    </span>
                                 </div>
                                 <p className="text-[10px] font-mono font-bold text-slate-400 mt-1">
                                    CEP: {formatCEP(request.client.endereco.zipCode)}
                                 </p>
                              </div>
                           ) : (
                              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                 Endereço não cadastrado
                              </div>
                           )}

                           {/* Equipment Location Hint */}
                           {request.equipments && request.equipments.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                 <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                     Ambiente: {request.equipments.map(e => e.equipamento?.location).filter(Boolean).join(', ')}
                                 </p>
                              </div>
                           )}
                        </div>
                     </div>
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

            {/* History Section */}
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Histórico de Eventos</h4>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 max-h-60 overflow-y-auto space-y-4">
                  <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
                    {/* Fetch history dynamically */}
                    {[... (request.history || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((h: any, i: number) => (
                        <div key={i} className="relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></div>
                            <p className="text-xs font-bold text-slate-800">{h.action}</p>
                            <p className="text-[10px] text-slate-500">{h.details}</p>
                            <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">{new Date(h.timestamp).toLocaleString()} • {h.userName}</p>
                        </div>
                    ))}
                    {(!request.history || request.history.length === 0) && (
                        <p className="text-xs text-slate-400 italic">Nenhum evento registrado.</p>
                    )}
                  </div>
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
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 group-hover:border-blue-200 group-hover:scale-110 transition-transform">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-black text-slate-700 text-xs uppercase tracking-widest">Imprimir</span>
                      <span className="text-xs text-slate-500 font-medium">Ordem de Serviço</span>
                    </div>
                </button>
                {/* Outros botões de documentos */}
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

               {/* Navigation Button */}
               <div className="flex justify-end pt-4 border-t border-slate-100 mt-6 md:col-span-3">
                    <button
                        onClick={() => setActiveTab('orcamento')}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                    >
                        Próxima Etapa: Orçamento <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
               </div>
            </section>

            {/* Action Buttons (Accept/Refuse/Start/Conclude) - Only for Technicians/Providers/Admins */}
            {(currentUser.role === UserRole.TECNICO || currentUser.role === UserRole.PRESTADOR || currentUser.role === UserRole.ADMIN) && (
              <div className="space-y-4 pt-4 border-t border-slate-100">

                {/* New Technician Workflow */}

                {/* 1. Unassigned: Show Accept */}
                {(!request.responsibleId || request.responsibleId === 'REMOVE') && (
                  <button
                    onClick={handleAcceptRequest}
                    className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Aceitar Chamado
                  </button>
                )}

                {/* 2. Assigned to Me: Show Release/Cancel */}
                {request.responsibleId === currentUser.id && request.status !== RequestStatus.CONCLUIDA && request.status !== RequestStatus.CANCELADA && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <p className="text-xs font-bold uppercase tracking-wide">Chamado em Andamento (Sua Responsabilidade)</p>
                    </div>

                    <button
                      onClick={handleReleaseRequest}
                      className="w-full py-4 bg-white text-rose-500 border-2 border-rose-100 font-black rounded-2xl uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 transition-colors"
                    >
                      Liberar / Cancelar Atendimento
                    </button>
                  </div>
                )}

                {/* Conclude Form moved to 'Conclusão' tab */}

                {/* View Result if concluded */}
                {request.status === RequestStatus.CONCLUIDA && (
                  <div className="space-y-4">
                    <section>
                      <h4 className="font-black text-slate-800 text-sm mb-3">Resumo do Fechamento</h4>
                      <div className="bg-emerald-50 rounded-[2rem] border border-emerald-100 overflow-hidden divide-y divide-emerald-100/50">
                        {request.observation && (
                          <div className="p-5">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Relatório Técnico</span>
                            <p className="text-sm text-slate-700 leading-relaxed">{request.observation}</p>
                          </div>
                        )}
                        {request.materialsUsed && (
                          <div className="p-5">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Materiais Utilizados</span>
                            <p className="text-sm text-slate-700 leading-relaxed font-bold">{request.materialsUsed}</p>
                          </div>
                        )}
                        {request.nextMaintenanceAt && (
                          <div className="p-5 bg-emerald-100/30">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Próxima Manutenção</span>
                            <p className="text-sm font-black text-emerald-800">
                              {new Date(request.nextMaintenanceAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ORCAMENTO TAB */}
        {activeTab === 'orcamento' && (
          <div className="p-6 space-y-6 pb-32">
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
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição do Item</label>
                    <input
                      type="text"
                      placeholder="Descrição do item"
                      value={newItem.descricao}
                      onChange={e => setNewItem({ ...newItem, descricao: e.target.value })}
                      className="w-full p-4 bg-slate-50 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Quantidade</label>
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={newItem.quantidade}
                        onChange={e => setNewItem({ ...newItem, quantidade: parseFloat(e.target.value) || 1 })}
                        className="w-full p-4 bg-slate-50 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor Unitário R$</label>
                      <input
                        type="number"
                        placeholder="Valor Unit R$"
                        value={newItem.valorUnit || ''}
                        onChange={e => setNewItem({ ...newItem, valorUnit: parseFloat(e.target.value) || 0 })}
                        className="w-full p-4 bg-slate-50 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
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

            {/* Navigation for Technician */}
            {canManageBudget && (
                 <button
                   onClick={() => setActiveTab('assinatura')}
                   className="w-full mt-6 py-4 bg-slate-800 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                 >
                   Ir para Execução / Conclusão ➜
                 </button>
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
          <div className="p-6 space-y-6 pb-32">
            {/* Existing Signatures */}
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Assinaturas Registradas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Finalization Form - Checklist & Details */}
            <section className="space-y-6">
                <div>
                     <h4 className="font-black text-slate-800 text-sm mb-3 flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            Checklist de Execução
                            <div className="flex gap-2 ml-4">
                                <button onClick={() => loadChecklistPreset('preventiva')} className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold rounded-full hover:bg-emerald-200 hover:scale-105 transition-all shadow-sm flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Preventiva
                                </button>
                                <button onClick={() => loadChecklistPreset('instalacao')} className="px-3 py-1 bg-cyan-100 text-cyan-700 text-[10px] uppercase font-bold rounded-full hover:bg-cyan-200 hover:scale-105 transition-all shadow-sm flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Instalação
                                </button>
                            </div>
                        </div>
                        <button onClick={handleAddChecklist} className="bg-blue-600 text-white text-[10px] font-bold uppercase hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-md transition-all">+ Novo Item</button>
                        {checklists.length > 0 && (
                            <button onClick={handleClearChecklist} className="ml-2 text-rose-500 hover:text-rose-700 p-1 rounded-full hover:bg-rose-50 transition-colors" title="Limpar Tudo">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                     </h4>

                     <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        {(checklists.length === 0 && !newChecklistDesc) && (
                            <p className="p-4 text-xs text-slate-400 text-center">Nenhum item na checklist.</p>
                        )}
                        {checklists.map(item => (
                            <div key={item.id} className="p-3 border-b border-slate-100 flex items-center gap-3 hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={item.checked}
                                    onChange={(e) => handleToggleChecklist(item.id, e.target.checked)}
                                    className="w-5 h-5 rounded-md border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className={`flex-1 text-sm font-medium ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.description}</span>
                                <button onClick={() => handleDeleteChecklist(item.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                        <div className="p-3 bg-slate-50 flex gap-2">
                             <input
                                type="text"
                                value={newChecklistDesc}
                                onChange={(e) => setNewChecklistDesc(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                                placeholder="Adicionar item..."
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                             />
                             <button onClick={handleAddChecklist} className="bg-white text-slate-400 p-1 rounded-full shadow-sm hover:text-blue-500"><Plus className="w-4 h-4" /></button>
                        </div>
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-black text-slate-800 text-sm mb-2">Materiais Utilizados</h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {["Gás R410A", "Gás R22", "Capacitor 35uF", "Tubulação 1/4", "Tubulação 3/8", "Isolamento", "Cabo PP", "Suporte"].map(item => (
                                <button
                                    key={item}
                                    onClick={() => addTextSuggestion(materialsUsed, setMaterialsUsed, item, 'material')}
                                    className="px-3 py-1.5 bg-white shadow-sm hover:shadow-md hover:scale-105 text-slate-600 hover:text-cyan-600 text-[11px] font-bold rounded-full border border-slate-200 transition-all"
                                >
                                    + {item}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição dos Materiais</label>
                            <input
                                type="text"
                                className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-slate-800 border-none outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                                placeholder="Ex: 2m Tubulação, 1 Capacitor..."
                                value={materialsUsed}
                                onChange={(e) => setMaterialsUsed(e.target.value)}
                                onBlur={() => saveProgress(technicalReport, materialsUsed)}
                            />
                            {isSaving && <div className="absolute right-3 top-3 text-[10px] text-emerald-500 font-bold animate-pulse">Salvando...</div>}
                        </div>
                      </div>
                     <div>
                        <h4 className="font-black text-slate-800 text-sm mb-2">Manutenção Preventiva</h4>

                        <label className={`flex items-start gap-3 p-4 border rounded-2xl cursor-pointer transition-all mb-3 ${preventiveDone ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors mt-0.5 ${preventiveDone ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                                {preventiveDone && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                             <input
                                type="checkbox"
                                className="hidden"
                                checked={preventiveDone}
                                onChange={(e) => {
                                    setPreventiveDone(e.target.checked);
                                    if(e.target.checked) setNextMaintenanceAt(''); // Clear manual date if auto is selected
                                }}
                            />
                            <div>
                                <p className={`font-black text-sm ${preventiveDone ? 'text-emerald-900' : 'text-slate-700'}`}>Realizei Preventiva</p>
                                <p className={`text-xs mt-0.5 ${preventiveDone ? 'text-emerald-700' : 'text-slate-400'}`}>
                                    O sistema calculará automaticamente a próxima data com base na periodicidade padrão ou do equipamento.
                                </p>
                            </div>
                        </label>

                        {!preventiveDone && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Ou agende manualmente</p>
                                <div className="flex gap-2 mb-2">
                                {[90, 180, 365].map(days => (
                                    <button
                                        key={days}
                                        onClick={() => {
                                            const d = new Date();
                                            d.setDate(d.getDate() + days);
                                            setNextMaintenanceAt(d.toISOString().split('T')[0]);
                                        }}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] uppercase font-bold rounded-lg transition-colors"
                                    >
                                        +{days}d
                                    </button>
                                ))}
                                </div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Próxima Revisão Recomendada</label>
                                <input
                                    type="date"
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-slate-800 border-none outline-none focus:ring-2 focus:ring-cyan-500"
                                    value={nextMaintenanceAt}
                                    onChange={(e) => setNextMaintenanceAt(e.target.value)}
                                />
                            </div>
                        )}
                     </div>
                </div>

                <div>
                    <h4 className="font-black text-slate-800 text-sm mb-2">Relatório Técnico</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {["Higienização completa", "Carga de gás efetuada", "Troca de capacitor", "Instalação concluída", "Testes de funcionamento OK", "Dreno desobstruído"].map(item => (
                            <button
                                key={item}
                                onClick={() => addTextSuggestion(technicalReport, setTechnicalReport, item, 'report')}
                                className="px-3 py-1.5 bg-white shadow-sm hover:shadow-md hover:scale-105 text-slate-600 hover:text-cyan-600 text-[11px] font-bold rounded-full border border-slate-200 transition-all"
                            >
                                + {item}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição do Serviço Realizado</label>
                        <textarea
                            className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-slate-800 min-h-[100px] border-none outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                            placeholder="Descreva o serviço realizado..."
                            value={technicalReport}
                            onChange={(e) => setTechnicalReport(e.target.value)}
                            onBlur={() => saveProgress(technicalReport, materialsUsed)}
                        ></textarea>
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

              {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.TECNICO) && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                      <button
                          onClick={handleAdminAdvance}
                          className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 hover:text-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                          <CheckCircle className="w-4 h-4" />
                          Avançar Administrativamente (Sem Assinatura)
                      </button>
                      <p className="text-[10px] text-center text-slate-400 mt-2">Use esta opção apenas se o cliente não puder assinar digitalmente.</p>
                  </div>
              )}
            </section>


            {/* Conclude Button */}
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.TECNICO || currentUser.role === UserRole.PRESTADOR) && (
                 <div className="mt-8 pt-6 border-t border-slate-200">
                     <button
                         onClick={handleConcludeService}
                         className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                     >
                         <CheckCircle className="w-6 h-6" />
                         Finalizar e Concluir Chamado
                     </button>
                     <p className="text-[10px] text-center text-slate-400 mt-2">
                        Ao concluir, o status será alterado para CONCLUÍDA e o cliente será notificado.
                     </p>
                 </div>
            )}
          </div>
        )}

        {/* NFS-e TAB */}
        {activeTab === 'nfse' && (
          <div className="p-6 space-y-6 pb-32">
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
            {/* Navigation Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                    onClick={() => setActiveTab('agendamento')}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                >
                    Próxima Etapa: Agendamento <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
            </div>
          </div>
        )}

        {/* AGENDAMENTO TAB */}
        {activeTab === 'agendamento' && (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50">
              <h4 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Agendar Atendimento
              </h4>

              {scheduleSuccess && (
                  <div className="mb-4 bg-emerald-100 text-emerald-800 p-4 rounded-xl font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 shadow-sm border border-emerald-200">
                    <CheckCircle className="w-5 h-5" />
                    Agendamento Salvo com Sucesso!
                  </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data</label>
                    <input
                      type="date"
                      className="w-full p-4 bg-white rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 shadow-sm"
                      value={schedulingDate}
                      onChange={(e) => setSchedulingDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Horário</label>
                    <input
                      type="time"
                      className="w-full p-4 bg-white rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 shadow-sm"
                      value={schedulingTime}
                      onChange={(e) => setSchedulingTime(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Serviços Previstos</label>
                    <textarea
                      className="w-full p-4 bg-white rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 shadow-sm resize-none h-24"
                      placeholder="Descreva os serviços a serem realizados neste agendamento..."
                      value={schedulingDescription}
                      onChange={(e) => setSchedulingDescription(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {['Manutenção Preventiva', 'Visita Técnica', 'Orçamento', 'Instalação', 'Limpeza', 'Carga de Gás'].map((sug) => (
                        <button
                          key={sug}
                          onClick={() => {
                            const separator = schedulingDescription.trim().length > 0 ? (schedulingDescription.trim().endsWith(',') || schedulingDescription.trim().endsWith('.') ? ' ' : ', ') : '';
                            setSchedulingDescription(prev => prev + separator + sug);
                          }}
                          className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                   <button
                    onClick={handleSchedule}
                    className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                  >
                    Confirmar Agendamento
                  </button>
                  {request.scheduledAt && (
                      <button
                        className="w-14 bg-white text-rose-500 rounded-2xl border border-rose-100 flex items-center justify-center hover:bg-rose-50"
                        title="Cancelar Agendamento Atual"
                        onClick={() => {
                            if(confirm('Remover agendamento atual?')) {
                                apiService.updateRequestStatus(request.id, request.status, "Agendamento cancelado pelo usuário", undefined, undefined, "NULL").then(reloadRequest);
                            }
                        }}
                      >
                          <Trash2 className="w-5 h-5" />
                      </button>
                  )}
                </div>

                {/* Scheduling History - Specific Filter */}
                <div className="mt-8 pt-6 border-t border-blue-200/50">
                  <h5 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Histórico de Agendamentos
                  </h5>
                  <div className="space-y-3">
                    {request.history
                      ?.filter((h: any) => h.details?.includes('Agendado para') || h.action?.includes('AGENDADA') || h.details?.includes('cancelado'))
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((h: any, i: number) => {
                        const dateObj = h.createdAt ? new Date(h.createdAt) : new Date();
                        const day = !isNaN(dateObj.getTime()) ? dateObj.getDate() : '-';
                        const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : 'Data inválida';

                        return (
                        <div key={i} className="bg-white p-3 rounded-xl border border-blue-100 flex items-center gap-3 shadow-sm">
                           <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs ring-4 ring-white border border-blue-100">
                              {day}
                           </div>
                           <div>
                              <p className="text-xs font-bold text-slate-700">{h.details}</p>
                              <p className="text-[10px] text-slate-400 capitalize font-medium">{dateStr} • {h.userName || 'Sistema'}</p>
                           </div>
                        </div>
                    )})}
                    {(!request.history || !request.history.some((h: any) => h.details?.includes('Agendado para') || h.action?.includes('AGENDADA') || h.details?.includes('cancelado'))) && (
                       <p className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-slate-100 text-center">Nenhum histórico de agendamento disponível.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {request.scheduledAt && (
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center">
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-black uppercase tracking-widest inline-block mb-3">
                  Agendamento Atual
                </span>
                <p className="text-3xl font-black text-slate-800 mb-1">
                  {new Date(request.scheduledAt).toLocaleDateString()}
                </p>
                <p className="text-lg font-bold text-slate-400">
                  {new Date(request.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}

            {/* Navigation Button */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={() => setActiveTab('assinatura')}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                >
                    Próxima Etapa: Conclusão <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
            </div>
          </div>
        )}

        {/* ANEXOS TAB */}
        {/* ANEXOS TAB */}
        {activeTab === 'anexos' && (
          <div className="p-6 space-y-6 pb-32">
            {/* Upload Section */}
            <section>
              <h4 className="font-black text-slate-800 text-sm mb-3">Enviar Arquivos</h4>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
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
                    <span className="text-xs text-slate-400 mt-1">Apenas Imagens e PDF</span>
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedAttachment(attachment)}
                          className="px-3 py-1.5 bg-cyan-100/50 hover:bg-cyan-100 text-cyan-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                           Visualizar
                        </button>
                        <button
                          onClick={() => deleteAttachment(attachment.id)}
                          className="px-3 py-1.5 bg-rose-100/50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
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

        {/* ATTACHMENT MODAL VIEWER */}
        {selectedAttachment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/20">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 shadow-sm border border-slate-200">
                                {isImageFile(selectedAttachment.mimeType) ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> : <FileSpreadsheet className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm truncate max-w-md">{selectedAttachment.fileName}</h3>
                                <p className="text-xs text-slate-400">{formatFileSize(selectedAttachment.fileSize)} • {new Date(selectedAttachment.createdAt).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <a
                                href={selectedAttachment.filePath || selectedAttachment.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="p-2 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
                                title="Baixar Original"
                            >
                                <Download className="w-5 h-5" />
                            </a>
                            <button
                                onClick={() => setSelectedAttachment(null)}
                                className="p-2 hover:bg-rose-100 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-auto p-4 relative">
                        {isImageFile(selectedAttachment.mimeType) ? (
                            <img
                                src={selectedAttachment.filePath || selectedAttachment.externalUrl}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                            />
                        ) : selectedAttachment.mimeType === 'application/pdf' ? (
                            <iframe
                                src={selectedAttachment.filePath || selectedAttachment.externalUrl}
                                className="w-full h-full rounded-lg shadow-sm bg-white"
                                title="PDF Preview"
                            ></iframe>
                        ) : (
                            <div className="text-center">
                                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileSpreadsheet className="w-10 h-10 text-slate-400" />
                                </div>
                                <p className="text-slate-600 font-bold mb-2">Visualização não disponível para este formato.</p>
                                <a
                                    href={selectedAttachment.filePath || selectedAttachment.externalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                                >
                                    Baixar Arquivo
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
