"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertOctagon, X, User, Camera, Save, Trash2, ImageIcon, AlertTriangle } from 'lucide-react';
import { INFRACTIONS, Infraction } from '@/lib/infractions';
import { compressImage } from '@/lib/imageCompression';
import { genId } from '@/lib/utils';
import { localDb, LocalPenalty } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';

interface PenaltyModalProps {
  open: boolean;
  onClose: () => void;
  employees: Array<{ id: string; nome: string; role: string }>;
  currentUserProfile: { id: string; nome: string; role: string; email: string };
  defaultOperatorId?: string;
  onApplied?: (penalty: LocalPenalty) => void;
}

export function PenaltyModal({
  open,
  onClose,
  employees,
  currentUserProfile,
  defaultOperatorId,
  onApplied,
}: PenaltyModalProps) {
  const [operatorId, setOperatorId] = useState(defaultOperatorId || '');
  const [infractionCode, setInfractionCode] = useState('DAILY_CHECK');
  const [customLabel, setCustomLabel] = useState('');
  const [pointsStr, setPointsStr] = useState('-50');
  const [photo, setPhoto] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const infraction: Infraction | undefined = INFRACTIONS.find((i) => i.code === infractionCode);

  React.useEffect(() => {
    if (open) {
      setOperatorId(defaultOperatorId || '');
      setInfractionCode('DAILY_CHECK');
      setCustomLabel('');
      setPointsStr('-50');
      setPhoto(null);
      setObservacoes('');
      setError(null);
      setSubmitting(false);
    }
  }, [open, defaultOperatorId]);

  React.useEffect(() => {
    const inf = INFRACTIONS.find((i) => i.code === infractionCode);
    if (inf) {
      setPointsStr(String(inf.points));
    }
  }, [infractionCode]);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await compressImage(file, 800, 800, 0.6);
      setPhoto(dataUri);
    } catch (err) {
      console.error('Falha ao comprimir foto da penalidade:', err);
      setError('Não foi possível processar a foto. Tente outra.');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!operatorId) {
      setError('Selecione o operador.');
      return;
    }
    if (!infraction) {
      setError('Selecione uma infração.');
      return;
    }
    if (infraction.code !== 'CUSTOM' && !customLabel && false) {
      // (customLabel is optional for predefined infractions)
    }
    const points = parseFloat(pointsStr);
    if (isNaN(points) || points > 0) {
      setError('A pontuação da penalidade deve ser zero ou negativa.');
      return;
    }
    if (!photo) {
      setError('Anexe uma foto como evidência da infração.');
      return;
    }
    const op = employees.find((e) => e.id === operatorId);
    if (!op) {
      setError('Operador não encontrado.');
      return;
    }
    setSubmitting(true);
    try {
      const penalty: LocalPenalty = {
        id: genId(),
        operatorId: op.id,
        operatorName: op.nome,
        infractionCode: infraction.code,
        infractionLabel: infraction.code === 'CUSTOM' ? (customLabel.trim() || 'Outra infração') : infraction.label,
        points,
        photoEvidencia: photo,
        observacoes: observacoes.trim() || undefined,
        aplicadoPor: currentUserProfile.id,
        aplicadoPorNome: currentUserProfile.nome,
        dataEvento: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        synced: 0,
      };
      await localDb.penalties.add(penalty);
      await syncEngine.countPendingRecords();
      onApplied?.(penalty);
      onClose();
    } catch (e) {
      console.error('Erro ao registrar penalidade:', e);
      setError('Erro ao salvar penalidade.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

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
          className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-white/10">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-heading uppercase flex items-center gap-2">
                <AlertOctagon className="text-red-600" size={18} />
                Aplicar Penalidade
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
                Programa de Excelência — débito de pontos do operador.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs text-gray-800 dark:text-gray-200 uppercase font-bold tracking-wider flex items-center gap-1">
                <User size={11} /> Operador
              </label>
              <select
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-medium"
              >
                <option value="">Selecione o operador...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} ({e.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs text-gray-800 dark:text-gray-200 uppercase font-bold tracking-wider">
                Infração Cometida
              </label>
              <select
                value={infractionCode}
                onChange={(e) => setInfractionCode(e.target.value)}
                className="bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-medium"
              >
                {INFRACTIONS.map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.label} ({i.points} pts)
                  </option>
                ))}
              </select>
              {infraction && (
                <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                  {infraction.description}
                </p>
              )}
            </div>

            {infraction?.code === 'CUSTOM' && (
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs text-gray-800 dark:text-gray-200 uppercase font-bold tracking-wider">
                  Descrição da Infração
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Ex: Atraso de 40 minutos no turno"
                  className="bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
                />
              </div>
            )}

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs text-gray-800 dark:text-gray-200 uppercase font-bold tracking-wider">
                Pontos a Debitar (negativo)
              </label>
              <input
                type="number"
                step="1"
                value={pointsStr}
                onChange={(e) => setPointsStr(e.target.value)}
                placeholder="-50"
                className="bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono font-bold"
              />
              <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                Use 0 para advertência verbal sem débito.
              </p>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs text-gray-800 dark:text-gray-200 uppercase font-bold tracking-wider flex items-center gap-1">
                <Camera size={11} /> Foto de Evidência (somente admin)
              </label>
              {photo ? (
                <div className="relative w-full h-44 rounded-xl overflow-hidden border-2 border-gray-300 dark:border-white/10 group">
                  <img src={photo} alt="evidência" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle size={9} />
                    Confidencial
                  </span>
                </div>
              ) : (
                <label className="w-full h-32 border-2 border-dashed border-gray-400 dark:border-white/20 rounded-xl flex flex-col items-center justify-center cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <Camera size={28} className="mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">Anexar Foto</span>
                  <span className="text-[10px] mt-1 opacity-70">JPG/PNG, redimensionada automaticamente</span>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>
              )}
              {photo && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="text-xs text-[#eab308] hover:text-[#ca8a04] font-bold flex items-center gap-1"
                >
                  <ImageIcon size={12} /> Trocar foto
                </button>
              )}
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs text-gray-800 dark:text-gray-200 uppercase font-bold tracking-wider">
                Observações (opcional)
              </label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Contexto adicional sobre a infração..."
                className="bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white focus:border-[#eab308] outline-none resize-none"
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                O operador <strong>verá a infração e os pontos debitados</strong>, mas
                <strong> não terá acesso à foto</strong> (somente a gestão).
              </span>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-white/5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-red-500/20"
            >
              <Save size={12} />
              {submitting ? 'Aplicando...' : 'Aplicar Penalidade'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PenaltyModal;
