"use client";

import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/lib/connectivity';
import { syncEngine, SyncStatusReport } from '@/lib/syncEngine';
import { localDb, seedLocalDatabase } from '@/lib/localDb';
import { genId } from '@/lib/utils';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  DatabaseBackup,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';

export function SyncIndicator({ compact = false, machines = [], employees = [] }: { compact?: boolean; machines?: Array<{ id: string; name?: string; type?: string }>; employees?: Array<{ id: string; nome?: string; role?: string }> }) {
  const { isOnline, hasInternet, loading: isProbing, triggerForceProbe } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatusReport>(syncEngine.getStatus());
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  // Subscribe to syncEngine reports
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((latestStatus) => {
      setSyncStatus(latestStatus);
    });
    
    // Seed and refresh counts
    seedLocalDatabase().then(async () => {
      await syncEngine.countPendingRecords();
      // Count failed records in the local queue
      try {
        const failedChk = await localDb.checklists.where('sync_failed').equals(1).count();
        const failedLogs = await localDb.registrosDiarios.where('sync_failed').equals(1).count();
        setFailedCount(failedChk + failedLogs);
      } catch {}
    });

    return unsubscribe;
  }, []);

  // Sync button execution handler
  const handleManualSync = async () => {
    if (isSyncingLocal) return;
    setIsSyncingLocal(true);
    
    try {
      await syncEngine.runSync();
    } catch (e) {
      console.error('Manual synchronizer execution crash:', e);
    } finally {
      setIsSyncingLocal(false);
    }
  };

  // Simulated test local entry generation helper (to easily test offline behavior).
  // Uses a REAL machine from the fleet so the test reflects the actual sync path
  // (not a fake id that would always fail FK validation).
  const handleGenerateOfflineTestPayload = async () => {
    try {
      const realMachine = machines && machines.length > 0 ? machines[0] : null;
      if (!realMachine) {
        alert(
          'Nenhuma máquina real carregada do servidor ainda.\n\n' +
          'Cadastre um ativo na tela de Frota (ou aguarde a sincronização inicial) ' +
          'e tente novamente. O simulador precisa de um ID real para gerar um rascunho sincronizável.'
        );
        return;
      }
      const realEmployee = employees && employees.length > 0 ? employees[0] : null;
      const supervisorId = realEmployee?.id || '11111111-1111-4111-b111-111111111111';

      const uniqueId = genId();
      await localDb.checklists.add({
        id: uniqueId,
        machineId: realMachine.id,
        supervisorId: supervisorId,
        data: new Date().toISOString().split('T')[0],
        status: 'atencao',
        answers: {
          motor: true,
          hidraulica: false,
          pneus: true,
          freios: false
        },
        observacoes: `[SIMULADOR] Rascunho gerado para teste de fila (ativo real: ${realMachine.id}).`,
        synced: 0
      });

      await syncEngine.countPendingRecords();
    } catch (e) {
      console.error('Error generating mock unsynced item:', e);
    }
  };

  // Discard all failed records in the local queue (no prompt, this is the cleanup hatch).
  const handleDiscardAllFailed = async () => {
    try {
      const failedChk = await localDb.checklists.where('sync_failed').equals(1).toArray();
      const failedLogs = await localDb.registrosDiarios.where('sync_failed').equals(1).toArray();
      const total = failedChk.length + failedLogs.length;
      if (total === 0) {
        alert('Não há registros falhos para descartar.');
        return;
      }
      if (!confirm(`Descartar ${total} registro(s) com falha de sincronização?`)) return;

      for (const c of failedChk) await localDb.checklists.delete(c.id);
      for (const l of failedLogs) await localDb.registrosDiarios.delete(l.id);

      setFailedCount(0);
      await syncEngine.countPendingRecords();
    } catch (e) {
      console.error('Discard-all-failed error:', e);
    }
  };

  const hasPending = syncStatus.totalPending > 0;

  return (
    <div className="p-4 bg-white dark:bg-[#151515]/90 border border-gray-200 dark:border-white/10 rounded-2xl space-y-3 shadow-md backdrop-blur-md transition-all duration-300 hover:border-yellow-500/30">
      
      {/* Compact header (only when compact=true): just the sync button + expand toggle */}
      {compact && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncingLocal || (!hasInternet && !isOnline)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              hasPending && hasInternet
                ? 'bg-[#eab308] hover:bg-[#ca8a04] text-black shadow-[0_0_15px_rgba(161,122,240,0.3)]'
                : 'bg-gray-100 dark:bg-[#151515] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-[#1a1a1a]'
            }`}
          >
            <RefreshCw size={13} className={`mr-1 ${isSyncingLocal ? 'animate-spin' : ''}`} />
            <span>{isSyncingLocal ? 'Transmitindo...' : 'Sincronizar Agora'}</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-[#151515] border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer flex items-center justify-center"
            aria-label={isExpanded ? 'Ocultar detalhes de sincronização' : 'Expandir detalhes de sincronização'}
            title={isExpanded ? 'Ocultar detalhes' : 'Expandir detalhes'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      )}

      {/* Full body: shown always when not compact, or when compact and expanded */}
      {(!compact || isExpanded) && (
        <>
      {/* Network Connectivity status visual badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs">
          {hasInternet ? (
            <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-500/20">
              <Wifi size={12} className="mr-1 animate-pulse" />
              ONLINE (Supabase Conectado)
            </div>
          ) : (
            <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/10 dark:bg-red-500/15 text-red-800 dark:text-red-400 font-semibold border border-red-500/20">
              <WifiOff size={12} className="mr-1 animate-bounce" />
              OFFLINE (Fila Local Ativa)
            </div>
          )}
        </div>
        
        {/* Force checker probe */}
        <button 
          onClick={() => triggerForceProbe()}
          disabled={isProbing}
          className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-[#7c4ff0] dark:hover:text-[#a17af0] hover:underline uppercase tracking-wide cursor-pointer disabled:opacity-50"
          title="Forçar Reavaliação de Rede"
        >
          {isProbing ? 'Analisando...' : 'Testar Rede'}
        </button>
      </div>

      {/* Row 2: Queue metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-gray-50 dark:bg-black/35 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Fila Local</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <Database size={13} className={hasPending ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'} />
            <span className={`font-bold font-heading text-sm ${hasPending ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-white'}`}>
              {syncStatus.totalPending} pendentes
            </span>
          </div>
        </div>

        <div className="p-2 bg-gray-50 dark:bg-black/35 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Sucesso Recente</span>
          <div className="flex items-center space-x-1.5 mt-0.5 text-emerald-700 dark:text-emerald-400 font-heading font-bold text-sm">
            <CheckCircle size={13} />
            <span>+{syncStatus.syncedCount}</span>
          </div>
        </div>
      </div>

      {/* Failed records quick-action row */}
      {failedCount > 0 && (
        <div className="flex items-center justify-between gap-2 p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
          <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle size={11} />
            {failedCount} com falha na fila
          </div>
          <button
            onClick={handleDiscardAllFailed}
            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-md text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={10} />
            Descartar todos
          </button>
        </div>
      )}

      {/* Primary Sync Actions (only when NOT compact) */}
      {!compact && (
        <div className="space-y-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncingLocal || (!hasInternet && !isOnline)}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              hasPending && hasInternet
                ? 'bg-[#eab308] hover:bg-[#ca8a04] text-black shadow-[0_0_15px_rgba(161,122,240,0.3)]'
                : 'bg-gray-100 dark:bg-[#151515] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-[#1a1a1a]'
            }`}
          >
            <RefreshCw size={13} className={`mr-1 ${isSyncingLocal ? 'animate-spin' : ''}`} />
            <span>{isSyncingLocal ? 'Transmitindo...' : 'Sincronizar Agora'}</span>
          </button>

          {/* Dynamic Sync state detailed info logs */}
          {syncStatus.lastSyncTime && (
            <p className="text-[9px] text-gray-500 dark:text-gray-400 text-center">
              Último sincronismo: <span className="text-gray-700 dark:text-gray-300 font-semibold">{syncStatus.lastSyncTime}</span>
            </p>
          )}
        </div>
      )}

      {/* Sync Error Board fallback alerts if offline transfers failed */}
      {syncStatus.errors.length > 0 && (
        <div className="p-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl space-y-2">
          <div className="flex items-center text-red-800 dark:text-red-400 font-heading font-bold text-[10px]">
            <AlertTriangle size={12} className="mr-1 flex-shrink-0" />
            FALHA NA SINCRONIZAÇÃO
          </div>
          <div className="max-h-20 overflow-y-auto text-[9px] text-red-700 dark:text-red-300 leading-relaxed font-mono divide-y divide-red-200 dark:divide-red-500/10">
            {syncStatus.errors.slice(0, 5).map((e, idx) => (
              <div key={`${e.id}-${idx}`} className="py-1">
                [{e.table}] {e.message}
              </div>
            ))}
            {syncStatus.errors.length > 5 && (
              <div className="py-1 italic">+{syncStatus.errors.length - 5} erro(s) omitido(s)</div>
            )}
          </div>
          <p className="text-[9px] text-red-700 dark:text-red-300 leading-snug">
            Os registros <strong>não foram apagados</strong>. Abra a aba <strong>Fila Local</strong> no painel operacional para revisar, tentar novamente ou descartar.
          </p>
        </div>
      )}

      {/* Dev Simulator Actions */}
      <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-[10px]">
        <button
          onClick={handleGenerateOfflineTestPayload}
          className="text-gray-600 hover:text-[#7c4ff0] dark:text-gray-400 dark:hover:text-white transition-colors flex items-center space-x-1 cursor-pointer"
          title="Simular perda de internet inserindo um checklist local pendente de envio"
        >
          <DatabaseBackup size={11} className="text-[#eab308]" />
          <span>+ Inserir Rascunho Offline</span>
        </button>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-[9px] flex items-center space-x-0.5"
        >
          <Info size={10} />
          <span>{showDetails ? 'Ocultar' : 'Detalhes'}</span>
        </button>
      </div>

      {/* Manual Cleanup of Corrupted Data */}
      <div className="space-y-1 pt-1">
        <button 
          onClick={async () => {
            if (confirm(
              "Deseja apagar apenas registros de TESTE (prefixo 'simulated-' ou equipamento 'CAT320') do cache local?\n\n" +
              "Registros reais com falha de sincronização NÃO serão apagados — eles ficam na Fila Local para você revisar."
            )) {
              const checklists = await localDb.checklists.toArray();
              const logs = await localDb.registrosDiarios.toArray();

              let removed = 0;
              // Only clean obvious test/simulated records, never user data.
              for (const c of checklists) {
                const isTest = c.id.startsWith("simulated-") || c.machineId === "CAT320";
                if (isTest) {
                  await localDb.checklists.delete(c.id);
                  removed++;
                }
              }
              for (const l of logs) {
                const isTest = l.id.startsWith("simulated-") || l.machineId === "CAT320";
                if (isTest) {
                  await localDb.registrosDiarios.delete(l.id);
                  removed++;
                }
              }

              await syncEngine.countPendingRecords();
              alert(`Limpeza concluída. ${removed} registro(s) de teste removido(s).`);
            }
          }}
          className="w-full text-[9px] text-red-500 hover:text-red-700 underline text-center cursor-pointer"
        >
          Limpar apenas rascunhos de teste do simulador
        </button>
      </div>

      {showDetails && (
        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-black/60 border border-gray-100 dark:border-white/5 text-[9px] text-gray-600 dark:text-gray-400 leading-relaxed space-y-1.5 font-mono">
          <p className="font-semibold text-gray-900 dark:text-white">Esquemas Locais (IndexedDB):</p>
          <ul className="list-disc pl-3 space-y-0.5">
            <li><span className="text-amber-700 dark:text-yellow-400">users:</span> id, email, status, role [Indexed]</li>
            <li><span className="text-amber-700 dark:text-yellow-400">checklists:</span> machineId, supervisorId, answers [Indexed]</li>
            <li><span className="text-amber-700 dark:text-yellow-400">registrosDiarios:</span> horimetro, status, synced [Indexed]</li>
          </ul>
          <p className="text-[8px] text-gray-500 dark:text-gray-400">Transação de Sincronia usa rollback atômico e remapeamento de Fk de negócios.</p>
        </div>
      )}

        </>
      )}

      {/* Last sync timestamp (shown in compact mode when expanded, hidden when collapsed) */}
      {compact && isExpanded && syncStatus.lastSyncTime && (
        <p className="text-[9px] text-gray-500 dark:text-gray-400 text-center">
          Último sincronismo: <span className="text-gray-700 dark:text-gray-300 font-semibold">{syncStatus.lastSyncTime}</span>
        </p>
      )}

    </div>
  );
}
export default SyncIndicator;
