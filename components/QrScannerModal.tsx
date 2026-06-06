"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, ScanLine, Cpu, AlertTriangle } from 'lucide-react';

export interface QrScannerMockItem {
  code: string;
  title: string;
  subtitle?: string;
  tag?: string;
  payload: {
    id: string;
    nome?: string;
    type: 'machine' | 'employee' | 'other';
    [key: string]: any;
  };
}

export interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  mockItems: QrScannerMockItem[];          // shown as "Gaveta de QRs" for offline testing
  onScan: (code: string, payload: QrScannerMockItem['payload']) => void;
}

export function QrScannerModal({
  open,
  onClose,
  title = 'Leitor de QR Code',
  description = 'Aponte a câmera para o QR Code impresso no ativo, ou selecione um da lista de simulação abaixo para teste offline.',
  mockItems,
  onScan,
}: QrScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [open, stopCamera]);

  // Reset transient UI state when the modal closes
  useEffect(() => {
    if (open) return;
    const id = setTimeout(() => {
      setIsScanning(false);
      setCameraError(null);
    }, 0);
    return () => clearTimeout(id);
  }, [open]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera unavailable, use simulator below:', err);
      setCameraError(
        'Câmera indisponível ou permissão negada. Use um dos QRs de simulação abaixo para testar offline.'
      );
    }
  };

  const handleMockScan = (item: QrScannerMockItem) => {
    if (isScanning) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      onScan(item.code, item.payload);
    }, 1200);
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
          className="bg-[#151515] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-white/5">
            <div className="flex-1">
              <h3 className="text-base font-bold text-white font-heading uppercase flex items-center gap-2">
                <ScanLine className="text-[#eab308]" size={18} />
                {title}
              </h3>
              <p className="text-xs text-[#9ca3af] mt-1">{description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              aria-label="Fechar scanner"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Camera viewport */}
            <div className="relative aspect-video w-full rounded-2xl bg-black border border-white/10 overflow-hidden flex flex-col items-center justify-center">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                />
              ) : (
                <div className="text-center p-6 space-y-3 z-10">
                  <div className="mx-auto h-12 w-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[#9ca3af] animate-pulse">
                    <Camera className="h-6 w-6" />
                  </div>
                  <p className="text-[11px] text-[#9ca3af] font-medium max-w-xs">
                    {cameraError ? cameraError : 'Câmera pronta para decodificar QR Codes de ativos.'}
                  </p>
                  <button
                    onClick={startCamera}
                    className="py-1.5 px-3 bg-[#eab308]/10 hover:bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/20 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    {cameraError ? 'Tentar Câmera de Novo' : 'Ativar Câmera'}
                  </button>
                </div>
              )}

              {/* Camera permission warning */}
              {cameraError && cameraActive === false && null /* error is shown above */}

              {/* Laser scanning overlay */}
              <div className="absolute inset-0 pointer-events-none z-20 border-2 border-dashed border-[#eab308]/20 m-6 flex items-center justify-center">
                <div className="w-[12%] h-[12%] border-t-2 border-l-2 border-[#eab308] absolute top-0 left-0"></div>
                <div className="w-[12%] h-[12%] border-t-2 border-r-2 border-[#eab308] absolute top-0 right-0"></div>
                <div className="w-[12%] h-[12%] border-b-2 border-l-2 border-[#eab308] absolute bottom-0 left-0"></div>
                <div className="w-[12%] h-[12%] border-b-2 border-r-2 border-[#eab308] absolute bottom-0 right-0"></div>

                {isScanning && (
                  <motion.div
                    initial={{ y: -80 }}
                    animate={{ y: 80 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#eab308] to-transparent shadow-[0_0_12px_#eab308]"
                  />
                )}
              </div>

              {isScanning && (
                <div className="absolute top-3 left-3 bg-black/70 border border-[#eab308]/30 text-[#eab308] text-[10px] px-2 py-1 rounded-md uppercase tracking-wider font-bold animate-pulse z-30 flex items-center gap-1">
                  <Cpu size={11} />
                  Decodificando...
                </div>
              )}

              {cameraError && cameraActive && (
                <div className="absolute inset-x-4 bottom-4 p-3 bg-red-500/90 text-white rounded-xl text-[10px] leading-relaxed z-15 backdrop-blur-md flex items-start gap-1.5">
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            {/* Mock QR list */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#9ca3af] flex items-center gap-1">
                <Cpu className="h-4 w-4" />
                Gaveta de QRs de Simulação (teste offline)
              </div>

              {mockItems.length === 0 ? (
                <p className="text-xs text-[#6b7280] italic">Nenhum QR disponível para simulação.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {mockItems.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      disabled={isScanning}
                      onClick={() => handleMockScan(item)}
                      className="p-3 rounded-2xl border text-left bg-black/30 hover:bg-black/50 hover:border-[#eab308]/40 transition-all cursor-pointer relative overflow-hidden group disabled:opacity-50 border-white/5"
                    >
                      {item.tag && (
                        <div className="absolute top-0 right-0 p-1 px-2 rounded-bl-xl bg-white/5 text-[9px] font-black tracking-wider text-[#eab308] uppercase">
                          {item.tag}
                        </div>
                      )}
                      <p className="text-[10px] font-mono text-[#9ca3af]">{item.code}</p>
                      <h4 className="text-xs font-bold font-heading text-white mt-1 group-hover:text-[#eab308] transition-colors">
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-[10px] text-[#9ca3af] mt-0.5">{item.subtitle}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default QrScannerModal;
