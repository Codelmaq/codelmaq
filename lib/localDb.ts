import Dexie, { Table } from 'dexie';

// Interfaces for local database schemas representing our offline business models
export type LocalUserRole =
  | 'administrador'
  | 'gestor'
  | 'motorista'
  | 'mecanico'
  | 'operador';

export interface LocalUser {
  id: string;          // uuid or operator identifier
  nome: string;
  email: string;
  role: LocalUserRole;
  status: 'aprovado' | 'pendente';
  synced: number;      // 0 for offline/needs sync, 1 for online synced
}

export interface LocalChecklist {
  id: string;          // uuid
  machineId: string;
  supervisorId: string;
  data: string;        // ISO date string
  horaEntrada?: string; // operator shift entrance check time
  horaSaida?: string;  // operator shift release check time
  horimetro?: number;  // current machinery or car horimeter / odometer km
  status: 'aprovado' | 'atencao' | 'critico';
  answers: Record<string, boolean | string>; // checklist verification answers
  synced: number;      // 0 = pending, 1 = synced
  sync_failed?: number; // 1 = sync attempted but failed (e.g. FK violation). Stays in queue for review.
  sync_error?: string;  // human-readable error from the last failed sync attempt
  observacoes?: string;
  defectPhotos?: string[]; // Compressed image base64 URIs saved locally
}

export interface LocalPenalty {
  id: string;
  operatorId: string;
  operatorName: string;
  infractionCode: string;        // codigo curto da infracao (ex: "DAILY_CHECK", "IDLE_ENGINE")
  infractionLabel: string;       // descricao da infracao (ex: "Deixar de fazer o Daily Check")
  points: number;                // pontos debitados (sempre negativo ou zero)
  photoEvidencia: string;        // base64 (compressed) — VISIVEL APENAS PARA ADMIN
  observacoes?: string;          // nota do admin
  aplicadoPor: string;           // id do admin que aplicou
  aplicadoPorNome: string;       // nome do admin
  dataEvento: string;            // ISO timestamp
  createdAt: string;
  synced: number;
  sync_failed?: number;
  sync_error?: string;
}

export interface LocalBonus {
  id: string;
  operatorId: string;
  operatorName: string;
  rewardCode: string;            // codigo curto da bonificacao (ex: "EXTRA_SHIFT", "BRAVERY")
  rewardLabel: string;           // descricao da bonificacao (ex: "Turno extra voluntario")
  points: number;                // pontos creditados (sempre positivo)
  photoEvidencia?: string;       // base64 (compressed) — opcional (registro visual do reconhecimento)
  observacoes?: string;          // nota do admin
  aplicadoPor: string;           // id do admin que concedeu
  aplicadoPorNome: string;       // nome do admin
  dataEvento: string;            // ISO timestamp
  createdAt: string;
  synced: number;
  sync_failed?: number;
  sync_error?: string;
}

export interface LocalRegistroDiario {
  id: string;          // uuid
  operatorId: string;
  machineId: string;
  siteId: string;
  data: string;        // YYYY-MM-DD
  horimetroInicial: number;
  /**
   * Horímetro final — undefined while the shift is open (rascunho).
   * Set to a number when the operator closes the shift.
   */
  horimetroFinal?: number;
  status: 'rascunho' | 'fechado';
  synced: number;      // 0 = pending, 1 = synced
  sync_failed?: number; // 1 = sync attempted but failed (e.g. FK violation). Stays in queue for review.
  sync_error?: string;  // human-readable error from the last failed sync attempt
  fuelAdded?: number;
  observations?: string;
  created_at?: string;
  checklistId?: string; // linked checklist id
  photos?: string[];    // Compressed image base64 URIs saved locally
  fotoHorimetroInicial?: string; // photo of the initial horimeter (required to open)
  fotoHorimetroFinal?: string;   // photo of the final horimeter (required to close)
  // Device clock timestamps captured on scan and on close
  horaInicio?: string;  // ISO timestamp set on QR scan / shift start
  horaFim?: string;     // ISO timestamp set on shift end
  fechadoEm?: string;   // ISO timestamp set on shift end (alias of horaFim)
  previousHorimetro?: number; // pre-fill reference from last shift's horimetroFinal
  /**
   * Drift (em ms, sempre >= 0) entre o relógio do aparelho e o servidor Supabase
   * no momento em que o turno foi registrado. `null` se nunca medimos online.
   * Quando preenchido e > 300_000 (5 min), o operador registrou com data/hora
   * divergente — vale revisão manual pelo gestor.
   */
  clock_skew_ms?: number | null;
  /**
   * Bandeira que o admin pode usar pra revisar registros feitos com data/hora
   * potencialmente adulterada. Preenchida automaticamente quando o submit é
   * permitido mas o último drift medido estava acima da tolerância.
   */
  clock_skew_suspect?: 0 | 1;
}

// Subclass Dexie to define our high-performance Local Database
class CodelmaqLocalDatabase extends Dexie {
  users!: Table<LocalUser>;
  checklists!: Table<LocalChecklist>;
  registrosDiarios!: Table<LocalRegistroDiario>;
  penalties!: Table<LocalPenalty>;
  bonuses!: Table<LocalBonus>;

  constructor() {
    super('CodelmaqLocalDB');

    // Define database tables and index keys using SQLite-equivalent schema indices
    this.version(1).stores({
      users: 'id, email, role, status, synced',
      checklists: 'id, machineId, supervisorId, status, synced',
      registrosDiarios: 'id, operatorId, machineId, siteId, data, status, synced'
    });

    // v2: add sync_failed index for fast "failed records" queries in the local queue UI
    this.version(2).stores({
      users: 'id, email, role, status, synced',
      checklists: 'id, machineId, supervisorId, status, synced, sync_failed',
      registrosDiarios: 'id, operatorId, machineId, siteId, data, status, synced, sync_failed'
    });

    // v3: add LocalPenalty table (Programa de Excelencia — penalidades)
    this.version(3).stores({
      users: 'id, email, role, status, synced',
      checklists: 'id, machineId, supervisorId, status, synced, sync_failed',
      registrosDiarios: 'id, operatorId, machineId, siteId, data, status, synced, sync_failed',
      penalties: 'id, operatorId, infractionCode, dataEvento, synced, sync_failed'
    });

    // v4: add LocalBonus table (Programa de Excelencia — bonificacoes / pontos extras)
    this.version(4).stores({
      users: 'id, email, role, status, synced',
      checklists: 'id, machineId, supervisorId, status, synced, sync_failed',
      registrosDiarios: 'id, operatorId, machineId, siteId, data, status, synced, sync_failed',
      penalties: 'id, operatorId, infractionCode, dataEvento, synced, sync_failed',
      bonuses: 'id, operatorId, rewardCode, dataEvento, synced, sync_failed'
    });
  }
}

export const localDb = new CodelmaqLocalDatabase();

// Self-healing database initialization helper
export async function seedLocalDatabase() {
  try {
    const usersCount = await localDb.users.count();
    if (usersCount === 0) {
      console.log('Populando banco local com usuários padrão de desenvolvimento...');
      
      const defaultUsers: LocalUser[] = [
        {
          id: '00000000-0000-4000-a000-000000000000',
          nome: 'Alexandre Reis',
          email: 'admin@codelmaq.com.br',
          role: 'administrador',
          status: 'aprovado',
          synced: 1
        },
        {
          id: '11111111-1111-4111-b111-111111111111',
          nome: 'Carlos Silva',
          email: 'operador@codelmaq.com.br',
          role: 'operador',
          status: 'aprovado',
          synced: 1
        }
      ];

      await localDb.users.bulkAdd(defaultUsers);
      console.log('Banco de dados local semeado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao semear o banco de dados local:', error);
  }
}
