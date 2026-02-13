
import React, { useEffect, useState } from 'react';
import { ServiceRequest, RequestStatus, User, UserRole } from '../types';
import { apiService } from '../services/apiService';
import { DollarSign, FileText, ClipboardList, CheckCircle, Calendar } from 'lucide-react';

interface DashboardProps {
  requests: ServiceRequest[];
  onSelectRequest: (request: ServiceRequest) => void;
  currentUser: User;
  onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ requests, onSelectRequest, currentUser, onNavigate }) => {
  const [earnings, setEarnings] = useState<string>('---');

  const isClient = currentUser.role === UserRole.CLIENTE;
  const isTech = currentUser.role === UserRole.TECNICO;
  const isProvider = currentUser.role === UserRole.PRESTADOR || currentUser.role === UserRole.ADMIN;

  // Stats
  const openRequests = requests.filter(r => r.status === RequestStatus.ABERTA || r.status === RequestStatus.PENDENTE).length;
  const inProgressRequests = requests.filter(r => r.status === RequestStatus.EM_ANDAMENTO).length;
  const completedRequests = requests.filter(r => r.status === RequestStatus.CONCLUIDA).length;

  // Load earnings for providers
  useEffect(() => {
    if (isProvider) {
      apiService.getFinanceSummary()
        .then(data => setEarnings(`R$ ${data.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`))
        .catch(() => setEarnings('R$ 0,00'));
    }
  }, [isProvider]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-8">
      {/* Header with Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-800 overflow-hidden border-2 border-cyan-500/20 shadow-lg shadow-cyan-500/10">
          {currentUser.avatarUrl ? (
            <img src={currentUser.avatarUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-black text-slate-500 text-xl bg-slate-900">
              {currentUser.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black text-white tracking-tight">
            Olá, {currentUser.name?.split(' ')[0] || 'Usuário'}
          </h2>
          <p className="text-xs text-slate-400 font-bold">
            {isClient ? 'Área do Cliente' : isTech ? 'Área do Técnico' : 'Painel de Gestão'}
          </p>
        </div>
        <button
          onClick={() => onNavigate('perfil')}
          className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-400/50 transition-colors bg-white/5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>

      {/* Stats Grid - Adaptive: 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1: Earnings (Provider) or Open Requests (Client/Tech) */}
        {isProvider ? (
          <div
            onClick={() => onNavigate('financeiro')}
            className="group relative bg-slate-800/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-emerald-500/20 shadow-xl shadow-black/20 flex flex-col justify-between h-44 cursor-pointer hover:bg-slate-800/60 hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 blur-2xl"></div>
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:rotate-12">
              <DollarSign className="w-7 h-7" />
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-black text-white tracking-tighter sm:text-3xl drop-shadow-lg">{earnings}</p>
              <p className="text-[10px] text-emerald-400/80 font-black uppercase tracking-[0.2em] mt-1">Saldo a Receber</p>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('chamados')}
            className="group relative bg-slate-800/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-cyan-500/20 shadow-xl shadow-black/20 flex flex-col justify-between h-44 cursor-pointer hover:bg-slate-800/60 hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
          >
             <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 blur-2xl"></div>
            <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:rotate-12">
              <FileText className="w-7 h-7" />
            </div>
            <div className="relative z-10">
              <p className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">{openRequests + inProgressRequests}</p>
              <p className="text-[10px] text-cyan-400/80 font-black uppercase tracking-[0.2em] mt-1">Total de Chamados</p>
            </div>
          </div>
        )}

        {/* Card 2: Open/Available */}
        <div
          onClick={() => onNavigate('chamados')}
          className="group relative bg-slate-800/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-orange-500/20 shadow-xl shadow-black/20 flex flex-col justify-between h-44 cursor-pointer hover:bg-slate-800/60 hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 blur-2xl"></div>
          <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:-rotate-12">
            <ClipboardList className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">{openRequests}</p>
            <p className="text-[10px] text-orange-400/80 font-black uppercase tracking-[0.2em] mt-1">{isClient ? 'Em Aberto' : 'Disponíveis'}</p>
          </div>
        </div>

        {/* Card 3: In Progress / Scheduled */}
        <div
          onClick={() => onNavigate(isTech || isProvider ? 'agenda' : 'chamados')}
          className="group relative bg-slate-800/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-blue-500/20 shadow-xl shadow-black/20 flex flex-col justify-between h-44 cursor-pointer hover:bg-slate-800/60 hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 blur-2xl"></div>
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:scale-110">
             <Calendar className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">{inProgressRequests}</p>
            <p className="text-[10px] text-blue-400/80 font-black uppercase tracking-[0.2em] mt-1">{isClient ? 'Em Andamento' : 'Agendados'}</p>
          </div>
        </div>

        {/* Card 4: Completed */}
        <div
          onClick={() => onNavigate('chamados')}
          className="group relative bg-slate-800/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-600/30 shadow-xl shadow-black/20 flex flex-col justify-between h-44 cursor-pointer hover:bg-slate-800/60 hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 blur-2xl"></div>
          <div className="w-12 h-12 bg-slate-500/10 border border-slate-500/20 text-slate-300 rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:rotate-12">
            <CheckCircle className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">{completedRequests}</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Total Finalizados</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {isClient && (
        <div className="mt-4">
          <button
            onClick={() => onNavigate('chamados/novo')}
            className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:shadow-cyan-600/30 hover:scale-[1.01] transition-all active:scale-95 border border-white/10"
          >
            + Abrir Nova Solicitação
          </button>
        </div>
      )}

      {/* Próximos Agendamentos - Redesigned */}
      {!isClient && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-white">Próximo Atendimento</h3>
            <button
              onClick={() => onNavigate('agenda')}
              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest"
            >
              Ver mais
            </button>
          </div>
          <div className="space-y-3">
            {requests
              .filter(r => (r.status === RequestStatus.EM_ANDAMENTO || r.status === RequestStatus.ATRIBUIDA || r.status === RequestStatus.AGENDADA) && r.scheduledAt)
              .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
              .slice(0, 3)
              .length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-bold uppercase glass-panel !bg-slate-900/30 rounded-2xl">
                Nenhum agendamento próximo
              </div>
            ) : (
              requests
                .filter(r => (r.status === RequestStatus.EM_ANDAMENTO || r.status === RequestStatus.ATRIBUIDA || r.status === RequestStatus.AGENDADA) && r.scheduledAt)
                .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
                .slice(0, 3)
                .map(r => (
                <div
                  key={r.id}
                  onClick={() => onSelectRequest(r)}
                  className="glass-panel !bg-slate-800/40 p-6 rounded-[2rem] hover:!bg-slate-800/60 cursor-pointer border-transparent hover:border-cyan-500/30 transition-all active:scale-95"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 font-black text-lg">
                        {r.clientName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-100 text-sm">{r.clientName}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                          {r.client?.endereco
                            ? `${r.client.endereco.street}, ${r.client.endereco.number} - ${r.client.endereco.district}, ${r.client.endereco.city}/${r.client.endereco.state} (CEP: ${r.client.endereco.zipCode})`
                            : (r.equipments?.[0]?.equipamento?.location || 'Endereço não informado')}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500">#{r.numero || r.id.slice(0, 6)}</span>
                  </div>

                  <div className="bg-slate-900/50 rounded-2xl p-4 flex items-center gap-4 border border-white/5">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do atendimento</p>
                      <p className="text-sm font-bold text-slate-200">
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
      )}

      {/* Recent Activity */}
      <div className="mt-6">
        <h3 className="text-sm font-black text-white mb-4">Atividade Recente</h3>
        <div className="space-y-3">
          {requests.slice(0, 3).length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs font-bold uppercase glass-panel !bg-slate-900/30 rounded-2xl">
              Nenhuma atividade recente
            </div>
          ) : (
            requests.slice(0, 3).map(r => (
              <div
                key={r.id}
                onClick={() => onSelectRequest(r)}
                className="glass-panel !bg-slate-800/40 p-5 rounded-2xl flex items-center gap-4 cursor-pointer hover:!bg-slate-800/60 transition-all border-transparent hover:border-white/10"
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${r.status === RequestStatus.ABERTA ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' :
                  r.status === RequestStatus.EM_ANDAMENTO ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' :
                    r.status === RequestStatus.CONCLUIDA ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                      'bg-slate-500'
                  }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-200 text-sm truncate">{r.clientName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{r.description}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase shrink-0 border ${r.status === RequestStatus.ABERTA ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  r.status === RequestStatus.EM_ANDAMENTO ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    r.status === RequestStatus.CONCLUIDA ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>{r.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
