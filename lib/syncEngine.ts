import { mapDBToMachine, mapMachineToDB, mapDBToLog, mapLogToDB, mapDBToRefill, mapRefillToDB, mapDBToPlan, mapPlanToDB, mapDBToMaintenances, mapMaintenancesToDB, mapDBToEmployee, mapEmployeeToDB, mapSiteToDB, mapDBToSite, mapDBToTemplate, mapTemplateToDB, mapChecklistToDB, mapDBToChecklist } from '@/lib/mapper';
import { localDb, LocalChecklist, LocalRegistroDiario, LocalUser } from './localDb';
import { supabase } from './supabase';
import { connectivityService } from './connectivity';
import { genId } from '@/lib/utils';

export interface SyncStatusReport {
  isChecking: boolean;
  isSyncing: boolean;
  totalPending: number;
  syncedCount: number;
  errors: Array<{ table: string; id: string; message: string }>;
  lastSyncTime: string | null;
}

class CodelmaqSyncEngine {
  private status: SyncStatusReport = {
    isChecking: false,
    isSyncing: false,
    totalPending: 0,
    syncedCount: 0,
    errors: [],
    lastSyncTime: typeof window !== 'undefined' ? localStorage.getItem('codelmaq_last_sync') : null
  };

  private observers: Set<(status: SyncStatusReport) => void> = new Set();

  public subscribe(observer: (status: SyncStatusReport) => void) {
    this.observers.add(observer);
    observer({ ...this.status });
    return () => {
      this.observers.delete(observer);
    };
  }

  private notifyAll() {
    this.observers.forEach(obs => obs({ ...this.status }));
  }

  // Get current state
  public getStatus(): SyncStatusReport {
    return { ...this.status };
  }

  // Check the queue count of local unsynced records
  public async countPendingRecords(): Promise<number> {
    try {
      const unsyncedUsers = await localDb.users.where('synced').equals(0).count();
      const unsyncedChecklists = await localDb.checklists.where('synced').equals(0).count();
      const unsyncedRegs = await localDb.registrosDiarios.where('synced').equals(0).count();
      
      const total = unsyncedUsers + unsyncedChecklists + unsyncedRegs;
      this.status.totalPending = total;
      this.notifyAll();
      return total;
    } catch (e) {
      console.error('Error counting pending records:', e);
      return 0;
    }
  }

  // Synchronize unsynced records with Supabase cloud database securely
  public async runSync(): Promise<SyncStatusReport> {
    if (this.status.isSyncing) return this.status;

    this.status.isSyncing = true;
    this.status.syncedCount = 0;
    this.status.errors = [];
    this.notifyAll();

    // Verify raw network connection using our healthy ping probe
    const ok = await connectivityService.probeInternet();
    if (!ok) {
      this.status.isSyncing = false;
      this.status.errors.push({
        table: 'Network',
        id: 'network-probe',
        message: 'Aparelho offline. Sincronização adiada até conseguir reestabelecer conexão com a internet.'
      });
      this.notifyAll();
      return this.status;
    }

    try {
      // 1. Sync User profiles
      const pendingUsers = await localDb.users.where('synced').equals(0).toArray();
      for (const localUser of pendingUsers) {
        try {
          const { error } = await supabase
            .from('funcionarios')
            .upsert(mapEmployeeToDB(localUser));

          if (error) throw error;

          // Update local status with synced indicator
          await localDb.users.update(localUser.id, { synced: 1 });
          this.status.syncedCount++;
          this.notifyAll();
        } catch (err: any) {
          console.error(`Erro ao sincronizar usuario ${localUser.id}:`, err);
          this.status.errors.push({
            table: 'funcionarios',
            id: localUser.id,
            message: err.message || 'Erro deconhecido ao upsertar perfil'
          });
          this.notifyAll();
        }
      }

      // 2. Sync Checklists
      const pendingChecklists = await localDb.checklists.where('synced').equals(0).toArray();
      for (const localChk of pendingChecklists) {
        try {
          // Auto-heal invalid UUIDs (like simulated-xxxx)
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(localChk.id);
          let finalPayload = mapChecklistToDB(localChk);
          
          if (!isUuid) {
            console.warn(`Healing invalid UUID for checklist: ${localChk.id}`);
             const newId = genId();
            finalPayload.id = newId;
            // Update local ID to prevent future sync failures with same wrong ID
            await localDb.checklists.update(localChk.id, { id: newId });
          }

          const { error } = await supabase
            .from('checklists')
            .upsert(finalPayload);

          if (error) {
            // Handle Foreign Key violation (23503) specifically
            if (error.code === '23503') {
              console.error(`FK violation for checklist ${localChk.id}: ${error.details}`);
              this.status.errors.push({
                table: 'checklists',
                id: localChk.id,
                message: `Equipamento referenciado (${localChk.machineId}) não existe no servidor. Registro removido localmente.`
              });
              // CRITICAL: Remove the orphan record to unblock the queue
              await localDb.checklists.delete(localChk.id);
              this.notifyAll();
              continue; 
            }

            // Handle invalid integer/type (22P02)
            if (error.code === '22P02') {
              console.error(`Invalid data type for checklist ${localChk.id}: ${error.message}`);
              this.status.errors.push({
                table: 'checklists',
                id: localChk.id,
                message: `Dados inválidos detectedos (texto em campo numérico). Registro removido para evitar travamento.`
              });
              await localDb.checklists.delete(localChk.id);
              this.notifyAll();
              continue;
            }

            // Self-healing layout fallback logic (handles columns naming schemas in our DB if required)
            if (error.message.includes("column")) {
              const fallbackPayload: any = {
                id: localChk.id,
                ativo_id: localChk.machineId,
                supervisor_id: localChk.supervisorId,
                data: localChk.data,
                status: localChk.status,
                respostas: localChk.answers,
                observacoes: localChk.observacoes
              };
              const { error: retryError } = await supabase.from('checklists').upsert(fallbackPayload);
              if (retryError) throw retryError;
            } else {
              throw error;
            }
          }

          await localDb.checklists.update(localChk.id, { synced: 1 });
          this.status.syncedCount++;
          this.notifyAll();
        } catch (err: any) {
          console.error(`Erro ao sincronizar checklist ${localChk.id}:`, err);
          this.status.errors.push({
            table: 'checklists',
            id: localChk.id,
            message: err.message || 'Erro durante a sincronização de checklist'
          });
          this.notifyAll();
        }
      }

      // 3. Sync Daily Logs
      const pendingRegs = await localDb.registrosDiarios.where('synced').equals(0).toArray();
      for (const localReg of pendingRegs) {
        try {
          // Auto-heal invalid UUIDs
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(localReg.id);
          let finalPayload = mapLogToDB(localReg);
          
          if (!isUuid) {
             console.warn(`Healing invalid UUID for registro_diario: ${localReg.id}`);
            const newId = genId();
             finalPayload.id = newId;
             await localDb.registrosDiarios.update(localReg.id, { id: newId });
          }

          const { error } = await supabase
            .from('registros_diarios')
            .upsert(finalPayload);

          if (error) {
            // Handle Foreign Key violation (23503) specifically
            if (error.code === '23503') {
              console.error(`FK violation for registro_diario ${localReg.id}: ${error.details}`);
              this.status.errors.push({
                table: 'registros_diarios',
                id: localReg.id,
                message: `Equipamento (${localReg.machineId}) ou Operador não existe no servidor. Registro removido.`
              });
              await localDb.registrosDiarios.delete(localReg.id);
              this.notifyAll();
              continue; 
            }

            // Handle invalid integer/type (22P02)
            if (error.code === '22P02') {
              console.error(`Invalid data type for registro_diario ${localReg.id}: ${error.message}`);
              this.status.errors.push({
                table: 'registros_diarios',
                id: localReg.id,
                message: `Dados numéricos inválidos encontrados. Registro removido.`
              });
              await localDb.registrosDiarios.delete(localReg.id);
              this.notifyAll();
              continue;
            }

            if (error.message.includes("column")) {
              const fallbackPayload: any = {
                id: localReg.id,
                ativo_id: localReg.machineId,
                operador_id: localReg.operatorId,
                frente_servico_id: localReg.siteId,
                data: localReg.data,
                horimetro_inicial: localReg.horimetroInicial,
                horimetro_final: localReg.horimetroFinal,
                status: localReg.status,
                combustivel_adicionado: localReg.fuelAdded,
                observacoes: localReg.observations
              };
              const { error: retryError } = await supabase.from('registros_diarios').upsert(fallbackPayload);
              if (retryError) throw retryError;
            } else {
              throw error;
            }
          }

          await localDb.registrosDiarios.update(localReg.id, { synced: 1 });
          this.status.syncedCount++;
          this.notifyAll();
        } catch (err: any) {
          console.error(`Erro ao sincronizar parte diária ${localReg.id}:`, err);
          this.status.errors.push({
            table: 'registros_diarios',
            id: localReg.id,
            message: err.message || 'Erro durante a sincronização de parte diária'
          });
          this.notifyAll();
        }
      }

    } catch (e: any) {
      console.error('Critical failure during sync run loop:', e);
      this.status.errors.push({
        table: 'System',
        id: 'critical-sync',
        message: e.message || 'Falha de sistema crítica'
      });
    } finally {
      this.status.isSyncing = false;
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const fullDate = new Date().toLocaleDateString('pt-BR');
      const timeStampStr = `${fullDate} às ${now}`;
      this.status.lastSyncTime = timeStampStr;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('codelmaq_last_sync', timeStampStr);
      }
      
      // Re-evaluate pending count
      await this.countPendingRecords();
      this.notifyAll();
    }

    return this.status;
  }
}

export const syncEngine = new CodelmaqSyncEngine();
