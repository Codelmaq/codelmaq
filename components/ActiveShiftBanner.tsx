"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Square, Truck, Activity, Minimize2, Maximize2 } from 'lucide-react';
import { useShiftStore } from '@/store/shiftStore';
import { localDb } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';
import { EndShiftModal } from './EndShiftModal';
import { useShiftFeedback } from './ShiftFeedbackProvider';
import { playError } from '@/lib/audioFeedback';

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function ActiveShiftBanner() {
  const activeShift = useShiftStore((s) => s.activeShift);
  const endShift = useShiftStore((s) => s.endShift);
  const feedback = useShiftFeedback();
  const [elapsed, setElapsed] = useState('00:00:00');
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!activeShift) {
      setElapsed('00:00:00');
      setDismissed(false);
      setMinimized(false);
      return;
    }
    const tick = () => {
      const startedAt = new Date(activeShift.startedAt).getTime();
      setElapsed(formatElapsed(Date.now() - startedAt));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  if (!activeShift || dismissed) return null;

  const horaInicioBR = new Date(activeShift.startedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <AnimatePresence>
        {!minimized && (
          <motion.div
            key="banner-full"
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            data-testid="active-shift-banner"
            className="sticky top-0 z-30 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white shadow-2xl shadow-emerald-500/40 ring-4 ring-yellow-300/40 relative overflow-hidden"
          >
            {/* Animated pulse border */}
            <motion.div
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="absolute inset-0 pointer-events-none ring-4 ring-yellow-300/40 rounded-none"
            />

            {/* Big banner content */}
            <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex items-center justify-between gap-3 flex-wrap relative">
              <div className="flex items-center gap-3 md:gap-5 min-w-0 flex-1">
                {/* Pulse icon */}
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="relative flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-full bg-white/25 ring-4 ring-white/40 flex-shrink-0"
                >
                  <Activity className="w-7 h-7 md:w-10 md:h-10" />
                  <motion.span
                    animate={{ scale: [1, 1.7, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-white/30"
                  />
                </motion.div>

                {/* Text block */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] md:text-sm uppercase tracking-widest font-black opacity-95">
                    <motion.span
                      animate={{ opacity: [1, 0.35, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2.5 h-2.5 rounded-full bg-yellow-300 shadow-lg shadow-yellow-300/50"
                    />
                    TURNO EM ANDAMENTO
                  </div>
                  <div className="flex items-baseline gap-2 md:gap-4 mt-1 flex-wrap">
                    <span className="text-3xl md:text-5xl font-black font-mono tabular-nums tracking-wider drop-shadow-lg">
                      {elapsed}
                    </span>
                    <span className="hidden sm:inline text-base opacity-70">•</span>
                    <span className="text-base md:text-2xl font-bold flex items-center gap-1.5 truncate">
                      <Truck size={18} className="md:size-6 flex-shrink-0" />
                      <span className="truncate">{activeShift.machineId}</span>
                    </span>
                    {activeShift.machineName && (
                      <span className="hidden md:inline text-base opacity-90 truncate">
                        — {activeShift.machineName}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center gap-2 mt-1 text-[11px] md:text-sm opacity-90 flex-wrap">
                    <Clock size={12} />
                    <span>
                      Entrada: <span className="font-mono font-black">{horaInicioBR}</span>
                    </span>
                    <span>•</span>
                    <span>
                      Horímetro inicial:{' '}
                      <span className="font-mono font-black">{activeShift.horimetroInicial}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEndModalOpen(true)}
                  className="px-4 py-3 md:px-6 md:py-3.5 bg-white hover:bg-white/95 active:scale-95 text-emerald-700 font-black rounded-xl text-sm md:text-base uppercase tracking-wider flex items-center gap-2 transition-all shadow-xl cursor-pointer"
                >
                  <Square size={14} fill="currentColor" />
                  Encerrar Turno
                </button>
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  className="p-2.5 md:p-3 hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
                  aria-label="Minimizar banner"
                  title="Minimizar (não encerra o turno)"
                >
                  <Minimize2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized pill — always visible while shift is active */}
      {minimized && (
        <motion.button
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          type="button"
          onClick={() => setMinimized(false)}
          className="fixed top-3 right-3 z-30 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer ring-2 ring-yellow-300/60"
          title="Reabrir banner do turno"
        >
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-yellow-300"
          />
          <span className="font-mono">{elapsed}</span>
          <Square size={11} fill="currentColor" />
          <span className="hidden sm:inline truncate max-w-[120px]">{activeShift.machineId}</span>
          <Maximize2 size={11} />
        </motion.button>
      )}

      <EndShiftModal
        open={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        onConfirm={async (data) => {
          const horaInicioMs = new Date(activeShift.startedAt).getTime();
          try {
            // Validation — fail loudly if horimetro final is invalid.
            if (!Number.isFinite(data.horimetroFinal) || data.horimetroFinal < activeShift.horimetroInicial) {
              playError();
              feedback.showWithSound({
                kind: 'error',
                title: 'Horímetro final inválido',
                subtitle: `O valor precisa ser maior ou igual a ${activeShift.horimetroInicial}.`,
                errorMessage: `Valor recebido: ${data.horimetroFinal}. Verifique o painel da máquina e tente de novo.`,
              });
              return;
            }

            // Persist the closed registro_diario in IndexedDB.
            const horaFim = new Date().toISOString();
            const duracaoHoras = (Date.now() - horaInicioMs) / 3_600_000;

            await localDb.registrosDiarios.update(activeShift.id, {
              horimetroFinal: data.horimetroFinal,
              fuelAdded: data.fuelAdded,
              observations: data.observations || '',
              status: 'fechado',
              horaFim: horaFim,
              fechadoEm: horaFim,
              synced: 0,
            });

            await syncEngine.countPendingRecords();
            await syncEngine.runSync();

            // Big visual + audio confirmation of the close.
            const delta = Number((data.horimetroFinal - activeShift.horimetroInicial).toFixed(1));
            const duracaoFmt = `${Math.floor(duracaoHoras)}h ${Math.round((duracaoHoras % 1) * 60)}min`;

            feedback.showWithSound({
              kind: 'close',
              title: 'Turno Fechado!',
              subtitle: 'Registro salvo no aparelho e sincronizado.',
              details: [
                { label: 'Máquina', value: activeShift.machineId },
                {
                  label: 'Horímetro',
                  value: `${activeShift.horimetroInicial} → ${data.horimetroFinal}`,
                  emphasis: 'highlight',
                },
                { label: 'Trabalhadas', value: `${delta}h • ${duracaoFmt}` },
                ...(data.fuelAdded > 0
                  ? [{ label: 'Combustível', value: `${data.fuelAdded} L` }]
                  : []),
              ],
            });
          } catch (e: any) {
            console.error('Erro ao encerrar turno:', e);
            playError();
            feedback.showWithSound({
              kind: 'error',
              title: 'Erro ao encerrar turno',
              subtitle: 'O registro não foi salvo.',
              errorMessage: e?.message || String(e),
            });
          } finally {
            endShift();
            setEndModalOpen(false);
          }
        }}
      />
    </>
  );
}

export default ActiveShiftBanner;