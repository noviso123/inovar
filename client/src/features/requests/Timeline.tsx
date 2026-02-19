import React from 'react';
import { TimelineEvent } from '@/shared/types';

interface TimelineProps {
  events: TimelineEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  // Sort events by timestamp descending (newest first)
  const sortedEvents = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getEventIcon = (action: string) => {
    if (action.includes('CRIADA') || action.includes('ABERTA')) return '📝';
    if (action.includes('ATRIBUIDA')) return '👤';
    if (action.includes('AGENDADA')) return '📅';
    if (action.includes('INICIO') || action.includes('ANDAMENTO')) return '▶️';
    if (action.includes('FINALIZADA')) return '✅';
    if (action.includes('PAUSADA')) return '⏸️';
    if (action.includes('CANCELADA')) return '🚫';
    return '📋';
  };

  const getEventColor = (action: string) => {
    if (action.includes('FINALIZADA')) return 'bg-emerald-500 text-white'; // Completed
    if (action.includes('ANDAMENTO')) return 'bg-blue-500 text-white'; // On route/working
    if (action.includes('AGENDADA')) return 'bg-sky-400 text-white'; // Scheduled
    return 'bg-amber-400 text-white'; // Pending/Waiting
  };

  return (
    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
      <h4 className="text-xl font-black text-slate-800 mb-6 tracking-tight ml-2">Linha do Tempo <span className="text-sm font-medium text-slate-400 block mt-1">Tempo real dos atendimentos</span></h4>

      <div className="space-y-4">
        {sortedEvents.length === 0 ? (
          <p className="text-slate-400 text-sm p-4 text-center">Nenhum evento registrado.</p>
        ) : (
          sortedEvents.map((event, index) => {
            const date = new Date(event.timestamp);
            const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={event.id} className="flex gap-4 group">
                  {/* Time */}
                  <div className="w-14 text-right pt-2 shrink-0">
                      <span className="font-black text-slate-800 text-sm">{timeString}</span>
                  </div>

                  {/* Icon Node */}
                  <div className="relative flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm z-10 shrink-0 border-4 border-white ${getEventColor(event.action)}`}>
                          {getEventIcon(event.action)}
                      </div>
                      {index !== sortedEvents.length - 1 && (
                          <div className="w-0.5 flex-1 bg-slate-200 my-1 group-last:hidden"></div>
                      )}
                  </div>

                  {/* Content Card */}
                  <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-2">
                       <p className="font-black text-slate-800 text-sm mb-1">{event.action.replace(/_/g, ' ')}</p>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          {event.details || (event.userName ? `Atualizado por ${event.userName}` : 'Atualização do sistema')}
                       </p>
                  </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
