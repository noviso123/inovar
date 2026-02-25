
import React, { useEffect, useState } from 'react';
import { ServiceRequest, RequestStatus, User, UserRole } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { DollarSign, FileText, ClipboardList, CheckCircle, Calendar } from 'lucide-react';

interface DashboardProps {
  requests: ServiceRequest[];
  onSelectRequest: (request: ServiceRequest) => void;
  currentUser: User;
  onNavigate: (path: string, state?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ requests, onSelectRequest, currentUser, onNavigate }) => {
  const [earnings, setEarnings] = useState<string>('---');

  const isClient = currentUser.role === UserRole.CLIENTE;
  const isTech = currentUser.role === UserRole.TECNICO;
  const isProvider = currentUser.role === UserRole.PRESTADOR || currentUser.role === UserRole.ADMIN;

  // Stats
  const openRequests = (requests || []).filter(r => r.status === RequestStatus.ABERTA || r.status === RequestStatus.PENDENTE).length;
  const inProgressRequests = (requests || []).filter(r =>
    r.status === RequestStatus.EM_ANDAMENTO ||
    r.status === RequestStatus.AGENDADA ||
    r.status === RequestStatus.ATRIBUIDA ||
    r.status === RequestStatus.ACEITA
  ).length;
  const completedRequests = (requests || []).filter(r => r.status === RequestStatus.CONCLUIDA).length;

  // Load earnings for providers
  useEffect(() => {
    if (isProvider) {
      apiService.getFinanceSummary()
        .then(data => setEarnings(`R$ ${data.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`))
        .catch(() => setEarnings('R$ 0,00'));
    }
  }, [isProvider]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-0 md:px-6 max-w-[1920px] mx-auto">
      {/* Header with Avatar */}
      <div className="flex items-center gap-4 bg-white/50 p-2 md:p-3 rounded-[2rem] border border-slate-100/50 backdrop-blur-sm mx-1 md:mx-0">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-200 overflow-hidden border-2 border-slate-100 shadow-lg shrink-0">
          {currentUser.avatarUrl ? (
            <img src={currentUser.avatarUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-lg md:text-xl">
              {currentUser.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight truncate">
            Olá, {currentUser.name?.split(' ')[0] || 'Usuário'}
          </h2>
          <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">
            {isClient ? 'Área do Cliente' : isTech ? 'Área do Técnico' : 'Painel de Gestão'}
          </p>
        </div>
        <button
          onClick={() => onNavigate('perfil')}
          className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>

      {/* Stats Grid - Adaptive: 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6 mx-1 md:mx-0">
        {/* Card 1: Earnings (Provider) or Open Requests (Client/Tech) */}
        {isProvider ? (
          <div
            onClick={() => onNavigate('financeiro')}
            className="group relative bg-white p-6 rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-900/5 flex flex-col justify-between h-40 md:h-44 cursor-pointer hover:shadow-emerald-900/20 hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="w-12 h-12 bg-emerald-600 shadow-lg shadow-emerald-600/30 text-white rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:rotate-12">
              <DollarSign className="w-7 h-7" />
            </div>
            <div className="relative z-10">
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tighter">{earnings}</p>
              <p className="text-[10px] text-emerald-600/60 font-black uppercase tracking-[0.2em] mt-1">Saldo a Receber</p>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('chamados', { initialTab: 'all' })}
            className="group relative bg-white p-6 rounded-[2.5rem] border border-cyan-100 shadow-xl shadow-cyan-900/5 flex flex-col justify-between h-40 md:h-44 cursor-pointer hover:shadow-cyan-900/20 hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
          >
             <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="w-12 h-12 bg-cyan-600 shadow-lg shadow-cyan-600/30 text-white rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:rotate-12">
              <FileText className="w-7 h-7" />
            </div>
            <div className="relative z-10">
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{openRequests + inProgressRequests}</p>
              <p className="text-[10px] text-cyan-600/60 font-black uppercase tracking-[0.2em] mt-1">Total de Chamados</p>
            </div>
          </div>
        )}

        {/* Card 2: Open/Available */}
        <div
          onClick={() => onNavigate('chamados', { initialTab: 'active' })}
          className="group relative bg-white p-6 rounded-[2.5rem] border border-orange-100 shadow-xl shadow-orange-900/5 flex flex-col justify-between h-40 md:h-44 cursor-pointer hover:shadow-orange-900/20 hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="w-12 h-12 bg-orange-500 shadow-lg shadow-orange-500/30 text-white rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:-rotate-12">
            <ClipboardList className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black text-slate-800 tracking-tighter">{openRequests}</p>
            <p className="text-[10px] text-orange-600/60 font-black uppercase tracking-[0.2em] mt-1">{isClient ? 'Em Aberto' : 'Disponíveis'}</p>
          </div>
        </div>

        {/* Card 3: In Progress / Scheduled */}
        <div
          onClick={() => onNavigate(isTech || isProvider ? 'agenda' : 'chamados', { initialTab: 'active' })}
          className="group relative bg-white p-6 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-900/5 flex flex-col justify-between h-40 md:h-44 cursor-pointer hover:shadow-blue-900/20 hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="w-12 h-12 bg-blue-600 shadow-lg shadow-blue-600/30 text-white rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:scale-110">
             <Calendar className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black text-slate-800 tracking-tighter">{inProgressRequests}</p>
            <p className="text-[10px] text-blue-600/60 font-black uppercase tracking-[0.2em] mt-1">{isClient ? 'Em Andamento' : 'Agendados'}</p>
          </div>
        </div>

        {/* Card 4: Completed */}
        <div
          onClick={() => onNavigate('chamados', { initialTab: 'finalized' })}
          className="group relative bg-white p-6 rounded-[2.5rem] border border-slate-900 shadow-2xl shadow-slate-900/10 flex flex-col justify-between h-40 md:h-44 cursor-pointer hover:shadow-slate-900/20 hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="w-12 h-12 bg-slate-900 shadow-lg shadow-slate-900/50 text-white rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:rotate-12">
            <CheckCircle className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black text-slate-800 tracking-tighter">{completedRequests}</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Total Finalizados</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {isClient && (
        <div className="mt-4 mx-1 md:mx-0">
          <button
            onClick={() => onNavigate('chamados/novo')}
            className="w-full py-4 md:py-5 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-emerald-600 transition-colors active:scale-95 text-xs md:text-base"
          >
            + Abrir Nova Solicitação
          </button>
        </div>
      )}

      {/* Próximos Agendamentos - Redesigned */}
      <div className="mt-6 mx-1 md:mx-0">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-sm font-black text-slate-800">Próximo Atendimento</h3>
          <button
            onClick={() => onNavigate('agenda')}
            className="text-[10px] font-bold text-blue-600 uppercase tracking-widest"
          >
            Ver mais
          </button>
        </div>
        <div className="space-y-3">
          {(requests || [])
            .filter(r => (r.status === RequestStatus.EM_ANDAMENTO || r.status === RequestStatus.ATRIBUIDA || r.status === RequestStatus.AGENDADA) && r.scheduledAt)
            .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
            .slice(0, 3)
            .length === 0 ? (
            <div className="text-center py-6 text-slate-300 text-xs font-bold uppercase bg-white rounded-2xl border border-slate-100">
              Nenhum agendamento próximo
            </div>
          ) : (
            (requests || [])
              .filter(r => (r.status === RequestStatus.EM_ANDAMENTO || r.status === RequestStatus.ATRIBUIDA || r.status === RequestStatus.AGENDADA) && r.scheduledAt)
              .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
              .slice(0, 3)
              .map(r => (
              <div
                key={r.id}
                onClick={() => onSelectRequest(r)}
                className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 cursor-pointer hover:border-cyan-200 transition-all active:scale-95"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg">
                      {r.clientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm">{r.clientName}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                        {r.client?.endereco
                          ? `${r.client.endereco.street}, ${r.client.endereco.number} - ${r.client.endereco.district}, ${r.client.endereco.city}/${r.client.endereco.state} (CEP: ${r.client.endereco.zipCode})`
                          : (r.equipments?.[0]?.equipamento?.location || 'Endereço não informado')}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-300">#{r.numero || r.id.slice(0, 6)}</span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Data do atendimento</p>
                    <p className="text-sm font-bold text-slate-600">
                      {r.scheduledAt
                        ? new Date(r.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + new Date(r.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : 'Não agendado'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 mx-1 md:mx-0">
        <h3 className="text-sm font-black text-slate-800 mb-4 px-1">Atividade Recente</h3>
        <div className="space-y-2 md:space-y-3">
          {(requests || []).slice(0, 3).length === 0 ? (
            <div className="text-center py-8 text-slate-300 text-xs font-bold uppercase bg-white rounded-2xl border border-slate-100">
              Nenhuma atividade recente
            </div>
          ) : (
            (requests || []).slice(0, 3).map(r => (
              <div
                key={r.id}
                onClick={() => onSelectRequest(r)}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${r.status === RequestStatus.ABERTA ? 'bg-blue-500' :
                  r.status === RequestStatus.EM_ANDAMENTO ? 'bg-amber-500' :
                    r.status === RequestStatus.CONCLUIDA ? 'bg-emerald-500' :
                      'bg-slate-300'
                  }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{r.clientName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{r.description}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase shrink-0 ${r.status === RequestStatus.ABERTA ? 'bg-blue-100 text-blue-700' :
                  r.status === RequestStatus.EM_ANDAMENTO ? 'bg-amber-100 text-amber-700' :
                    r.status === RequestStatus.CONCLUIDA ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                  }`}>{r.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
