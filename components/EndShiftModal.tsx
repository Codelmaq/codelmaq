"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Square, Gauge, Fuel, FileText, X, AlertTriangle } from 'lucide-react';
import { useShiftStore } from '@/store/shiftStore';
import { localDb } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';
import { genId } from '@/lib/utils';

interface EndShiftModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { horimetroFinal: number; fuelAdded: number; observations: string }) => Promise<void> | void;
}

export function EndShiftModal({ open, onClose, onConfirm }: EndShiftModalProps) {
  const activeShift = useShiftStore((s) => s.activeShift);
  const [horimetroFinal, setHorimetroFinal] = useState('');
  const [fuelAdded, setFuelAdded] = useState('0');
  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setHorimetroFinal('');
      setFuelAdded('0');
      setObservations('');
      setSubmitting(false);
    }
  }, [open]);

  if (!open || !activeShift) return null;

  const initial = activeShift.horimetroInicial;
  const finalNum = parseFloat(horimetroFinal || '0');
  const isValid = !isNaN(finalNum) && finalNum >= initial;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onConfirm({
        horimetroFinal: finalNum,
        fuelAdded: parseFloat(fuelAdded || '0'),
        observations: observations.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-white/5">
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 font-heading uppercase flex items-center gap-2">
                <Square className="text-emerald-600" size={16} />
                Encerrar Turno
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {activeShift.machineId}
                {activeShift.machineName ? ` — ${activeShift.machineName}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Reminder of initial horimeter */}
            <div className="p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Gauge size={12} />
                Horímetro inicial registrado
              </span>
              <span className="font-mono font-bold text-gray-800 dark:text-gray-100">{initial}</span>
            </div>

            {/* Horimetro final (required) */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-300 uppercase font-bold tracking-wider flex items-center gap-1">
                <Gauge size={11} /> Horímetro / KM Final <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                required
                autoFocus
                value={horimetroFinal}
                onChange={(e) => setHorimetroFinal(e.target.value)}
                placeholder={`Maior ou igual a ${initial}`}
                className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono"
              />
              {horimetroFinal && !isValid && (
                <span className="text-[10px] text-red-500 flex items-center gap-1">
                  <AlertTriangle size={10} />
                  Deve ser ≥ {initial}
                </span>
              )}
            </div>

            {/* Combustivel (optional) */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-300 uppercase font-bold tracking-wider flex items-center gap-1">
                <Fuel size={11} /> Combustível Abastecido (L)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fuelAdded}
                onChange={(e) => setFuelAdded(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono"
              />
            </div>

            {/* Observacoes (optional) */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-300 uppercase font-bold tracking-wider flex items-center gap-1">
                <FileText size={11} /> Observações
              </label>
              <textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ocorrências, quebras, chuvas, manutenção extra..."
                className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-[#eab308] outline-none resize-none"
              />
            </div>

            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              O registro será salvo no aparelho e sincronizado com o servidor assim que a internet voltar.
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Square size={12} />
              {submitting ? 'Salvando...' : 'Encerrar e Salvar'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
