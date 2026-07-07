/**
 * TrustedClock — fonte de "agora" à prova de alteração de relógio do dispositivo.
 *
 * Como funciona:
 *   1. Faz uma requisição leve ao Supabase REST (HEAD/GET com 0 linhas).
 *   2. Lê o header HTTP `Date` da resposta — esse header é a hora UTC do servidor,
 *      IMPOSSÍVEL de manipular pelo JS do navegador.
 *   3. Compara `Date.now()` (do device) com o timestamp do servidor pra calcular o offset.
 *   4. Cacheia o offset por N minutos (configurável). Enquanto o cache está vivo,
 *      `trustedNow()` retorna o "agora" corrigido.
 *
 * Limitação importante: NO MODO OFFLINE não dá pra checar o servidor. Nesse caso
 * usamos o último offset conhecido (se disponível) ou o `Date.now()` puro. O backend
 * (Supabase) é a camada de autoridade final: o trigger garante que `criado_em` seja
 * SEMPRE `now()` do Postgres, independente do que o front mandou.
 *
 * O que isso PREVINE:
 *   - Operador adianta/atrasa o relógio do aparelho pra "encaixar" um turno extra
 *     ou apagar uma falta. O drift aparece no banner + bloqueio de submit ONLINE.
 *
 * O que isso NÃO PREVINE (cenário offline-first):
 *   - Operador entra em modo avião, registra um turno com a data "forjada", depois
 *     religa a rede. Aí o backend ainda sobrescreve `criado_em` com `now()` real,
 *     mas a coluna `data` (string YYYY-MM-DD) que o operador digitou continua falsa.
 *     Para isso, o botão de submit OFFLINE também checa o drift conhecido: se o último
 *     drift medido for grande, o registro local ganha uma flag `clock_skew_suspect: 1`
 *     pra o admin revisar depois.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Tolerância: se o relógio do aparelho estiver mais que X milissegundos longe do
// servidor, tratamos como "suspeito". Padrão: 5 minutos. Generoso pro fuso,
// timezone bug de JVM, relógio de bateria fraca, etc.
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

// Cache do offset: válído por 5 minutos pra não martelar o servidor a cada submit.
const CACHE_TTL_MS = 5 * 60 * 1000;

// Chave do localStorage — usada pra mostrar o status mesmo offline.
const STORAGE_KEY = 'codelmaq.trustedClock.v1';

// Config do endpoint público do Supabase (também serve arquivos estáticos).
// O segredo aqui é o HEADER `Date` da resposta HTTP, que o browser deixa ler.
const SUPABASE_DATE_PROBE_URL = () => {
  const url = (supabase as any)?.supabaseUrl || (supabase as any)?.restUrl;
  if (typeof url !== 'string') return null;
  // Raiz do projeto serve um index.html com header Date real.
  return url.replace(/\/+$/, '');
};

export type ClockState = {
  /** Offset em ms: `serverTime = deviceTime - offsetMs`. Positivo = device adiantado. */
  offsetMs: number;
  /** Drift absoluto em ms (sempre >= 0). */
  absDriftMs: number;
  /** Quando o offset foi medido (Date.now() do device). */
  measuredAt: number;
  /** Quando foi medida a hora do servidor (Date string parseada). */
  serverTimeAt: number;
  /** Se a checagem foi bem-sucedida (online). */
  online: boolean;
};

type Listener = (state: ClockState | null) => void;

let cached: ClockState | null = null;
let inFlight: Promise<ClockState | null> | null = null;
const listeners = new Set<Listener>();

const isBrowser = typeof window !== 'undefined';

function persist() {
  if (!isBrowser) return;
  try {
    if (cached) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    }
  } catch {
    // localStorage cheio / bloqueado — não é fatal, perdemos só o cache entre reloads.
  }
}

function loadPersisted(): ClockState | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClockState;
    if (typeof parsed.offsetMs !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Faz uma única medição do drift entre o device e o servidor.
 * Retorna null se offline / falhar (ou se Supabase não estiver configurado).
 */
export async function measureClockSkew(): Promise<ClockState | null> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!isSupabaseConfigured) return null;
    const probeUrl = SUPABASE_DATE_PROBE_URL();
    if (!probeUrl) return null;

    // Mede o "agora" do device antes de disparar a request. Boa aproximação; a
    // diferença é só a latência do round-trip (algumas dezenas de ms em redes ok).
    const deviceBefore = Date.now();

    let serverHeaderTime: number | null = null;
    try {
      // `fetch` direto (sem passar pelo cliente Supabase) pra ler os headers crus.
      // `cache: 'no-store'` garante que pegamos a hora "fresca" e não de cache.
      const res = await fetch(probeUrl, {
        method: 'HEAD',
        cache: 'no-store',
        // O Supabase não exige auth pra HEAD na raiz do projeto em geral; se
        // o seu projeto estiver com auth obrigatória, troque por uma rota
        // pública que você controla (ex.: uma Edge Function `/_health`).
      });
      const dateHeader = res.headers.get('date') || res.headers.get('Date');
      if (dateHeader) {
        const parsed = Date.parse(dateHeader);
        if (Number.isFinite(parsed)) serverHeaderTime = parsed;
      }
    } catch {
      // Offline / CORS / timeout — fica com o cache anterior (se houver).
    }

    const deviceAfter = Date.now();

    if (serverHeaderTime === null) {
      // Sem chance de medir online — não sobrescreve o cache.
      return cached;
    }

    // Estima a hora do servidor como se fosse medida no MEIO do round-trip.
    const deviceMid = Math.round((deviceBefore + deviceAfter) / 2);
    const offsetMs = deviceMid - serverHeaderTime;

    const state: ClockState = {
      offsetMs,
      absDriftMs: Math.abs(offsetMs),
      measuredAt: Date.now(),
      serverTimeAt: serverHeaderTime,
      online: true,
    };

    cached = state;
    persist();
    listeners.forEach((l) => l(cached));
    return state;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/**
 * Retorna o último estado conhecido (cache ou persistido). Pode ser null se nunca
 * foi medido e o device está offline.
 */
export function getClockState(): ClockState | null {
  if (cached) return cached;
  const persisted = loadPersisted();
  if (persisted) cached = persisted;
  return cached;
}

/**
 * Subscribe a mudanças no estado do relógio (ex.: após uma medição nova chegar).
 */
export function subscribeClock(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * "Agora" confiável: device time corrigido pelo offset conhecido.
 *
 *   - ONLINE (cache fresco): deviceMid - offset => hora UTC do servidor
 *   - OFFLINE / cache expirado: fallback pro `Date.now()` puro (mas o backend vai
 *     sobrescrever `criado_em` via trigger na hora de sincronizar)
 */
export function trustedNow(): Date {
  const state = getClockState();
  if (!state) return new Date();
  // serverTime + (agoraDoDevice - momentoDaMedicao) = estimativa do "agora" no servidor
  const elapsedSinceMeasurement = Date.now() - state.measuredAt;
  return new Date(state.serverTimeAt + elapsedSinceMeasurement);
}

/** Mesmo que `trustedNow()` mas em ms. */
export function trustedNowMs(): number {
  return trustedNow().getTime();
}

/** YYYY-MM-DD confiável (data do servidor, não do device). */
export function trustedDayString(): string {
  // toISOString() já dá UTC; só pegar os primeiros 10 chars.
  return trustedNow().toISOString().slice(0, 10);
}

/** Hora completa ISO confiável. */
export function trustedNowIso(): string {
  return trustedNow().toISOString();
}

/**
 * Limpa o cache (útil em testes). A próxima `measureClockSkew()` ou `trustedNow()`
 * recomeça do zero.
 */
export function resetTrustedClockCache() {
  cached = null;
  if (isBrowser) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  listeners.forEach((l) => l(null));
}

/**
 * Helper de classificação: dado o estado atual, qual a severidade do drift?
 *
 *   - 'ok'    : dentro da tolerância, libera tudo
 *   - 'warn'  : drift entre 5min e 1h, mostra aviso mas não bloqueia (já ajuda a
 *               alertar o operador que o relógio dele está estranho)
 *   - 'block' : drift > 1h OU impossível medir online — bloqueia novos registros
 *               pra garantir que ninguém registre uma "data inventada".
 */
export type ClockSeverity = 'ok' | 'warn' | 'block';

export function classifyClock(state: ClockState | null): ClockSeverity {
  // Se nunca conseguimos medir online, deixa passar (provavelmente usuário em
  // campo sem rede) — a blind layer é o trigger do banco.
  if (!state || !state.online) return 'ok';
  if (state.absDriftMs > 60 * 60 * 1000) return 'block'; // > 1 hora
  if (state.absDriftMs > CLOCK_SKEW_TOLERANCE_MS) return 'warn';
  return 'ok';
}
