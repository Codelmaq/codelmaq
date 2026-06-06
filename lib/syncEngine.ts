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

  // Pre-flight check: returns the subset of given ids that do NOT exist in the given Supabase table.
  // Uses a single batched SELECT to avoid FK violation spam from the DB. Empty/null ids are
  // treated as "not required" (valid for nullable FK columns with ON DELETE SET NULL).
  public async verifyReferencesExist(
    table: 'ativos' | 'funcionarios' | 'frentes_servico',
    ids: Array<string | null | undefined>
  ): Promise<{ existing: Set<string>; missing: string[] }> {
    const unique = Array.from(new Set(ids.filter((x): x is string => !!x && typeof x === 'string')));
    if (unique.length === 0) return { existing: new Set(), missing: [] };

    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .in('id', unique);

      if (error) {
        console.warn(`[syncEngine] verifyReferencesExist(${table}) query failed, falling back to optimistic push:`, error.message);
        // On query failure, assume all exist so we still attempt to sync (and rely on the
        // 23503 catch-block to mark records as failed with a real DB error message).
        return { existing: new Set(unique), missing: [] };
      }

      const existing = new Set<string>((data || []).map((row: any) => row.id as string));
      const missing = unique.filter((id) => !existing.has(id));
      return { existing, missing };
    } catch (e) {
      console.warn(`[syncEngine] verifyReferencesExist(${table}) threw, falling back to optimistic push:`, e);
      return { existing: new Set(unique), missing: [] };
    }
  }

  // Backwards-compat shim — kept so any external callers still compile.
  public async verifyMachinesExist(machineIds: string[]) {
    return this.verifyReferencesExist('ativos', machineIds);
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

      // Pre-flight: detect missing FK targets (machine + supervisor) in batched SELECTs,
      // mark orphan records as failed so the user keeps their work in the local queue.
      if (pendingChecklists.length > 0) {
        const chkMachineIds = pendingChecklists.map((c) => c.machineId);
        const chkSupervisorIds = pendingChecklists.map((c) => c.supervisorId);

        const [machineCheck, supervisorCheck] = await Promise.all([
          this.verifyReferencesExist('ativos', chkMachineIds),
          this.verifyReferencesExist('funcionarios', chkSupervisorIds)
        ]);

        const missingMachines = new Set(machineCheck.missing);
        const missingSupervisors = new Set(supervisorCheck.missing);
        const blockedIds = new Set<string>();
        const failureReasons = new Map<string, string>();

        for (const chk of pendingChecklists) {
          if (missingMachines.has(chk.machineId)) {
            failureReasons.set(
              chk.id,
              `Equipamento "${chk.machineId}" não existe no servidor. Crie o cadastro do ativo na tela de Frota ou descarte este registro na Fila Local.`
            );
            blockedIds.add(chk.id);
          } else if (missingSupervisors.has(chk.supervisorId)) {
            failureReasons.set(
              chk.id,
              `Operador/Supervisor "${chk.supervisorId}" não existe no servidor. Cadastre o funcionário ou descarte este registro.`
            );
            blockedIds.add(chk.id);
          }
        }

        for (const [id, msg] of failureReasons) {
          await localDb.checklists.update(id, { sync_failed: 1, sync_error: msg });
          this.status.errors.push({ table: 'checklists', id, message: msg });
          this.notifyAll();
        }

        var syncableChecklists = pendingChecklists.filter((c) => !blockedIds.has(c.id));
      } else {
        var syncableChecklists: typeof pendingChecklists = [];
      }

      for (const localChk of syncableChecklists) {
        try {
          // Auto-heal invalid UUIDs (like simulated-xxxx)
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(localChk.id);
          let finalPayload = mapChecklistToDB(localChk);
          let workingId = localChk.id;

          if (!isUuid) {
            console.warn(`Healing invalid UUID for checklist: ${localChk.id}`);
            const newId = genId();
            finalPayload.id = newId;
            workingId = newId;
            // Update local ID to prevent future sync failures with same wrong ID
            await localDb.checklists.update(localChk.id, { id: newId });
          }

          const { error } = await supabase
            .from('checklists')
            .upsert(finalPayload);

          if (error) {
            // Handle Foreign Key violation (23503) specifically — keep the record, mark as failed.
            if (error.code === '23503') {
              console.error(`FK violation for checklist ${workingId}: ${error.details}`);
              const detail = (error.details || '').toLowerCase();
              let errMsg: string;
              if (detail.includes('funcionarios')) {
                errMsg = `Operador/Supervisor "${localChk.supervisorId}" não existe no servidor. Cadastre o funcionário ou descarte este registro.`;
              } else if (detail.includes('ativos')) {
                errMsg = `Equipamento "${localChk.machineId}" não existe no servidor. Crie o cadastro do ativo ou descarte este registro.`;
              } else {
                errMsg = `Violação de chave estrangeira: ${error.details || error.message}. Revise o registro na Fila Local.`;
              }
              await localDb.checklists.update(workingId, { sync_failed: 1, sync_error: errMsg });
              this.status.errors.push({
                table: 'checklists',
                id: workingId,
                message: errMsg
              });
              this.notifyAll();
              continue;
            }

            // Handle invalid integer/type (22P02) — also non-destructive now.
            if (error.code === '22P02') {
              console.error(`Invalid data type for checklist ${workingId}: ${error.message}`);
              const errMsg = `Dados numéricos inválidos detectados no registro. Revise o horímetro/km e tente novamente.`;
              await localDb.checklists.update(workingId, { sync_failed: 1, sync_error: errMsg });
              this.status.errors.push({
                table: 'checklists',
                id: workingId,
                message: errMsg
              });
              this.notifyAll();
              continue;
            }

            // Self-healing layout fallback logic (handles columns naming schemas in our DB if required)
            if (error.message.includes("column")) {
              const fallbackPayload: any = {
                id: workingId,
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

          await localDb.checklists.update(workingId, { synced: 1, sync_failed: 0, sync_error: undefined });
          this.status.syncedCount++;
          this.notifyAll();
        } catch (err: any) {
          console.error(`Erro ao sincronizar checklist ${localChk.id}:`, err);
          const errMsg = err.message || 'Erro durante a sincronização de checklist';
          await localDb.checklists.update(localChk.id, { sync_failed: 1, sync_error: errMsg });
          this.status.errors.push({
            table: 'checklists',
            id: localChk.id,
            message: errMsg
          });
          this.notifyAll();
        }
      }

      // 3. Sync Daily Logs
      const pendingRegs = await localDb.registrosDiarios.where('synced').equals(0).toArray();

      // Pre-flight: detect missing FK targets (machine + operator + site) in batched SELECTs.
      if (pendingRegs.length > 0) {
        const regMachineIds = pendingRegs.map((r) => r.machineId);
        const regOperatorIds = pendingRegs.map((r) => r.operatorId);
        const regSiteIds = pendingRegs.map((r) => r.siteId);

        const [machineCheck, operatorCheck, siteCheck] = await Promise.all([
          this.verifyReferencesExist('ativos', regMachineIds),
          this.verifyReferencesExist('funcionarios', regOperatorIds),
          this.verifyReferencesExist('frentes_servico', regSiteIds)
        ]);

        const missingMachines = new Set(machineCheck.missing);
        const missingOperators = new Set(operatorCheck.missing);
        const missingSites = new Set(siteCheck.missing);
        const blockedIds = new Set<string>();
        const failureReasons = new Map<string, string>();

        for (const reg of pendingRegs) {
          if (missingMachines.has(reg.machineId)) {
            failureReasons.set(
              reg.id,
              `Equipamento "${reg.machineId}" não existe no servidor. Crie o cadastro do ativo na tela de Frota ou descarte este registro na Fila Local.`
            );
            blockedIds.add(reg.id);
          } else if (missingOperators.has(reg.operatorId)) {
            failureReasons.set(
              reg.id,
              `Operador "${reg.operatorId}" não existe no servidor. Cadastre o funcionário ou descarte este registro.`
            );
            blockedIds.add(reg.id);
          } else if (reg.siteId && missingSites.has(reg.siteId)) {
            failureReasons.set(
              reg.id,
              `Frente de serviço "${reg.siteId}" não existe no servidor. Cadastre a frente de serviço ou descarte este registro.`
            );
            blockedIds.add(reg.id);
          }
        }

        for (const [id, msg] of failureReasons) {
          await localDb.registrosDiarios.update(id, { sync_failed: 1, sync_error: msg });
          this.status.errors.push({ table: 'registros_diarios', id, message: msg });
          this.notifyAll();
        }

        var syncableRegs = pendingRegs.filter((r) => !blockedIds.has(r.id));
      } else {
        var syncableRegs: typeof pendingRegs = [];
      }

      for (const localReg of syncableRegs) {
        try {
          // Auto-heal invalid UUIDs
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(localReg.id);
          let finalPayload = mapLogToDB(localReg);
          let workingId = localReg.id;
          
          if (!isUuid) {
            console.warn(`Healing invalid UUID for registro_diario: ${localReg.id}`);
            const newId = genId();
            finalPayload.id = newId;
            workingId = newId;
            await localDb.registrosDiarios.update(localReg.id, { id: newId });
          }

          const { error } = await supabase
            .from('registros_diarios')
            .upsert(finalPayload);

          if (error) {
            // Handle Foreign Key violation (23503) — non-destructive: mark as failed.
            if (error.code === '23503') {
              console.error(`FK violation for registro_diario ${workingId}: ${error.details}`);
              const detail = (error.details || '').toLowerCase();
              let errMsg: string;
              if (detail.includes('funcionarios')) {
                errMsg = `Operador "${localReg.operatorId}" não existe no servidor. Cadastre o funcionário ou descarte este registro.`;
              } else if (detail.includes('ativos')) {
                errMsg = `Equipamento "${localReg.machineId}" não existe no servidor. Crie o cadastro do ativo ou descarte este registro.`;
              } else if (detail.includes('frentes_servico')) {
                errMsg = `Frente de serviço "${localReg.siteId}" não existe no servidor. Cadastre a frente de serviço ou descarte este registro.`;
              } else {
                errMsg = `Violação de chave estrangeira: ${error.details || error.message}. Revise o registro na Fila Local.`;
              }
              await localDb.registrosDiarios.update(workingId, { sync_failed: 1, sync_error: errMsg });
              this.status.errors.push({
                table: 'registros_diarios',
                id: workingId,
                message: errMsg
              });
              this.notifyAll();
              continue;
            }

            // Handle invalid integer/type (22P02) — non-destructive.
            if (error.code === '22P02') {
              console.error(`Invalid data type for registro_diario ${workingId}: ${error.message}`);
              const errMsg = `Dados numéricos inválidos detectados (horímetro/km). Revise os valores e tente novamente.`;
              await localDb.registrosDiarios.update(workingId, { sync_failed: 1, sync_error: errMsg });
              this.status.errors.push({
                table: 'registros_diarios',
                id: workingId,
                message: errMsg
              });
              this.notifyAll();
              continue;
            }

            if (error.message.includes("column")) {
              const fallbackPayload: any = {
                id: workingId,
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

          await localDb.registrosDiarios.update(workingId, { synced: 1, sync_failed: 0, sync_error: undefined });
          this.status.syncedCount++;
          this.notifyAll();
        } catch (err: any) {
          console.error(`Erro ao sincronizar parte diária ${localReg.id}:`, err);
          const errMsg = err.message || 'Erro durante a sincronização de parte diária';
          await localDb.registrosDiarios.update(localReg.id, { sync_failed: 1, sync_error: errMsg });
          this.status.errors.push({
            table: 'registros_diarios',
            id: localReg.id,
            message: errMsg
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
