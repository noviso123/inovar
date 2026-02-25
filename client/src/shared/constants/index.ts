import { RequestStatus, Priority } from './types';

export const STATUS_COLORS: Record<RequestStatus, string> = {
  [RequestStatus.ABERTA]: 'bg-yellow-100 text-yellow-700',
  [RequestStatus.PENDENTE]: 'bg-gray-100 text-gray-700',
  [RequestStatus.ACEITA]: 'bg-indigo-100 text-indigo-700',
  [RequestStatus.ATRIBUIDA]: 'bg-blue-100 text-blue-700',
  [RequestStatus.AGENDADA]: 'bg-sky-100 text-sky-700',
  [RequestStatus.EM_ANDAMENTO]: 'bg-cyan-100 text-cyan-700',
  [RequestStatus.PAUSADA]: 'bg-orange-100 text-orange-700',
  [RequestStatus.CONCLUIDA]: 'bg-teal-100 text-teal-700',
  [RequestStatus.FINALIZADA]: 'bg-green-100 text-green-700',
  [RequestStatus.CANCELADA]: 'bg-red-100 text-red-700',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.BAIXA]: 'text-slate-400',
  [Priority.MEDIA]: 'text-blue-500',
  [Priority.ALTA]: 'text-orange-500',
  [Priority.EMERGENCIAL]: 'text-red-600',
};

export const SLA_HOURS: Record<Priority, number> = {
  [Priority.BAIXA]: 72,
  [Priority.MEDIA]: 48,
  [Priority.ALTA]: 24,
  [Priority.EMERGENCIAL]: 6,
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.ABERTA]: 'Aberta',
  [RequestStatus.PENDENTE]: 'Pendente',
  [RequestStatus.ACEITA]: 'Aceita',
  [RequestStatus.ATRIBUIDA]: 'Atribuída',
  [RequestStatus.AGENDADA]: 'Agendada',
  [RequestStatus.EM_ANDAMENTO]: 'Em Andamento',
  [RequestStatus.PAUSADA]: 'Pausada',
  [RequestStatus.CONCLUIDA]: 'Concluída',
  [RequestStatus.FINALIZADA]: 'Finalizada',
  [RequestStatus.CANCELADA]: 'Cancelada',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.BAIXA]: 'Baixa',
  [Priority.MEDIA]: 'Média',
  [Priority.ALTA]: 'Alta',
  [Priority.EMERGENCIAL]: 'Emergencial',
};
