export type Role = 'client' | 'provider' | 'admin';

export interface User {
  id: number;
  name: string;
  role: Role;
  email: string;
  company?: string;
  photo_data?: string | null;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  location: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  type: string;
  status: 'Em Aberto' | 'Em Atendimento' | 'Impedimento' | 'Aguardando Peças' | 'Aguardando Aprovação' | 'Finalizado' | 'Cancelado';
  company?: string;
  requestor_name?: string;
  phone?: string;
  sub_type?: string;
  preferred_time?: string;
  sector?: string;
  client_id: number;
  provider_id: number | null;
  nps_score: number | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  provider_name?: string;
  photos?: string[];
  final_photos?: string[];
  final_report?: string;
  reopen_reason?: string;
  external_id?: string;
  materials?: string;
  observations?: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  message: string;
  created_at: string;
  user_name?: string;
  user_role?: Role;
}

export interface TicketDetail extends Ticket {
  comments: Comment[];
}

export interface Sector {
  id: number;
  name: string;
}

export interface ServiceType {
  id: number;
  name: string;
  sector_id?: number;
  sector_name?: string;
}
