import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveShift {
  id: string;             // uuid (matches the LocalRegistroDiario id)
  machineId: string;      // ativo.id scanned from the QR code
  machineName?: string;   // human-readable label, optional
  operatorId: string;     // funcionarios.id (UUID of the logged-in user)
  operatorName?: string;  // human-readable label, optional
  startedAt: string;      // ISO timestamp of when the QR was scanned
  horimetroInicial: number;
  siteId?: string;        // frente de serviço
  data: string;           // YYYY-MM-DD
}

interface ShiftState {
  activeShift: ActiveShift | null;
  startShift: (shift: ActiveShift) => void;
  endShift: () => void;
  clearShift: () => void;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      activeShift: null,
      startShift: (shift) => set({ activeShift: shift }),
      endShift: () => set({ activeShift: null }),
      clearShift: () => set({ activeShift: null }),
    }),
    {
      name: 'codelmaq-active-shift',
    }
  )
);
