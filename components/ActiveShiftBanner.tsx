"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Square, Truck, Activity, X } from 'lucide-react';
import { useShiftStore } from '@/store/shiftStore';
import { localDb } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';
import { EndShiftModal } from './EndShiftModal';

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
  const [elapsed, setElapsed] = useState('00:00:00');
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!activeShift) {
      setElapsed('00:00:00');
      setDismissed(false);
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

  return (
    <>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="sticky top-0 z-30 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 text-white px-3 py-2 shadow-lg shadow-emerald-500/20"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black opacity-90">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Turno em andamento
              </div>
              <div className="flex items-center gap-2 md:gap-3 mt-0.5">
                <span className="text-sm md:text-base font-black font-mono tabular-nums tracking-wider">
                  {elapsed}
                </span>
                <span className="hidden sm:inline opacity-70">•</span>
                <span className="text-xs md:text-sm font-bold flex items-center gap-1 truncate">
                  <Truck size={12} />
                  {activeShift.machineId}
                </span>
                {activeShift.machineName && (
                  <span className="hidden md:inline text-xs opacity-80 truncate">— {activeShift.machineName}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-1 text-[10px] bg-white/15 px-2 py-1 rounded-md backdrop-blur-sm">
              <Clock size={10} />
              Entrada: {new Date(activeShift.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              onClick={() => setEndModalOpen(true)}
              className="px-3 py-1.5 bg-white hover:bg-white/90 text-emerald-700 font-black rounded-lg text-xs uppercase tracking-wider flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
            >
              <Square size={11} />
              Encerrar Turno
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
              aria-label="Minimizar banner"
              title="Minimizar (não encerra o turno)"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      <EndShiftModal
        open={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        onConfirm={async (data) => {
          try {
            // Persist the closed registro_diario in IndexedDB so it gets synced later.
            const horaFim = new Date().toISOString();
            await localDb.registrosDiarios.update(activeShift.id, {
              horimetroFinal: data.horimetroFinal,
              fuelAdded: data.fuelAdded,
              observations: data.observations || '',
              status: 'fechado',
              horaFim: horaFim,
              fechadoEm: horaFim,
              synced: 0,
            });
            // Recalculate pending count + try a sync attempt right now.
            await syncEngine.countPendingRecords();
            await syncEngine.runSync();
          } catch (e) {
            console.error('Erro ao encerrar turno:', e);
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
