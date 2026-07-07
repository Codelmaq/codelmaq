'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  measureClockSkew,
  getClockState,
  subscribeClock,
  classifyClock,
  ClockState,
  ClockSeverity,
  CLOCK_SKEW_TOLERANCE_MS,
} from '@/lib/trustedClock';

// Re-export pra conveniência dos componentes.
export { classifyClock, CLOCK_SKEW_TOLERANCE_MS };
export type { ClockState, ClockSeverity };

type Result = {
  state: ClockState | null;
  severity: ClockSeverity;
  /** Drift em ms (sempre >= 0, ou null se nunca medido). */
  driftMs: number | null;
  /** Offset assinado: positivo = device ADIANTADO, negativo = ATRASADO. */
  offsetMs: number | null;
  /** True se o drift atual ultrapassa a tolerância (warn ou block). */
  isDrift: boolean;
  /** True se estamos NESSA hora bloqueando submits (severity === 'block'). */
  blocksSubmits: boolean;
  isRefreshing: boolean;
  /** Dispara uma nova medição manualmente (botão "revalidar"). */
  refresh: () => Promise<void>;
};

/**
 * Hook React que monitora continuamente o drift entre o relógio do device e o
 * do servidor Supabase.
 *
 * Comportamento:
 *   - Mede uma vez no mount (se estiver online).
 *   - Refaz a cada 5 min automaticamente.
 *   - Refaz quando a aba volta a ficar visível (visibilitychange).
 *   - Reage a mudanças online/offline.
 */
export function useTrustedClock(): Result {
  const [state, setState] = useState<ClockState | null>(() => getClockState());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      // Sem rede — não tenta.
      return;
    }
    setIsRefreshing(true);
    try {
      const next = await measureClockSkew();
      if (!cancelledRef.current) {
        setState(next);
      }
    } finally {
      if (!cancelledRef.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    // Subscribe interna do helper pra repassar pro state.
    const unsub = subscribeClock((s) => {
      if (!cancelledRef.current) setState(s);
    });

    // Mede já de cara se ainda não temos cache (device acabou de abrir o app).
    if (!state && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      refresh();
    }

    // Loop de 5 min.
    const intervalId = window.setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
        refresh();
      }
    }, 5 * 60 * 1000);

    // Quando a aba volta ao foco, re-mede. (Quando o cara tá mexendo no relógio
    // do celular e volta pro app, é aqui que a gente pega o novo drift rápido.)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Quando a rede volta, re-mede.
    const onOnline = () => refresh();
    window.addEventListener('online', onOnline);

    return () => {
      cancelledRef.current = true;
      unsub();
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const severity = classifyClock(state);
  const driftMs = state ? state.absDriftMs : null;
  const offsetMs = state ? state.offsetMs : null;
  const isDrift = severity !== 'ok';
  const blocksSubmits = severity === 'block';

  return { state, severity, driftMs, offsetMs, isDrift, blocksSubmits, isRefreshing, refresh };
}
