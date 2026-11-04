/**
 * Modelos de dados e tipos do NutriRede (Ciclo 1 e Ciclo 2 / Ciclo 2.1)
 * Referência: PRD NutriRede v1.1 de 02/11/2026
 */

export type ProfileType = 'DONOR' | 'RECEIVER' | 'TRANSPORTER';

export type ProfileStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'DESATIVADO';

export type AdminRole = 'OWNER' | 'ADMIN';

export interface UserAccount {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  accountStatus: 'ACTIVE' | 'BLOCKED';
  previousEmail?: string;
  emailChangedAt?: string;
}

export interface UserProfileDoc {
  id: string; // Formato: `${userId}_${profileType}`
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  address?: string;
  operationalNotes?: string;
  profileType: ProfileType;
  status: ProfileStatus;
  requestedAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
  decisionNotes?: string;
  // Auditoria de desativação e reativação
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
  deactivationReason?: string | null;
  reactivatedAt?: string | null;
  // Auditoria de alterações de contato
  lastEditedAt?: string | null;
  lastEditedBy?: string | null;
  previousEmail?: string | null;
  emailChangedAt?: string | null;
  // RF09: Disponibilidade do Transportador
  transporterAvailability?: 'DISPONIVEL' | 'INDISPONIVEL';
  availabilityUpdatedAt?: string;
}

export interface SecurityAuditLog {
  id: string;
  userId: string;
  action: 'CHANGE_EMAIL_REQUESTED' | 'EMAIL_SYNCED' | 'PROFILE_EDITED' | 'PROFILE_DEACTIVATED' | 'PROFILE_REACTIVATION_REQUESTED';
  oldEmail?: string;
  newEmailRequested?: string;
  newEmail?: string;
  timestamp: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'VERIFICATION_SENT';
  details?: string;
}

export interface AdminDoc {
  uid: string;
  email: string;
  role: AdminRole;
  assignedBy?: string;
  assignedAt: string;
  updatedAt?: string;
}

export interface SystemConfigDoc {
  ownerUid: string;
  ownerEmail: string;
  initializedAt: string;
  systemVersion: string;
  ownerRole: 'OWNER';
  transferredAt?: string;
  transferredFrom?: string;
}

// ==========================================
// CICLO 2: LOTES DE ALIMENTOS E RESERVAS
// ==========================================

export type BatchUnit = 'kg' | 'g' | 'litros' | 'unidades';

export type FoodBatchStatus = 'DISPONIVEL' | 'RESERVADO' | 'EM_TRANSPORTE' | 'CONCLUIDO' | 'CANCELADO' | 'EXPIRADO';

export type ReservationStatus = 'PENDENTE_APROVACAO' | 'APROVADA' | 'REJEITADA' | 'CANCELADA';

export type FoodCategory =
  | 'Hortifruti'
  | 'Padaria e Grãos'
  | 'Laticínios e Derivados'
  | 'Refeições Preparadas'
  | 'Mercearia e Embalados'
  | 'Outros';

export interface FoodBatch {
  id: string;
  donorId: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  foodName: string;
  category: FoodCategory;
  quantity: number;
  unit: BatchUnit;
  expirationDate: string; // yyyy-mm-dd ou ISO
  consumptionDeadline?: string | null; // HH:mm ou ISO para refeições preparadas / perecíveis (M41)
  storageCondition: string;
  pickupAddress: string;
  pickupWindowStart: string; // ISO
  pickupWindowEnd: string; // ISO
  fitForConsumption: boolean; // Declaração de aptidão (obrigatória)
  status: FoodBatchStatus;
  activeReservationId?: string | null;
  activeReservationStatus?: ReservationStatus | null;
  reservedBy?: string | null;
  reservedByName?: string | null;
  // Ciclo 3: Atribuição de transporte e ciclo de vida
  activePickupId?: string | null;
  transporterId?: string | null;
  transporterName?: string | null;
  pickedUpAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Reservation {
  id: string;
  batchId: string;
  foodName: string;
  batchQuantity: number;
  batchUnit: string;
  expirationDate: string;
  consumptionDeadline?: string | null;
  pickupAddress: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  donorId: string;
  donorName: string;
  receiverId: string;
  receiverName: string;
  receiverEmail: string;
  receiverPhone?: string;
  status: ReservationStatus;
  requestedAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
  decisionNotes?: string | null;
  canceledAt?: string | null;
  cancelReason?: string | null;
  // Ciclo 3: Transporte e Entrega
  activePickupId?: string | null;
  transporterId?: string | null;
  transporterName?: string | null;
  pickedUpAt?: string | null;
  completedAt?: string | null;
  deliveryId?: string | null;
}

// ==========================================
// CICLO 3: TRANSPORTE, RETIRADA, ENTREGA E OCORRÊNCIAS
// ==========================================

export type PickupStatus = 'ACEITA' | 'RETIRADA' | 'CANCELADA';

export interface Pickup {
  id: string;
  reservationId: string;
  batchId: string;
  foodName: string;
  batchQuantity: number;
  batchUnit: BatchUnit;
  donorId: string;
  donorName: string;
  pickupAddress: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  receiverId: string;
  receiverName: string;
  transporterUserId: string;
  transporterName: string;
  transporterEmail: string;
  transporterPhone?: string;
  status: PickupStatus;
  acceptedAt: string;
  pickedUpAt?: string | null;
  notes?: string;
}

export interface Delivery {
  id: string;
  pickupId: string;
  reservationId: string;
  batchId: string;
  foodName: string;
  batchQuantity: number;
  batchUnit: BatchUnit;
  donorId: string;
  donorName: string;
  receiverUserId: string;
  receiverName: string;
  transporterUserId: string;
  transporterName: string;
  confirmedAt: string;
  notes?: string;
}

export type OccurrenceStage = 'RETIRADA' | 'TRANSPORTE' | 'RECEBIMENTO' | 'OUTRO';

export interface Occurrence {
  id: string;
  operationId: string; // reservationId ou pickupId
  batchId: string;
  foodName?: string;
  authorUserId: string;
  authorName: string;
  authorProfile: ProfileType | 'ADMIN';
  stage: OccurrenceStage;
  type: string;
  description: string;
  createdAt: string;
  donorId?: string;
  receiverId?: string;
  transporterId?: string;
}

export type HistoryObjectType = 'LOTE' | 'RESERVA' | 'COLETA' | 'ENTREGA' | 'OCORRENCIA';

export interface OperationHistoryEvent {
  id: string;
  objectType: HistoryObjectType;
  objectId: string;
  event: string;
  actorUserId: string;
  actorName?: string;
  activeProfile: string;
  timestamp: string;
  details: string;
  batchId?: string;
  reservationId?: string;
  donorId?: string;
  receiverId?: string;
  transporterId?: string;
}

export interface ProfileMeta {
  type: ProfileType;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  iconName: string;
}

export const PROFILE_DEFINITIONS: Record<ProfileType, ProfileMeta> = {
  DONOR: {
    type: 'DONOR',
    title: 'Doador',
    subtitle: 'Mercados, restaurantes, feiras e produtores',
    description: 'Cadastra alimentos excedentes próprios para consumo e disponibiliza doações com garantia sanitária.',
    color: 'emerald',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    badgeText: 'Doador de Alimentos',
    iconName: 'Store'
  },
  RECEIVER: {
    type: 'RECEIVER',
    title: 'Entidade Receptora',
    subtitle: 'ONGs, cozinhas solidárias e abrigos',
    description: 'Recebe as doações homologadas e distribui refeições ou cestas diretamente às famílias vulneráveis.',
    color: 'teal',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-300',
    badgeText: 'Entidade Receptora',
    iconName: 'Building2'
  },
  TRANSPORTER: {
    type: 'TRANSPORTER',
    title: 'Transportador',
    subtitle: 'Motoristas voluntários e parceiros de frete',
    description: 'Realiza a coleta segura e entrega pontual dos lotes de alimentos entre doadores e entidades.',
    color: 'amber',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    badgeText: 'Transportador Voluntário',
    iconName: 'Truck'
  }
};

export const STATUS_CONFIG: Record<ProfileStatus, {
  label: string;
  badgeClass: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  description: string;
}> = {
  PENDENTE: {
    label: 'Pendente',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    description: 'Em análise pela administração. Operações de envio/reserva bloqueadas até aprovação.'
  },
  APROVADO: {
    label: 'Aprovado',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    description: 'Perfil homologado pelo administrador. Acesso operacional integral liberado.'
  },
  REJEITADO: {
    label: 'Rejeitado',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-800',
    borderColor: 'border-rose-200',
    description: 'Perfil não aprovado na análise cadastral. Consulte o motivo ou contate o suporte.'
  },
  DESATIVADO: {
    label: 'Desativado',
    badgeClass: 'bg-stone-200 text-stone-700 border-stone-300',
    bgLight: 'bg-stone-100',
    textColor: 'text-stone-700',
    borderColor: 'border-stone-300',
    description: 'Perfil voluntariamente desativado ou suspenso. Novas operações bloqueadas com histórico preservado.'
  }
};

export const BATCH_STATUS_CONFIG: Record<FoodBatchStatus, {
  label: string;
  badgeClass: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  description: string;
}> = {
  DISPONIVEL: {
    label: 'Disponível',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    description: 'Oferta ativa apta para reserva por entidades receptoras aprovadas.'
  },
  RESERVADO: {
    label: 'Reservado',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-200',
    description: 'Lote com solicitação de reserva em andamento ou homologada.'
  },
  EM_TRANSPORTE: {
    label: 'Em Transporte',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-200',
    description: 'Alimentos retirados pelo transportador e a caminho do destino.'
  },
  CONCLUIDO: {
    label: 'Concluído (RN08)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    description: 'Entrega confirmada pela entidade receptora. Doação finalizada com sucesso.'
  },
  CANCELADO: {
    label: 'Cancelado',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
    bgLight: 'bg-stone-50',
    textColor: 'text-stone-700',
    borderColor: 'border-stone-200',
    description: 'Oferta cancelada pelo doador ou retirada da plataforma.'
  },
  EXPIRADO: {
    label: 'Expirado',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-800',
    borderColor: 'border-rose-200',
    description: 'Data de validade ou janela de retirada expirada.'
  }
};

export const RESERVATION_STATUS_CONFIG: Record<ReservationStatus, {
  label: string;
  badgeClass: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  description: string;
}> = {
  PENDENTE_APROVACAO: {
    label: 'Pendente de Homologação',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-200',
    description: 'Aguardando avaliação e homologação administrativa (RF08).'
  },
  APROVADA: {
    label: 'Reserva Aprovada',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    description: 'Homologada pelo administrador. Pronta para aceite e retirada pelo transportador.'
  },
  REJEITADA: {
    label: 'Solicitação Rejeitada',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-800',
    borderColor: 'border-rose-200',
    description: 'Solicitação de reserva indeferida na triagem administrativa.'
  },
  CANCELADA: {
    label: 'Cancelada pela Entidade',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
    bgLight: 'bg-stone-50',
    textColor: 'text-stone-700',
    borderColor: 'border-stone-200',
    description: 'Reserva cancelada pela entidade receptora antes da retirada.'
  }
};
