'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  Square,
  Info,
  Volume2,
  VolumeX,
} from 'lucide-react';

export type ShiftFeedbackKind = 'open' | 'close' | 'success' | 'error' | 'info';

export interface ShiftFeedbackDetail {
  label: string;
  value: string;
  /** Optional tone: highlight value with stronger color */
  emphasis?: 'normal' | 'highlight';
}

export interface ShiftFeedbackData {
  kind: ShiftFeedbackKind;
  title: string;
  subtitle?: string;
  details?: ShiftFeedbackDetail[];
  errorMessage?: string;
  /** When undefined, defaults depend on kind. Errors don't auto-close. */
  autoCloseMs?: number;
}

interface ShiftFeedbackProps {
  feedback: ShiftFeedbackData | null;
  onDismiss: () => void;
}

interface KindConfig {
  bg: string;
  ring: string;
  icon: React.ReactNode;
  iconBg: string;
  text: string;
  defaultAutoCloseMs: number | null;
  /** Whether the dismissal sound should be a single click. */
  quietDismiss: boolean;
}

const KIND_CONFIG: Record<ShiftFeedbackKind, KindConfig> = {
  open: {
    bg: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700',
    ring: 'ring-emerald-300/60',
    icon: <Play size={56} fill="currentColor" />,
    iconBg: 'bg-white/20',
    text: 'text-white',
    defaultAutoCloseMs: 3800,
    quietDismiss: true,
  },
  close: {
    bg: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800',
    ring: 'ring-blue-300/60',
    icon: <Square size={52} fill="currentColor" />,
    iconBg: 'bg-white/20',
    text: 'text-white',
    defaultAutoCloseMs: 4200,
    quietDismiss: true,
  },
  success: {
    bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    ring: 'ring-emerald-300/60',
    icon: <CheckCircle2 size={56} />,
    iconBg: 'bg-white/20',
    text: 'text-white',
    defaultAutoCloseMs: 3200,
    quietDismiss: true,
  },
  error: {
    bg: 'bg-gradient-to-br from-red-500 via-red-600 to-red-800',
    ring: 'ring-red-300/60',
    icon: <AlertTriangle size={56} />,
    iconBg: 'bg-white/20',
    text: 'text-white',
    defaultAutoCloseMs: null, // errors stay until manually dismissed
    quietDismiss: false,
  },
  info: {
    bg: 'bg-gradient-to-br from-slate-600 to-slate-800',
    ring: 'ring-slate-300/60',
    icon: <Info size={52} />,
    iconBg: 'bg-white/20',
    text: 'text-white',
    defaultAutoCloseMs: 3000,
    quietDismiss: true,
  },
};

export function ShiftFeedback({ feedback, onDismiss }: ShiftFeedbackProps) {
  // Auto-close timer (errors never auto-close).
  useEffect(() => {
    if (!feedback) return;
    const configured = feedback.autoCloseMs ?? KIND_CONFIG[feedback.kind].defaultAutoCloseMs;
    if (configured == null) return;
    const timer = setTimeout(onDismiss, configured);
    return () => clearTimeout(timer);
  }, [feedback, onDismiss]);

  // Esc to dismiss errors.
  useEffect(() => {
    if (!feedback) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [feedback, onDismiss]);

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          key="shift-feedback-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onDismiss}
          role="alertdialog"
          aria-live="assertive"
          aria-atomic="true"
          aria-labelledby="shift-feedback-title"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className={`${KIND_CONFIG[feedback.kind].bg} ${KIND_CONFIG[feedback.kind].text} rounded-3xl max-w-lg w-full shadow-2xl ring-8 ${KIND_CONFIG[feedback.kind].ring} overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Fechar"
                className="p-2 hover:bg-white/15 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-7 md:p-10 text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 16, delay: 0.05 }}
                className={`mx-auto w-28 h-28 rounded-full ${KIND_CONFIG[feedback.kind].iconBg} flex items-center justify-center mb-6 ring-8 ring-white/25 shadow-inner`}
              >
                {KIND_CONFIG[feedback.kind].icon}
              </motion.div>

              {/* Title */}
              <motion.h2
                id="shift-feedback-title"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl md:text-5xl font-black uppercase tracking-wider mb-3 leading-tight"
              >
                {feedback.title}
              </motion.h2>

              {/* Subtitle */}
              {feedback.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-base md:text-xl font-medium opacity-95"
                >
                  {feedback.subtitle}
                </motion.p>
              )}

              {/* Details grid */}
              {feedback.details && feedback.details.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-6 grid grid-cols-1 gap-2 text-left"
                >
                  {feedback.details.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 bg-white/15 rounded-xl px-4 py-3 backdrop-blur-sm"
                    >
                      <span className="text-xs md:text-sm uppercase tracking-wider font-black opacity-85">
                        {d.label}
                      </span>
                      <span
                        className={`text-base md:text-xl font-mono font-black ${
                          d.emphasis === 'highlight' ? 'text-yellow-200' : ''
                        }`}
                      >
                        {d.value}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Error detail block */}
              {feedback.kind === 'error' && feedback.errorMessage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 p-4 bg-black/35 rounded-xl text-left"
                >
                  <p className="text-[10px] md:text-xs uppercase tracking-widest font-black opacity-70 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle size={12} />
                    Detalhes do erro
                  </p>
                  <p className="text-sm md:text-base font-mono break-words whitespace-pre-wrap">
                    {feedback.errorMessage}
                  </p>
                </motion.div>
              )}

              {/* Confirm button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                type="button"
                onClick={onDismiss}
                className="mt-7 px-8 py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-xl text-sm md:text-base font-black uppercase tracking-widest transition-colors shadow-lg"
                autoFocus
              >
                {feedback.kind === 'error' ? 'Entendi' : 'OK'}
              </motion.button>

              {/* Audio indicator (just visual confirmation that a sound was played) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.5 }}
                className="mt-4 flex items-center justify-center gap-1.5 text-[10px] md:text-xs opacity-70"
              >
                {feedback.kind === 'error' ? (
                  <>
                    <Volume2 size={12} />
                    <span className="uppercase tracking-widest">Sinal sonoro de alerta emitido</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={12} />
                    <span className="uppercase tracking-widest">Sinal sonoro emitido</span>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ShiftFeedback;