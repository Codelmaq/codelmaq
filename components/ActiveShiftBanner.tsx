"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Square, Truck, Minimize2, Maximize2 } from 'lucide-react';
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
  const turno = useShiftStore((s) => s.turno);
  const activeShift = useShiftStore((s) => s.activeShift);
  const endTurno = useShiftStore((s) => s.endTurno);
  const feedback = useShiftFeedback();
  const [elapsed, setElapsed] = useState('00:00:00');
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!turno) {
      setElapsed('00:00:00');
      setDismissed(false);
      setMinimized(false);
      return;
    }
    const tick = () => {
      const startedAt = new Date(turno.startedAt).getTime();
      setElapsed(formatElapsed(Date.now() - startedAt));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [turno]);

  if (!turno || dismissed) return null;

  const horaInicioBR = new Date(turno.startedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dataInicioBR = new Date(turno.startedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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
            className="sticky top-0 z-30 bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 ring-2 ring-yellow-300/30 -mx-4 md:-mx-8"
          >
            <div className="max-w-4xl mx-auto px-3 py-1.5 md:px-4 md:py-2 flex flex-col gap-1.5 md:gap-2">
              {/* Status + timer + machine + meta — linha superior */}
              <div className="flex items-center gap-2 min-w-0">
                <motion.span
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-yellow-300 shadow-lg shadow-yellow-300/50 flex-shrink-0"
                />
                <span className="text-[10px] uppercase tracking-widest font-black whitespace-nowrap">
                  Turno em aberto
                </span>
                <span className="text-xs opacity-70">•</span>
                <span className="text-sm md:text-lg font-black font-mono tabular-nums tracking-wider">
                  {elapsed}
                </span>
                <span className="text-xs opacity-70">•</span>
                <span className="text-xs md:text-sm font-bold flex items-center gap-1 min-w-0">
                  <Truck size={13} className="md:size-3.5 flex-shrink-0" />
                  <span className="truncate">{activeShift?.machineId || '— nenhuma máquina ativa —'}</span>
                </span>
                <span className="hidden lg:inline-flex items-center gap-2 text-[11px] opacity-80 whitespace-nowrap">
                  <span>• Abr. {dataInicioBR} às {horaInicioBR}</span>
                  {activeShift && (
                    <span>• Hor. ini. {activeShift.horimetroInicial}</span>
                  )}
                </span>
              </div>

              {/* Actions — linha inferior */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (activeShift) {
                      setEndModalOpen(true);
                    } else {
                      endTurno();
                    }
                  }}
                  className="flex-1 md:flex-none justify-center px-3 py-1.5 md:px-4 md:py-2 bg-white hover:bg-white/95 active:scale-95 text-red-700 font-black rounded-lg text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow cursor-pointer"
                >
                  <Square size={12} fill="currentColor" />
                  Encerrar Turno
                </button>
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                  aria-label="Minimizar banner"
                  title="Minimizar (não encerra o turno)"
                >
                  <Minimize2 size={15} />
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
          className="fixed top-3 right-3 z-30 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer ring-2 ring-yellow-300/60"
          title="Reabrir banner do turno"
        >
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-yellow-300"
          />
          <span className="font-mono">{elapsed}</span>
          <Square size={11} fill="currentColor" />
          <span className="hidden sm:inline truncate max-w-[120px]">{activeShift?.machineId || ''}</span>
          <Maximize2 size={11} />
        </motion.button>
      )}

      <EndShiftModal
        open={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        onConfirm={async (data) => {
          if (!activeShift) return;
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
            endTurno();
            setEndModalOpen(false);
          }
        }}
      />
    </>
  );
}

export default ActiveShiftBanner;