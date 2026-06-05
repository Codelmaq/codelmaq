export type UserRole = 'administrador' | 'colaborador' | 'mecanico';
export type UserStatus = 'pendente' | 'aprovado' | 'bloqueado';

export interface UsuarioLogado {
  id: string;
  nome: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
}
