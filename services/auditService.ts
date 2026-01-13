
import { TimelineEvent, User, Equipment } from '../types';

export const createAuditLog = (requestId: string, user: User, action: string, details: string): TimelineEvent => {
  return {
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    requestId,
    userId: user.id,
    userName: user.name,
    action,
    details,
    timestamp: new Date().toISOString(),
  };
};

export const getStatusTransitionDetails = (status: string, extra?: string): string => {
  const details: Record<string, string> = {
    ATRIBUIDA: `A solicitação recebeu um técnico responsável e entrou na fila de execução. ${extra || ''}`,
    AGENDADA: 'A data e hora para o atendimento foram confirmadas com o cliente.',
    EM_ANDAMENTO: 'O técnico iniciou o protocolo de manutenção no local.',
    PAUSADA: 'O atendimento foi suspenso temporariamente (aguardando peças ou autorização).',
    FINALIZADA: 'O serviço foi concluído, checklist aprovado e o sistema gerou o histórico final.',
    CANCELADA: 'A solicitação foi encerrada sem a execução do serviço técnico.',
  };
  return details[status] || 'Alteração de status registrada no sistema.';
};

export const logEquipmentAction = (requestId: string, user: User, equipment: Equipment, action: string) => {
  return createAuditLog(
    requestId,
    user,
    `Equipamento: ${equipment.brand} (${equipment.location})`,
    `Ação técnica realizada: ${action}`
  );
};
