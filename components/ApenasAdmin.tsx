'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

export function ApenasAdmin({ children }: { children: ReactNode }) {
  const { usuario } = useAuthStore();

  if (usuario?.role !== 'administrador') {
    return null; // Não renderiza nada se for colaborador
  }

  return <>{children}</>;
}
