export interface Vehicle {
  brandModel: string;
  plate: string;
  color: string;
  garageSpot?: string;
}

export interface Resident {
  id: string;
  name: string;
  unit: string; // e.g. "B1 - Apt 104"
  phone: string;
  email?: string;
  vehicles: Vehicle[];
  members: string[]; // Co-residents
  status: 'Ativo' | 'Inativo' | 'Bloqueado';
  avatarUrl?: string;
  password?: string;
  role?: 'MASTER' | 'Administrador' | 'Porteiro' | 'Morador';
  qrCodeValue?: string;
  cpf?: string;
  rg?: string;
  createdAt?: string;
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
}

export interface Visitor {
  id: string;
  name: string;
  document: string; // RG/CPF
  phone: string;
  type: 'Regular' | 'Prestador' | 'Entrega' | 'Parente';
  unitToVisit: string;
  residentId?: string; // Links to Resident ID
  hostName: string;
  company?: string; // For prestadores or deliveries
  vehiclePlate?: string;
  entryTime: string | null;
  exitTime: string | null;
  status: 'Pre-Autorizado' | 'Dentro' | 'Saiu' | 'Recusado';
  exitCode?: string;
  notes?: string;
  createdAt: string;
  validityDuration?: string;
  expirationTime?: string;
  autoReleased?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
}

export type CommonAreaId = string;

export interface CommonArea {
  id: CommonAreaId;
  name: string;
  capacity: number;
  description: string;
  rules: string;
  isExempt?: boolean; // If true, do not calculate or display booking fee/duration costs
  price: number; // Booking fee in R$
  photoUrl?: string; // Real photo of the space (Base64 or URL)
  status: 'Disponível' | 'Em Manutenção' | 'Bloqueada';
  maintenanceReason?: string;
  maintenanceStart?: string; // YYYY-MM-DD
  maintenanceEnd?: string;   // YYYY-MM-DD
  maintenanceObservations?: string;
  lastUpdatedBy?: string; // Audit log: Admin User
  lastUpdatedDate?: string; // Audit log: ISO Date
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
}

export interface Guest {
  name: string;
  status: 'Pendente' | 'Liberado';
}

export interface Booking {
  id: string;
  areaId: CommonAreaId;
  unit: string;
  residentName: string;
  residentId?: string; // Optional resident ID for DB alignment
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  status: 'Confirmado' | 'Pendente' | 'Cancelado';
  guestsCount: number;
  guests: Guest[]; // Lista de nomes dos convidados e seu status
  createdAt?: string; // ISO String to track payment deadline
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  date: string;
  author: string;
  attachmentUrl?: string;
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
}

export interface Incident {
  id: string;
  title: string;
  category: string;
  description: string;
  unit: string;
  status: 'Aberto' | 'Em Andamento' | 'Resolvido';
  date: string;
  replies: IncidentReply[];
  photoUrls?: string[]; // Added this field
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
}

export interface IncidentReply {
  id: string;
  author: string;
  role: 'MASTER' | 'Administrador' | 'Porteiro' | 'Morador';
  content: string;
  date: string;
}

export interface IncidentFoto {
  id: string;
  incident_id: string;
  url_foto: string; // Base64 or storage URL
  created_at: string;
}

export interface ThemeSettings {
  id?: string;
  appName: string;
  appSlogan: string;
  logoUrl?: string; // custom base64 logo uploaded
  logoIcon: string; // name of lucide icon if no custom logoUrl (e.g. Building2, ShieldCheck, Home, Key, MapPin)
  presetId: 'classic' | 'cosmic' | 'emerald' | 'cyber' | 'sunset' | 'ocean' | 'custom';
  customBg: string;
  customCardBg: string;
  customText: string;
  customTextMuted: string;
  customBorder: string;
  customAccent: string;
  towerNames?: string[];
}

export interface Encomenda {
  id: string;
  codigoRastreio: string; // e.g., ENC-YMD-XXXX
  moradorId?: string; // Links to Resident ID
  moradorNome: string;
  apartamento: string;
  torre: string;
  dataRecebimento: string; // ISO String or YYYY-MM-DD HH:MM
  responsavelRecebimento: string;
  observacoes?: string;
  fotoUrl?: string; // Base64 or local preset asset
  status: 'Pendente' | 'Entregue';
  dataRetirada?: string;
  quemRetirou?: string;
  responsavelEntrega?: string;
  qrCodeValue?: string;
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
}

// AuditLog Interface definition matching exactly DB schema
export interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  user_name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'SESSION_CREATED' | 'SESSION_TERMINATED' | 'ERROR';
  module: 'Moradores' | 'Visitantes' | 'Convites' | 'Veículos' | 'Encomendas' | 'Ocorrências' | 'Unidades' | 'Blocos' | 'Usuários' | 'Configurações' | 'Reservas' | 'Autenticação' | 'Monitoramento de Erros' | 'Áreas Comuns' | 'Comunicados' | 'Achados e Perdidos';
  record_id?: string;
  old_data?: any; // JSON
  new_data?: any; // JSON
  ip_address?: string;
  user_agent?: string;
  error_message?: string;
  stack_trace?: string;
  restored_by?: string;
  restored_at?: string;
}

export interface AchadosPerdidos {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  local_encontrado: string;
  data_encontrado: string;
  status: 'Encontrado' | 'Aguardando identificação' | 'Reservado para retirada' | 'Devolvido ao proprietário' | 'Encerrado';
  createdBy?: string;
  created_by?: string;
  criado_por?: string;
  created_at: string;
  updated_at: string;
  
  // Controle de Retirada & Solicitação de Devolução
  proprietario_nome?: string;
  proprietario_unidade?: string;
  data_retirada?: string;
  responsavel_entrega?: string;
  assinatura_digital?: string; // Base64 signature
  foto_entrega?: string; // Base64 proof photo
  comprovacao_posse?: string; // Text characteristic justification
  documento_comprovatorio?: string; // Base64 document
  solicitante_id?: string;
  solicitante_nome?: string;
  solicitante_unidade?: string;
  solicitado_em?: string;

  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
}

export interface AchadosPerdidosFoto {
  id: string;
  objeto_id: string;
  url_foto: string; // Base64 format
  created_at: string;
}

export interface AchadosPerdidosHistorico {
  id: string;
  objeto_id: string;
  objetoId?: string;
  usuario_id: string;
  usuarioId?: string;
  usuario_nome: string;
  usuarioNome?: string;
  acao: 'Cadastro' | 'Alteração' | 'Inclusão de fotos' | 'Solicitação de devolução' | 'Aprovação' | 'Entrega' | 'Encerramento' | 'Exclusão';
  observacao?: string;
  created_at: string;
  createdAt?: string;
}

export interface LoginCustomization {
  id: string;
  layout_model: number;
  primary_color: string;
  secondary_color: string;
  button_color: string;
  button_text_color?: string;
  text_color: string;
  logo_url?: string;
  logo_size?: number; // scale percentage e.g. 100
  logo_alignment?: 'left' | 'center' | 'right';
  background_url?: string;
  background_opacity: number;
  background_blur: number;
  condominium_name: string;
  slogan: string;
  welcome_message: string;
  footer_text: string;
  updated_at: string;
  updated_by: string;
}
export interface PendingSyncItem {
  id: string;
  table: string;
  action: 'upsert' | 'delete';
  data: any;
  retries?: number;
}

export class AppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppConfigError';
  }
}




