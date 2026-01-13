
import React, { useState } from 'react';
import { ServiceRequest, RequestStatus } from '../types';

interface AgendaProps {
  requests: ServiceRequest[];
  onSelectRequest: (request: ServiceRequest) => void;
}

export const Agenda: React.FC<AgendaProps> = ({ requests, onSelectRequest }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filter requests that are in progress (scheduled)
  const scheduledRequests = requests.filter(r =>
    r.status === RequestStatus.EM_ANDAMENTO ||
    r.status === RequestStatus.ACEITA
  );

  // Group by date (mock - in real app this would use scheduledDate)
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  return (
    <div className="animate-in fade-in duration-500 pb-8">
      {/* Back Button + Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Agenda</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </p>
        </div>
      </div>

      {/* Calendar Strip */}
      <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 mb-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {days.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center min-w-[52px] p-3 rounded-2xl transition-all ${
                  isSelected
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                    : isToday
                      ? 'bg-cyan-50 text-cyan-600 border-2 border-cyan-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                  {dayNames[day.getDay()]}
                </span>
                <span className="text-xl font-black mt-1">
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scheduled Items */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Atendimentos do Dia
        </h4>

        {scheduledRequests.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-400 font-bold text-sm">Nenhum atendimento agendado</p>
            <p className="text-slate-300 text-xs mt-1">Os chamados aceitos aparecerão aqui</p>
          </div>
        ) : (
          scheduledRequests.map((request, index) => (
            <div
              key={request.id}
              onClick={() => onSelectRequest(request)}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg hover:border-cyan-200 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                {/* Time indicator */}
                <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex flex-col items-center justify-center text-cyan-600 shrink-0">
                  <span className="text-[10px] font-black uppercase">
                    {dayNames[selectedDate.getDay()]}
                  </span>
                  <span className="text-lg font-black">
                    {String(9 + index * 2).padStart(2, '0')}:00
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${
                      request.status === RequestStatus.EM_ANDAMENTO
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-800 text-lg truncate">{request.clientName}</h4>
                  <p className="text-xs text-slate-400 font-medium truncate mt-1">
                    {request.description || 'Sem descrição'}
                  </p>
                  {request.equipments && request.equipments.length > 0 && (
                    <p className="text-[10px] text-cyan-600 font-bold mt-2">
                      📍 {request.equipments[0]?.equipamento?.location || 'Local não definido'}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-cyan-600 group-hover:text-white transition-all shrink-0 self-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
