"use client";

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Printer, Download, QrCode as QrIcon, Truck, Search, FileText, Copy, Check } from 'lucide-react';

interface QrCodeManagerProps {
  machines: Array<{ id: string; name?: string; type?: string; plate?: string; model?: string; brand?: string }>;
}

interface RenderedQr {
  machineId: string;
  dataUrl: string; // base64 PNG
}

export function QrCodeManager({ machines }: QrCodeManagerProps) {
  const [rendered, setRendered] = useState<RenderedQr[]>([]);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list: RenderedQr[] = [];
      for (const m of machines) {
        const dataUrl = await QRCode.toDataURL(`CODELMAQ-EQ-${m.id}`, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 240,
          color: { dark: '#1a1a1a', light: '#ffffff' },
        });
        list.push({ machineId: m.id, dataUrl });
      }
      if (!cancelled) {
        setRendered(list);
        setGenerating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [machines]);

  const isGenerating = generating || rendered.length === 0;

  const filtered = machines.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.id.toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q) || (m.plate || '').toLowerCase().includes(q);
  });

  const renderedById = new Map(rendered.map((r) => [r.machineId, r.dataUrl]));

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('Permita popups para imprimir.');
      return;
    }
    const styles = `
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; color: #1a1a1a; }
        h1 { font-size: 18px; margin: 0 0 16px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; page-break-inside: avoid; }
        .card img { width: 160px; height: 160px; }
        .card h3 { font-size: 14px; margin: 8px 0 4px; }
        .card p { font-size: 11px; color: #555; margin: 2px 0; }
        .card .code { font-family: monospace; font-size: 10px; color: #888; }
        @media print {
          .no-print { display: none; }
        }
      </style>
    `;
    const cards = filtered
      .map((m) => {
        const dataUrl = renderedById.get(m.id);
        return `
          <div class="card">
            ${dataUrl ? `<img src="${dataUrl}" alt="QR ${m.id}" />` : '<div style="height:160px"></div>'}
            <h3>${m.id}${m.name ? ' — ' + m.name : ''}</h3>
            ${m.type ? `<p>${m.type}</p>` : ''}
            ${m.plate ? `<p>Placa: ${m.plate}</p>` : ''}
            <p class="code">CODELMAQ-EQ-${m.id}</p>
          </div>
        `;
      })
      .join('');
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>QR Codes da Frota — Codelmaq</title>
          ${styles}
        </head>
        <body>
          <h1>QR Codes da Frota — Codelmaq</h1>
          <p style="font-size:12px;color:#555;margin-bottom:16px">Imprima e cole no ativo correspondente. Escaneie com o app para iniciar um turno offline.</p>
          <div class="grid">${cards}</div>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleDownloadOne = (machineId: string) => {
    const dataUrl = renderedById.get(machineId);
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${machineId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <QrIcon className="text-[#eab308]" size={26} />
            QR Codes da Frota
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Imprima e cole em cada máquina. O operador escaneia para iniciar um turno offline.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            disabled={isGenerating || machines.length === 0}
            className="px-4 py-2 bg-[#eab308] hover:bg-[#ca8a04] text-black font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-yellow-500/10 disabled:opacity-50 cursor-pointer"
          >
            <Printer size={14} />
            Imprimir Todos
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ID, nome ou placa..."
          className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-[#151515]/40 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
        />
      </div>

      {/* Status banner */}
      {isGenerating && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-xl text-xs flex items-center gap-2">
          <QrIcon size={14} className="animate-pulse" />
          Gerando QR Codes de {machines.length} ativo(s)...
        </div>
      )}

      {!isGenerating && machines.length === 0 && (
        <div className="p-5 bg-white dark:bg-[#151515]/40 border border-gray-200 dark:border-white/10 rounded-2xl text-center text-sm text-gray-500 dark:text-gray-400">
          <Truck className="mx-auto mb-2 text-gray-400" size={32} />
          Nenhuma máquina cadastrada ainda. Adicione ativos na tela <strong>Frota e Caminhões</strong> para gerar QR Codes.
        </div>
      )}

      {/* Grid */}
      <div ref={printRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((m) => {
          const dataUrl = renderedById.get(m.id);
          const code = `CODELMAQ-EQ-${m.id}`;
          return (
            <div
              key={m.id}
              className="p-4 bg-white dark:bg-[#151515]/40 border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center text-center hover:border-[#eab308]/40 transition-colors"
            >
              <div className="w-[160px] h-[160px] bg-white rounded-xl flex items-center justify-center mb-3 p-2">
                {dataUrl ? (
                  <img src={dataUrl} alt={`QR ${m.id}`} className="w-full h-full" />
                ) : (
                  <QrIcon className="text-gray-300 animate-pulse" size={64} />
                )}
              </div>
              <h3 className="text-sm font-bold font-heading text-gray-800 dark:text-gray-100 truncate w-full">
                {m.id}
              </h3>
              {m.name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">{m.name}</p>
              )}
              {m.type && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full">{m.type}</p>
              )}
              {m.plate && (
                <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate w-full">Placa: {m.plate}</p>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                <code className="text-[9px] bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded font-mono text-gray-600 dark:text-gray-300">
                  {code}
                </code>
                <button
                  onClick={() => handleCopyCode(code)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-500 dark:text-gray-400 hover:text-[#eab308] transition-colors cursor-pointer"
                  title="Copiar código"
                >
                  {copiedCode === code ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                </button>
              </div>
              <button
                onClick={() => handleDownloadOne(m.id)}
                className="mt-2 text-[10px] text-[#eab308] hover:text-[#ca8a04] uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download size={10} />
                Baixar PNG
              </button>
            </div>
          );
        })}
      </div>

      {/* Print tip */}
      {machines.length > 0 && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 rounded-xl text-xs flex items-start gap-2">
          <FileText size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>Dica de impressão:</strong> use etiqueta adesiva A4 (4×2 ou 3×8) e cole o QR Code no painel da máquina, ao lado do horímetro. O operador aponta a câmera do celular e o turno inicia automaticamente.
          </div>
        </div>
      )}
    </div>
  );
}

export default QrCodeManager;
