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
}

// Subclass Dexie to define our high-performance Local Database
class CodelmaqLocalDatabase extends Dexie {
  users!: Table<LocalUser>;
  checklists!: Table<LocalChecklist>;
  registrosDiarios!: Table<LocalRegistroDiario>;

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
