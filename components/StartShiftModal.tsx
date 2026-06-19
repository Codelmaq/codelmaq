"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Gauge, Truck, X, AlertTriangle, ArrowRight, History, Clock } from 'lucide-react';

export interface StartShiftPayload {
  machineId: string;
  machineName?: string;
  horimetroInicial: number;
  horaInicio: string;       // ISO timestamp from device clock
  previousHorimetro?: number;
}

interface StartShiftModalProps {
  open: boolean;
  scannedCode: string | null;       // raw QR code string (e.g. "CODELMAQ-EQ-CB-01")
  machineLookup: (id: string) => { id: string; name?: string; type?: string; plate?: string } | undefined;
  previousHorimetro?: number | null;  // pre-fill from last shift's horimetroFinal
  previousEndDate?: string | null;     // date string of the previous shift
  onClose: () => void;
  onConfirm: (data: StartShiftPayload) => Promise<void> | void;
}

export function StartShiftModal({ open, scannedCode, machineLookup, previousHorimetro, previousEndDate, onClose, onConfirm }: StartShiftModalProps) {
  const [horimetroInicial, setHorimetroInicial] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const machineId = scannedCode ? scannedCode.replace(/^CODELMAQ-EQ-/, '') : '';
  const machine = machineId ? machineLookup(machineId) : undefined;

  useEffect(() => {
    if (open) {
      // Pre-fill from last shift's final horimetro
      if (typeof previousHorimetro === 'number' && !isNaN(previousHorimetro)) {
        setHorimetroInicial(String(previousHorimetro));
        setAutoFilled(true);
      } else {
        setHorimetroInicial('');
        setAutoFilled(false);
      }
      setSubmitting(false);
    }
  }, [open, previousHorimetro]);

  if (!open || !scannedCode) return null;

  const num = parseFloat(horimetroInicial || '0');
  const isValid = !isNaN(num) && num >= 0;
  const horaInicio = new Date().toISOString();

  const handleSubmit = async () => {
    if (!isValid || !machineId) return;
    setSubmitting(true);
    try {
      await onConfirm({
        machineId,
        machineName: machine?.name,
        horimetroInicial: num,
        horaInicio,
        previousHorimetro: typeof previousHorimetro === 'number' ? previousHorimetro : undefined,
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
          <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-white/5">
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 font-heading uppercase flex items-center gap-2">
                <Play className="text-emerald-600" size={16} />
                Iniciar Turno
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                QR escaneado: <code className="font-mono text-[10px]">{scannedCode}</code>
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
            {machine ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <Truck size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">Ativo identificado</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                    {machine.id} {machine.name ? `— ${machine.name}` : ''}
                  </p>
                  {machine.type && <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{machine.type}</p>}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-amber-700 dark:text-amber-400 text-xs">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                  Máquina <strong>{machineId}</strong> não está cadastrada no fleet. O turno será criado mesmo assim — você pode corrigir o cadastro depois na Frota.
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-300 uppercase font-bold tracking-wider flex items-center gap-1">
                <Clock size={11} /> Horário de Entrada (automático)
              </label>
              <div className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-2.5 text-sm text-gray-700 dark:text-gray-200 font-mono">
                {new Date().toLocaleString('pt-BR')}
              </div>
            </div>

            {typeof previousHorimetro === 'number' && !isNaN(previousHorimetro) && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs">
                <History size={13} className="flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Pré-preenchido</strong> com o horímetro final do turno anterior
                  {previousEndDate ? ` (${previousEndDate})` : ''}: <span className="font-mono font-bold">{previousHorimetro}</span>. Confira no painel da máquina e ajuste se necessário.
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-300 uppercase font-bold tracking-wider flex items-center gap-1">
                <Gauge size={11} /> Horímetro / KM Inicial <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                autoFocus
                value={horimetroInicial}
                onChange={(e) => {
                  setHorimetroInicial(e.target.value);
                  setAutoFilled(false);
                }}
                placeholder="Ex: 1450"
                className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono"
              />
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {autoFilled
                  ? 'Campo preenchido automaticamente. Confirme o valor no painel da máquina.'
                  : 'Anote o horímetro que está marcando agora no painel da máquina.'}
              </p>
            </div>

            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              O turno ficará aberto até você tocar em <strong>Encerrar Turno</strong> manualmente. Tudo offline.
            </p>
          </div>

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
              <ArrowRight size={12} />
              {submitting ? 'Iniciando...' : 'Iniciar Turno'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
