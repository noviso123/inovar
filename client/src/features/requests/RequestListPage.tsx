
import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ServiceRequest, RequestStatus, UserRole } from '@/shared/types';
import { Search, Filter, ClipboardList, CheckCircle, FileText, Clock, AlertCircle } from 'lucide-react';

interface RequestListPageProps {
  requests: ServiceRequest[];
  onSelectRequest: (r: ServiceRequest) => void;
  onCreateNew: () => void;
  rolePrefix: string;
  currentUser: User;
  onRefreshRequests: (filters?: { onlyMine?: boolean }) => Promise<void>;
}

type FilterTab = 'all' | 'active' | 'finalized' | 'concluded' | 'no_invoice' | 'with_invoice';

export const RequestListPage: React.FC<RequestListPageProps> = ({
  requests,
  onSelectRequest,
  onCreateNew,
  rolePrefix,
  currentUser,
  onRefreshRequests
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get initial tab from location state if coming from Dashboard
  const initialTab = (location.state as any)?.initialTab as FilterTab || 'all';
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  // New role-based filter: Tech default to true, Admin default to false, Client hidden
  const isTech = currentUser.role === UserRole.TECNICO;
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const [onlyMine, setOnlyMine] = useState(isTech);

  const toggleOnlyMine = (checked: boolean) => {
    setOnlyMine(checked);
    onRefreshRequests({ onlyMine: checked });
  };

  const filteredItems = useMemo(() => {
    let result = [...requests];

    // Filter by Tab
    switch (activeTab) {
      case 'active':
        result = result.filter(r =>
          r.status !== RequestStatus.CONCLUIDA &&
          r.status !== RequestStatus.FINALIZADA &&
          r.status !== RequestStatus.CANCELADA
        );
        break;
      case 'finalized':
        result = result.filter(r => r.status === RequestStatus.FINALIZADA);
        break;
      case 'concluded':
        result = result.filter(r => r.status === RequestStatus.CONCLUIDA);
        break;
      case 'no_invoice':
        // Requests that are concluded/finalized but have no issued invoice
        result = result.filter(r =>
          (r.status === RequestStatus.CONCLUIDA || r.status === RequestStatus.FINALIZADA) &&
          (!r.notaFiscal || r.notaFiscal.status !== 'EMITIDA')
        );
        break;
      case 'with_invoice':
        result = result.filter(r => r.notaFiscal?.status === 'EMITIDA');
        break;
      default:
        break;
    }

    // Filter by Search
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.clientName?.toLowerCase().includes(lowSearch) ||
        r.id.toLowerCase().includes(lowSearch) ||
        r.numero?.toString().includes(lowSearch) ||
        r.description?.toLowerCase().includes(lowSearch)
      );
    }

    return result;
  }, [requests, activeTab, searchTerm]);

  const tabs = [
    { id: 'all', label: 'Tudo', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'active', label: 'Ativos', icon: <Clock className="w-4 h-4" /> },
    { id: 'concluded', label: 'Concluídos', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'finalized', label: 'Finalizados', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'no_invoice', label: 'Pendente Nota', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'with_invoice', label: 'Com Nota', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20 px-0 md:px-6 max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/${rolePrefix}`)}
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-500 shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Chamados</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Painel de Gestão e Monitoramento</p>
          </div>
        </div>

        <button
          onClick={onCreateNew}
          className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-blue-600 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span> Novo Chamado
        </button>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-1.5 md:p-2 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-x-auto no-scrollbar mx-1 md:mx-0">
        <div className="flex p-1 gap-1 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={`flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/30'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[8px] ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {requests.filter(r => {
                    if (tab.id === 'all') return true;
                    if (tab.id === 'active') return r.status !== RequestStatus.CONCLUIDA && r.status !== RequestStatus.FINALIZADA && r.status !== RequestStatus.CANCELADA;
                    if (tab.id === 'finalized') return r.status === RequestStatus.FINALIZADA;
                    if (tab.id === 'concluded') return r.status === RequestStatus.CONCLUIDA;
                    if (tab.id === 'no_invoice') return (r.status === RequestStatus.CONCLUIDA || r.status === RequestStatus.FINALIZADA) && (!r.notaFiscal || r.notaFiscal.status !== 'EMITIDA');
                    if (tab.id === 'with_invoice') return r.notaFiscal?.status === 'EMITIDA';
                    return false;
                }).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mx-1 md:mx-0">
        <div className="relative group flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Buscar por cliente, OS, descrição..."
            className="block w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* User Role based Filter Checkbox (Admin and Tech only) */}
        {(isAdmin || isTech) && (
          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => toggleOnlyMine(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-100 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">
              {isAdmin ? 'Filtrar meus / não atribuídos' : 'Somente meus chamados / não atribuídos'}
            </span>
          </div>
        )}
      </div>

      {/* List Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-[2rem] md:rounded-[3rem] text-center border-2 border-dashed border-slate-100 mx-1 md:mx-0">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <ClipboardList className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum chamado encontrado</p>
          </div>
        ) : (
          filteredItems.map(req => (
            <div
              key={req.id}
              onClick={() => onSelectRequest(req)}
              className="group bg-white rounded-xl md:rounded-[2rem] p-4 md:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:shadow-2xl hover:border-blue-200 hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden mx-1 md:mx-0"
            >
              {/* Badge for Status */}
              <div className="flex justify-between items-start mb-6">
                <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1.5 rounded-xl">
                        #{req.numero || req.id.slice(0, 6)}
                    </span>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm ${
                    req.status === RequestStatus.ABERTA ? 'bg-cyan-500 text-white shadow-cyan-500/20' :
                    req.status === RequestStatus.EM_ANDAMENTO ? 'bg-orange-500 text-white shadow-orange-500/20' :
                    req.status === RequestStatus.CONCLUIDA ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                    req.status === RequestStatus.FINALIZADA ? 'bg-slate-900 text-white shadow-slate-900/20' :
                    'bg-slate-100 text-slate-500 shadow-slate-100/20'
                  }`}>
                    {req.status}
                </div>
              </div>

              {/* Client Info */}
              <div className="mb-6">
                <h4 className="font-black text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                    {req.clientName}
                </h4>
                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
                    {req.serviceType || 'Serviço não especificado'}
                </p>
              </div>

              {/* Description Preview */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                <p className="text-xs text-slate-500 font-medium line-clamp-3 italic leading-relaxed">
                    "{req.description}"
                </p>
              </div>

              {/* Footer Info */}
              <div className="flex items-center justify-between border-t border-slate-50 pt-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[100px]">
                        {req.responsibleName || 'Aguardando'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                    {req.notaFiscal?.status === 'EMITIDA' ? (
                        <div className="flex items-center gap-1 text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                            <FileCheck className="w-3.5 h-3.5" />
                            <span className="text-[8px] font-black uppercase">NF-e</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-slate-300">
                            <FileX className="w-3.5 h-3.5" />
                            <span className="text-[8px] font-black uppercase">Sem NF</span>
                        </div>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Simple Icon Components to reduce external deps if needed, but we have lucide-react
const UserIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const FileCheck = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const FileX = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
