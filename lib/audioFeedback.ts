// Audio feedback for shift open/close/success/error.
// Uses the Web Audio API to synthesize tones at runtime — no asset files required.
//
// Notes:
//   * Browsers gate AudioContext behind a user gesture. We lazy-init on the first
//     call AND call `ctx.resume()` defensively in case it was suspended.
//   * On SSR / environments without window we no-op.
//   * `gain` envelope avoids audible clicks at the start/end of each oscillator.

type OscType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface ToneSpec {
  freq: number;
  duration: number; // seconds
  type?: OscType;
  volume?: number;  // peak gain (0..1)
  attack?: number;  // seconds
  release?: number; // seconds
}

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  // Initialize lazily on first use.
  if (!audioCtx) {
    try {
      const Ctor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    } catch (e) {
      console.warn('[audioFeedback] AudioContext unavailable:', e);
      return null;
    }
  }
  // From here on, audioCtx is non-null. The local copy keeps TS happy even
  // though TS can't statically prove the closure invariant.
  const ctx = audioCtx as AudioContext;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/** Call once after a user interaction to satisfy autoplay policies. */
export function unlockAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  // Re-assign to local so TS narrows the type correctly.
  const c: AudioContext = ctx;
  if (c.state === 'suspended') {
    c.resume().catch(() => {});
  }
  audioUnlocked = true;
}

function playTones(tones: ToneSpec[]) {
  const ctx = getCtx();
  if (!ctx) return;
  // Trigger unlock on first call.
  if (!audioUnlocked) {
    unlockAudio();
  }

  let t = ctx.currentTime + 0.02;
  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = tone.type || 'sine';
    osc.frequency.setValueAtTime(tone.freq, t);

    const peak = Math.min(Math.max(tone.volume ?? 0.25, 0), 0.5);
    const attack = tone.attack ?? 0.01;
    const release = tone.release ?? Math.min(0.05, tone.duration / 2);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.setValueAtTime(peak, t + Math.max(attack, tone.duration - release));
    gain.gain.linearRampToValueAtTime(0, t + tone.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + tone.duration + 0.05);

    t += tone.duration;
  }
}

/**
 * Three ascending notes (C5 -> E5 -> G5) — major arpeggio for "TURNO ABERTO".
 * Bright, easy to recognise as positive.
 */
export function playShiftOpened() {
  playTones([
    { freq: 523.25, duration: 0.13, type: 'sine', volume: 0.28 },
    { freq: 659.25, duration: 0.13, type: 'sine', volume: 0.28 },
    { freq: 783.99, duration: 0.26, type: 'sine', volume: 0.30 },
  ]);
}

/**
 * Two descending notes (G5 -> C5) — "TURNO FECHADO".
 * Calm, conclusive tone.
 */
export function playShiftClosed() {
  playTones([
    { freq: 783.99, duration: 0.14, type: 'sine', volume: 0.28 },
    { freq: 523.25, duration: 0.28, type: 'sine', volume: 0.30 },
  ]);
}

/**
 * Two-tone chime (C5 -> E5) — generic success.
 */
export function playSuccess() {
  playTones([
    { freq: 523.25, duration: 0.12, type: 'sine', volume: 0.25 },
    { freq: 659.25, duration: 0.18, type: 'sine', volume: 0.27 },
  ]);
}

/**
 * Descending square-wave buzz (A4 -> A3) — explicit error.
 * Harsher timbre so the operator can tell it apart from a success chime
 * even with headphones or in a noisy cab.
 */
export function playError() {
  playTones([
    { freq: 440, duration: 0.18, type: 'square', volume: 0.22 },
    { freq: 220, duration: 0.28, type: 'square', volume: 0.24 },
  ]);
}

/** Single short tick — used for taps/confirmations. */
export function playClick() {
  playTones([
    { freq: 880, duration: 0.06, type: 'sine', volume: 0.16, attack: 0.005, release: 0.04 },
  ]);
}

/**
 * Plays a sound based on the feedback kind. The mapping is the single source
 * of truth — components import this rather than calling the specific tone
 * functions directly so we can tweak the sounds centrally.
 */
export type AudioKind = 'open' | 'close' | 'success' | 'error' | 'click';

export function playForKind(kind: AudioKind) {
  switch (kind) {
    case 'open':
      playShiftOpened();
      break;
    case 'close':
      playShiftClosed();
      break;
    case 'success':
      playSuccess();
      break;
    case 'error':
      playError();
      break;
    case 'click':
      playClick();
      break;
  }
}