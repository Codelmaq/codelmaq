'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import {
  useTrustedClock,
  classifyClock,
  ClockSeverity,
} from '@/hooks/useTrustedClock';
import {
  getClockState,
} from '@/lib/trustedClock';
import { useShiftFeedback } from './ShiftFeedbackProvider';
import { playError, playSuccess } from '@/lib/audioFeedback';

/**
 * Formatador bonitinho pra drift em português.
 *   "12s" / "3min 40s" / "1h 22min"
 */
function formatDrift(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < 60 * 1000) {
    return `${Math.round(abs / 1000)}s`;
  }
  if (abs < 60 * 60 * 1000) {
    const m = Math.floor(abs / 60_000);
    const s = Math.round((abs % 60_000) / 1000);
    return s ? `${m}min ${s}s` : `${m}min`;
  }
  const h = Math.floor(abs / 3_600_000);
  const m = Math.round((abs % 3_600_000) / 60_000);
  return m ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Provider global de proteção contra alteração de relógio do dispositivo.
 *
 *   - 'ok'   : nada visível.
 *   - 'warn' : banner amarelo persistente no topo, sem bloqueio. Útil pra alertar.
 *   - 'block': banner vermelho persistente + beep de erro na primeira detecção.
 *              Formulários que usam `useTrustedClock().blocksSubmits` recusam submit.
 *
 * Para usar: incluir <ClockGuard /> uma vez no layout raiz.
 */
export function ClockGuard() {
  const { state, severity, driftMs, offsetMs, isRefreshing, refresh } =
    useTrustedClock();
  const feedback = useShiftFeedback();

  // Dispara SOM + modal uma única vez na transição OK -> BLOCK|WARN. Sem isso o
  // usuário fica olhando o banner eternamente sem entender.
  const lastAlertedSeverityRef = useRef<ClockSeverity>('ok');
  useEffect(() => {
    if (
      severity !== 'ok' &&
      state &&
      lastAlertedSeverityRef.current === 'ok' &&
      typeof window !== 'undefined'
    ) {
      const isBlocking = severity === 'block';
      playError();
      feedback.showWithSound({
        kind: 'error',
        title: isBlocking
          ? 'Relógio do aparelho FORA do servidor'
          : 'Diferença detectada entre aparelho e servidor',
        subtitle: isBlocking
          ? `Drift de ${formatDrift(state.absDriftMs)}. Novos registros estão BLOQUEADOS até você revalidar.`
          : `Drift de ${formatDrift(state.absDriftMs)}. Recomendamos ativar "Data/hora automática" nas configurações do aparelho.`,
        errorMessage:
          'Por segurança, o sistema registra os horários usando o relógio do servidor (Supabase), não o do aparelho.',
      });
    }
    lastAlertedSeverityRef.current = severity;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, state?.measuredAt]);

  // Não medir online = não tem como saber o drift. Deixa passar (camada de
  // segurança final é o trigger no banco).
  if (severity === 'ok' || !state) {
    return null;
  }

  const isBlocking = severity === 'block';
  const sign = offsetMs && offsetMs > 0 ? 'adiantado' : 'atrasado';
  const border = isBlocking ? 'border-red-500/40' : 'border-amber-500/40';
  const bg = isBlocking
    ? 'bg-red-600/95 text-white shadow-lg shadow-red-500/20'
    : 'bg-amber-500/95 text-amber-950 shadow-lg shadow-amber-500/20';
  const Icon = isBlocking ? ShieldAlert : AlertTriangle;

  const handleRefresh = async () => {
    await refresh();
    // Confere a nova severidade após o refresh.
    const newSeverity = classifyClock(getClockState());
    if (newSeverity === 'ok') {
      playSuccess();
      feedback.showWithSound({
        kind: 'success',
        title: 'Relógio sincronizado',
        subtitle: 'Drift dentro da tolerância. Registros liberados.',
      });
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-0 left-0 right-0 z-[100] ${bg} border-b ${border} backdrop-blur-md transition-all`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-start gap-3 text-xs sm:text-sm">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-black uppercase tracking-wider text-[11px] sm:text-xs leading-tight">
            {isBlocking
              ? 'Relógio do aparelho divergente do servidor'
              : 'Atenção: relógio do aparelho fora do horário real'}
          </p>
          <p className="text-[11px] sm:text-xs opacity-95 mt-0.5 leading-snug">
            Diferença: <strong>{formatDrift(driftMs || 0)}</strong>
            {' '}(aparelho {sign} em relação ao servidor).
            {isBlocking
              ? ' Novos registros estão bloqueados até sincronizar.'
              : ' Recomendamos ativar "Data/hora automática" nas configurações do aparelho.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-60 ${
            isBlocking
              ? 'bg-white/15 hover:bg-white/25 text-white'
              : 'bg-amber-900/10 hover:bg-amber-900/20 text-amber-950'
          }`}
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? '...' : 'Revalidar'}
        </button>
      </div>
    </div>
  );
}

/**
 * Hook utilitário pra usar em qualquer formulário que queira bloquear submit
 * quando o relógio do aparelho estiver severamente desviado.
 *
 * Exemplo:
 *
 *   const { blocksSubmits, severity, driftMs } = useClockGuard();
 *   if (blocksSubmits) {
 *     feedback.showError({ title: 'Bloqueado', ... });
 *     return;
 *   }
 */
export function useClockGuard() {
  const { blocksSubmits, severity, driftMs } = useTrustedClock();
  return { blocksSubmits, severity, driftMs };
}
