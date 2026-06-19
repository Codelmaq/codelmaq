import Dexie, { Table } from 'dexie';

// Interfaces for local database schemas representing our offline business models
export interface LocalUser {
  id: string;          // uuid or operator identifier
  nome: string;
  email: string;
  role: 'administrador' | 'colaborador' | 'mecanico';
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

export interface LocalRegistroDiario {
  id: string;          // uuid
  operatorId: string;
  machineId: string;
  siteId: string;
  data: string;        // YYYY-MM-DD
  horimetroInicial: number;
  horimetroFinal: number;
  status: 'rascunho' | 'fechado';
  synced: number;      // 0 = pending, 1 = synced
  sync_failed?: number; // 1 = sync attempted but failed (e.g. FK violation). Stays in queue for review.
  sync_error?: string;  // human-readable error from the last failed sync attempt
  fuelAdded?: number;
  observations?: string;
  created_at?: string;
  checklistId?: string; // linked checklist id
  photos?: string[];    // Compressed image base64 URIs saved locally
  // Device clock timestamps captured on scan and on close
  horaInicio?: string;  // ISO timestamp set on QR scan / shift start
  horaFim?: string;     // ISO timestamp set on shift end
  fechadoEm?: string;   // ISO timestamp set on shift end (alias of horaFim)
  previousHorimetro?: number; // pre-fill reference from last shift's horimetroFinal
}

// Subclass Dexie to define our high-performance Local Database
class CodelmaqLocalDatabase extends Dexie {
  users!: Table<LocalUser>;
  checklists!: Table<LocalChecklist>;
  registrosDiarios!: Table<LocalRegistroDiario>;
  penalties!: Table<LocalPenalty>;

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
          role: 'colaborador',
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
