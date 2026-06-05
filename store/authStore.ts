import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UsuarioLogado } from '@/types/auth';

interface AuthState {
  usuario: UsuarioLogado | null;
  setUsuario: (usuario: UsuarioLogado | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      setUsuario: (usuario) => set({ usuario }),
      logout: () => set({ usuario: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
