
export enum UserRole {
  ADMIN = 'ADMIN_SISTEMA',
  PRESTADOR = 'PRESTADOR',
  TECNICO = 'TECNICO',
  CLIENTE = 'CLIENTE'
}

export enum RequestStatus {
  ABERTA = 'ABERTA',
  PENDENTE = 'PENDENTE',
  ACEITA = 'ACEITA',
  ATRIBUIDA = 'ATRIBUIDA',
  AGENDADA = 'AGENDADA',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  PAUSADA = 'PAUSADA',
  CONCLUIDA = 'CONCLUIDA',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA'
}

export enum Priority {
  BAIXA = 'BAIXA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  EMERGENCIAL = 'EMERGENCIAL'
}

export interface Address {
  id: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Company {
  id: string;
  userId: string;
  razaoSocial: string;
  companyId?: string;
  createdAt?: string;
  avatarUrl?: string;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  document?: string;
  email: string;
  phone?: string;
  endereco?: Address;
  companyId: string;
  createdAt?: string;
}

export interface Equipment {
  id: string;
  clientId: string;
  brand: string;
  model: string;
  btu: number;
  serialNumber?: string;
  location: string;
  active: boolean;
  createdAt?: string;
}

export interface ServiceRequest {
  id: string;
  numero?: number; // Sequential number for display (1, 2, 3...)
  clientId: string;
  clientName: string;
  equipmentIds: string[];
  equipments?: { equipamentoId: string; equipamento: Equipment }[];
  status: RequestStatus;
  priority: Priority;
  serviceType?: string;
  description: string;
  responsibleId?: string;
  responsibleName?: string;
  scheduledAt?: string;
  createdAt: string;
  slaLimit: string;
  confirmedAt?: string;
  confirmedBy?: string;
  observation?: string;
  lockedBy?: string;
  lockedAt?: string;
  history?: TimelineEvent[];
  checklists?: ChecklistItem[];
  attachments?: Attachment[];

  // Workflow fields
  valorOrcamento?: number;
  orcamentoAprovado?: boolean;
  orcamentoItens?: OrcamentoItem[];
  assinaturaCliente?: string;
  assinaturaTecnico?: string;
  dataAssinatura?: string;
}

export interface OrcamentoItem {
  id: string;
  solicitacaoId: string;
  descricao: string;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
  tipo: 'SERVICO' | 'MATERIAL' | 'MAO_DE_OBRA';
  createdAt?: string;
}

export interface OrcamentoSugestao {
  descricao: string;
  tipo: string;
  valorSugerido: number;
}

export interface NotaFiscal {
  id: string;
  solicitacaoId: string;
  numero?: string;
  codigoVerificacao?: string;
  status: 'PENDENTE' | 'PROCESSANDO' | 'EMITIDA' | 'CANCELADA' | 'ERRO';
  tomadorNome: string;
  tomadorDocumento: string;
  valorServicos: number;
  valorLiquido: number;
  xmlPath?: string;
  pdfPath?: string;
  dataEmissao?: string;
}

export interface ConfiguracaoFiscal {
  id?: string;
  inscricaoMunicipal?: string;
  cnae?: string;
  regimeTributario: string;
  ambiente: 'PRODUCAO' | 'HOMOLOGACAO';
}

export interface TimelineEvent {
  id: string;
  requestId?: string;
  solicitacaoId?: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  beforeValue?: string;
  afterValue?: string;
  timestamp: string;
}

export interface ChecklistItem {
  id: string;
  solicitacaoId: string;
  equipamentoId?: string;
  description: string;
  checked: boolean;
  observation?: string;
  checkedById?: string;
  checkedByName?: string;
  checkedAt?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  solicitacaoId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}

export interface AgendaEntry {
  id: string;
  userId: string;
  solicitacaoId: string;
  title: string;
  scheduledAt: string;
  duration: number;
  notes?: string;
  solicitacao?: ServiceRequest;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  entity: string;
  entityId: string;
  action: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface Settings {
  sla_baixa: string;
  sla_media: string;
  sla_alta: string;
  sla_emergencial: string;
  lock_timeout: string;
  confirm_days: string;
  [key: string]: string;
}

// Helper to get SLA hours from priority
export const SLA_HOURS: Record<Priority, number> = {
  [Priority.BAIXA]: 72,
  [Priority.MEDIA]: 48,
  [Priority.ALTA]: 24,
  [Priority.EMERGENCIAL]: 6,
};
