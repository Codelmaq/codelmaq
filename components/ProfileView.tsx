"use client";

import React from 'react';
import { User, Mail, Shield, IdCard, LogOut, Calendar } from 'lucide-react';
import { UsuarioLogado } from '@/types/auth';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from '@/hooks/useRouter';

interface ProfileViewProps {
  userProfile: UsuarioLogado | null;
}

const ROLE_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  colaborador: 'Colaborador',
  mecanico: 'Mecânico',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  aprovado: { label: 'Aprovado', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  pendente: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  bloqueado: { label: 'Bloqueado', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
};

export const ProfileView = ({ userProfile }: ProfileViewProps) => {
  const { setUsuario } = useAuthStore();
  const router = useRouter();

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400">Nenhum usuário logado.</p>
      </div>
    );
  }

  const initials = userProfile.nome
    ? userProfile.nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n.charAt(0).toUpperCase())
        .join('')
    : 'US';

  const roleLabel = ROLE_LABELS[userProfile.role] || userProfile.role;
  const statusInfo = STATUS_LABELS[userProfile.status] || {
    label: userProfile.status,
    className: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20',
  };

  const handleLogout = () => {
    setUsuario(null);
    localStorage.removeItem('auth-storage');
    router.push('/login');
  };

  const infoRows = [
    {
      icon: User,
      label: 'Nome',
      value: userProfile.nome || '—',
    },
    {
      icon: Mail,
      label: 'Email',
      value: userProfile.email || 'Não informado',
    },
    {
      icon: Shield,
      label: 'Função',
      value: roleLabel,
    },
    {
      icon: IdCard,
      label: 'Identificador',
      value: <span className="font-mono text-xs">{userProfile.id}</span>,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          Meu Perfil
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Informações da sua conta no sistema.
        </p>
      </div>

      <div className="bg-white dark:bg-[#101010] border border-gray-200 dark:border-white/5 rounded-2xl shadow-md overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col items-center text-center border-b border-gray-200 dark:border-white/5 bg-gradient-to-b from-yellow-500/5 to-transparent">
          <div className="w-24 h-24 rounded-full bg-yellow-500 flex items-center justify-center text-yellow-950 font-bold text-3xl mb-4 shadow-lg shadow-yellow-500/20">
            {initials}
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {userProfile.nome || 'Usuário'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{roleLabel}</p>
          <span
            className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.className}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {statusInfo.label}
          </span>
        </div>

        <div className="p-6 md:p-8 space-y-1">
          {infoRows.map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 dark:border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <Icon size={16} />
                  <span className="text-sm">{row.label}</span>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white text-right min-w-0 truncate">
                  {row.value}
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <Calendar size={16} />
              <span className="text-sm">Sessão</span>
            </div>
            <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ativa
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
      >
        <LogOut size={18} />
        Sair do Sistema
      </button>
    </div>
  );
};

export default ProfileView;
