// Perfis oficiais do sistema Codelmaq.
// Mantemos compat com 'colaborador' (alias legada de 'operador') para não quebrar
// sessões e cadastros antigos já persistidos no localStorage / IndexedDB / Supabase.
export type UserRole =
  | 'administrador'
  | 'gestor'
  | 'motorista'
  | 'mecanico'
  | 'operador';

export type UserStatus = 'pendente' | 'aprovado' | 'bloqueado';

export interface UsuarioLogado {
  id: string;
  nome: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
}

// Lista oficial usada em selects do sistema (login, painel admin, etc.)
export const USER_ROLES: UserRole[] = [
  'administrador',
  'gestor',
  'motorista',
  'mecanico',
  'operador',
];

// Rótulo amigável exibido na UI (sigla interna -> label humana).
export const ROLE_LABELS: Record<UserRole, string> = {
  administrador: 'Administrador',
  gestor: 'Gestor',
  motorista: 'Motorista',
  mecanico: 'Mecânico',
  operador: 'Operador',
};

// Normaliza qualquer string de role vinda do banco / código legado para
// uma das 5 roles oficiais. Mantém compatibilidade com labels antigos
// ("Colaborador", "Operador de Máquinas", etc.).
export function normalizeRole(value: unknown): UserRole {
  if (typeof value !== 'string' || value.trim() === '') return 'operador';
  const v = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (v === 'administrador' || v.startsWith('admin')) return 'administrador';
  if (v === 'gestor' || v === 'gerente' || v === 'supervisor') return 'gestor';
  if (v === 'motorista' || v === 'driver') return 'motorista';
  if (v === 'mecanico' || v === 'tecnico' || v === 'mecan') return 'mecanico';
  // "colaborador", "operador de maquinas", "operador", "ajudante" e similares
  // caem todos no perfil Operador para manter compatibilidade.
  return 'operador';
}
