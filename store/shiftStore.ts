import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// A jornada diária — o "turno" de verdade. Abre quando o operador inicia o
// primeiro turno do dia e só termina ao encerrar o expediente. Dentro dela o
// operador pode usar várias máquinas, uma de cada vez.
export interface DailyTurno {
  id: string;             // jornada id
  operatorId: string;     // funcionarios.id (UUID do operador logado)
  operatorName?: string;
  siteId?: string;        // frente de serviço
  data: string;           // YYYY-MM-DD
  startedAt: string;      // ISO de quando a jornada começou (manhã)
}

// O segmento de máquina em uso AGORA dentro da jornada. Somente um por vez.
export interface ShiftMachine {
  id: string;             // uuid (matches the LocalRegistroDiario id / rascunho)
  machineId: string;      // ativo.id
  machineName?: string;
  horimetroInicial: number;
  startedAt: string;      // ISO de quando tal máquina foi ativada
}

interface ShiftState {
  turno: DailyTurno | null;
  activeShift: ShiftMachine | null;
  // Abre a jornada do dia junto com a PRIMEIRA máquina.
  openTurno: (turno: DailyTurno, machine: ShiftMachine) => void;
  // Adiciona/troca a máquina em uso dentro da jornada (jornada permanece).
  addMachine: (machine: ShiftMachine) => void;
  // Encerra a máquina atual, mantendo a jornada aberta (campo livre p/ nova máquina).
  closeMachine: () => void;
  // Encerra a jornada inteira (fim do expediente).
  endTurno: () => void;
  clearShift: () => void;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      turno: null,
      activeShift: null,
      openTurno: (turno, machine) => set({ turno, activeShift: machine }),
      addMachine: (machine) => set({ activeShift: machine }),
      closeMachine: () => set({ activeShift: null }),
      endTurno: () => set({ turno: null, activeShift: null }),
      clearShift: () => set({ turno: null, activeShift: null }),
    }),
    {
      name: 'codelmaq-turno-v1',
    }
  )
);