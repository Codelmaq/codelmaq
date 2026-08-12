"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, ImagePlus, AlertTriangle, RefreshCw, Check, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

interface PhotoCaptureModalProps {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

/**
 * Fullscreen camera capture modal. Opens the device's rear camera via
 * getUserMedia, lets the operator frame the horimeter / machine panel and
 * snap the photo. Falls back to the file picker if the camera is unavailable.
 * Returns a compressed JPEG data URI through onCapture.
 */
export function PhotoCaptureModal({ open, title = 'Registrar Foto', description, onClose, onCapture }: PhotoCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Stop camera whenever the modal closes (including unmount).
  useEffect(() => {
    if (!open) stopCamera();
    return () => stopCamera();
  }, [open, stopCamera]);

  useEffect(() => {
    if (!open) return;
    setCaptured(null);
    setCameraError(null);
    setBusy(false);

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Câmera não suportada neste navegador. Use "Escolher da galeria".');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);
      } catch (err: any) {
        console.warn('[PhotoCapture] camera unavailable:', err?.name || err);
        setCameraError(
          'Não foi possível acessar a câmera (permissão negada ou indisponível). ' +
          'Toque em "Escolher da galeria" para anexar a foto.'
        );
      }
    };
    start();
  }, [open]);

  const snap = () => {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = canvasRef.current!;
    canvas.width = Math.min(w, 1920);
    canvas.height = Math.round((canvas.width * h) / w);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL('image/jpeg', 0.92));
  };

  const confirm = async () => {
    if (!captured) return;
    setBusy(true);
    try {
      const compressed = await compressImage(captured, 1280, 1280, 0.7);
      onCapture(compressed);
      onClose();
    } catch (e) {
      console.error('[PhotoCapture] compression failed:', e);
      onCapture(captured);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressImage(file, 1280, 1280, 0.7);
      onCapture(compressed);
      onClose();
    } catch (err) {
      console.error('[PhotoCapture] gallery read failed:', err);
      setCameraError('Não foi possível ler a imagem selecionada. Tente outra.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-3"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-[#151515] border border-white/10 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-white font-heading uppercase flex items-center gap-2">
                  <Camera className="text-[#eab308]" size={18} />
                  {title}
                </h3>
                {description && <p className="text-xs text-[#9ca3af] mt-1">{description}</p>}
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Fechar câmera"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Captured photo confirmation */}
              {captured ? (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={captured}
                    alt="Foto capturada"
                    className="w-full rounded-xl border border-white/10 object-contain bg-black"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCaptured(null)}
                      disabled={busy}
                      className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={13} />
                      Tirar de Novo
                    </button>
                    <button
                      type="button"
                      onClick={confirm}
                      disabled={busy}
                      className="flex-1 py-2.5 bg-[#eab308] hover:bg-[#ca8a04] text-black font-black rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      {busy ? 'Processando...' : 'Usar Foto'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Live camera preview */}
                  <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 aspect-video">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay
                    />
                    {!cameraActive && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9ca3af] text-xs gap-2">
                        <Loader2 size={22} className="animate-spin text-[#eab308]" />
                        Iniciando câmera...
                      </div>
                    )}
                    {cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-[#9ca3af] text-xs gap-2">
                        <AlertTriangle size={22} className="text-amber-500" />
                        <span>{cameraError}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={snap}
                      disabled={!cameraActive || busy}
                      className="flex-1 py-2.5 bg-[#eab308] hover:bg-[#ca8a04] text-black font-black rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Camera size={14} />
                      Capturar Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy}
                      className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ImagePlus size={14} />
                      Escolher da Galeria
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGalleryFile}
                  />
                </>
              )}
            </div>

            {/* Hidden snapshot canvas */}
            <canvas ref={canvasRef} className="hidden" />

            <p className="px-4 pb-3 text-[10px] text-[#9ca3af] text-center">
              A foto é comprimida e salva junto ao registro para comprovação da leitura do horímetro.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PhotoCaptureModal;