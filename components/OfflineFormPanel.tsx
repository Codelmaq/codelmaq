"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  ClipboardList, 
  Truck, 
  Clock, 
  Gauge, 
  Camera, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Fuel, 
  Info,
  MapPin,
  Sparkles,
  Layers,
  Database
} from 'lucide-react';
import { localDb } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';
import { compressImage } from '@/lib/imageCompression';
import { genId } from '@/lib/utils';

interface OfflineFormPanelProps {
  machines?: Array<{ id: string; name: string; type: string; measureUnit?: string }>;
  sites?: string[];
  employees?: Array<{ id: string; nome: string; role: string }>;
  currentUserProfile?: { id: string; nome: string; role: string; email: string } | null;
}

export function OfflineFormPanel({ 
  machines = [], 
  sites = [], 
  employees = [],
  currentUserProfile 
}: OfflineFormPanelProps) {
  // Navigation tabs for the offline cockpit
  const [activeTab, setActiveTab] = useState<'checklist' | 'daily' | 'history'>('checklist');
  const [recentOfflineLogs, setRecentOfflineLogs] = useState<{ checklists: any[]; dailyLogs: any[] }>({
    checklists: [],
    dailyLogs: []
  });

  // Checklist Form React states (only for dynamic elements that require instant render feedbacks)
  const [checklistMachineId, setChecklistMachineId] = useState('');
  const [defectPhotos, setDefectPhotos] = useState<string[]>([]);
  const [compressingText, setCompressingText] = useState('');
  const [checklistSavedSuccess, setChecklistSavedSuccess] = useState(false);

  // Daily Log state
  const [dailyMachineId, setDailyMachineId] = useState('');
  const [dailyPhotos, setDailyPhotos] = useState<string[]>([]);
  const [dailySavedSuccess, setDailySavedSuccess] = useState(false);

  // Ref-based performant inputs (avoids React re-rendering on keypresses)
  const checklistOdometerRef = useRef<HTMLInputElement>(null);
  const checklistEntryHourRef = useRef<HTMLInputElement>(null);
  const checklistExitHourRef = useRef<HTMLInputElement>(null);
  const checklistNotesRef = useRef<HTMLTextAreaElement>(null);

  // Verification item answers (using state to allow visual feedback for checkboxes/radios)
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, 'bom' | 'reparar' | 'critico'>>({
    motor: 'bom',
    hidraulica: 'bom',
    eletrica: 'bom',
    freios: 'bom',
    pneus_lagartas: 'bom',
    luzes: 'bom',
    nivel_oleo: 'bom',
    vazamentos: 'bom'
  });

  // Daily Log performant input refs
  const dailyOdometerStartRef = useRef<HTMLInputElement>(null);
  const dailyOdometerEndRef = useRef<HTMLInputElement>(null);
  const dailyFuelAddedRef = useRef<HTMLInputElement>(null);
  const dailyNotesRef = useRef<HTMLTextAreaElement>(null);
  const dailySiteRef = useRef<HTMLSelectElement>(null);
  const dailyOperatorRef = useRef<HTMLSelectElement>(null);

  // Setup current values or load previous offline entries on mounting
  useEffect(() => {
    loadRecentLogs();
  }, [activeTab]);

  const loadRecentLogs = async () => {
    try {
      const dbChecklists = await localDb.checklists.toArray();
      const dbDaily = await localDb.registrosDiarios.toArray();
      setRecentOfflineLogs({ 
        checklists: dbChecklists.reverse().slice(0, 5), 
        dailyLogs: dbDaily.reverse().slice(0, 5) 
      });
    } catch (e) {
      console.error('Error loading recent offline history logs:', e);
    }
  };

  // Generic fast image uploader with integrated compression logic
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>, isChecklist: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressingText('Compressão em andamento...');
    const targetPhotos = isChecklist ? defectPhotos : dailyPhotos;
    const resolvedUrls: string[] = [...targetPhotos];

    try {
      for (let i = 0; i < files.length; i++) {
        if (resolvedUrls.length >= 4) {
          alert("Limite máximo de 4 imagens comprimidas atingido.");
          break;
        }
        
        // Execute premium client-side JPEG compression instantly
        const base64Data = await compressImage(files[i], 800, 800, 0.6);
        resolvedUrls.push(base64Data);
      }

      if (isChecklist) {
        setDefectPhotos(resolvedUrls);
      } else {
        setDailyPhotos(resolvedUrls);
      }
    } catch (err) {
      console.error('Image compression failure:', err);
      alert('Não foi possível comprimir esta foto. Tente outra.');
    } finally {
      setCompressingText('');
    }
  };

  const removePhoto = (idx: number, isChecklist: boolean) => {
    if (isChecklist) {
      setDefectPhotos(defectPhotos.filter((_, i) => i !== idx));
    } else {
      setDailyPhotos(dailyPhotos.filter((_, i) => i !== idx));
    }
  };

  // High-performance checklist submit handler
  const handleChecklistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistMachineId) {
      alert("Selecione um Ativo de Frota (Máquina).");
      return;
    }

    const entryHour = checklistEntryHourRef.current?.value || '07:00';
    const exitHour = checklistExitHourRef.current?.value || '17:00';
    const odometer = parseFloat(checklistOdometerRef.current?.value || '0');
    const observacoes = checklistNotesRef.current?.value || '';

    // Inspect checklist items to classify severity level
    const hasCritical = Object.values(checklistAnswers).some(val => val === 'critico');
    const hasRepair = Object.values(checklistAnswers).some(val => val === 'reparar');
    const status: 'aprovado' | 'atencao' | 'critico' = hasCritical 
      ? 'critico' 
      : hasRepair 
        ? 'atencao' 
        : 'aprovado';

    const localChecklistId = genId();

    const newChecklistObj = {
      id: localChecklistId,
      machineId: checklistMachineId,
      supervisorId: currentUserProfile?.id || '00000000-0000-4000-a000-000000000000',
      data: new Date().toISOString().split('T')[0],
      horaEntrada: entryHour,
      horaSaida: exitHour,
      horimetro: odometer,
      status: status,
      answers: { ...checklistAnswers },
      synced: 0,
      observacoes: observacoes,
      defectPhotos: [...defectPhotos]
    };

    try {
      // Direct insertion to Dexie client-side storage
      await localDb.checklists.add(newChecklistObj);
      
      // Update sync count sidebar instantly
      await syncEngine.countPendingRecords();

      // UI confirmation
      setChecklistSavedSuccess(true);
      setChecklistMachineId('');
      setChecklistAnswers({
        motor: 'bom',
        hidraulica: 'bom',
        eletrica: 'bom',
        freios: 'bom',
        pneus_lagartas: 'bom',
        luzes: 'bom',
        nivel_oleo: 'bom',
        vazamentos: 'bom'
      });
      setDefectPhotos([]);
      if (checklistNotesRef.current) checklistNotesRef.current.value = '';
      if (checklistOdometerRef.current) checklistOdometerRef.current.value = '';

      setTimeout(() => setChecklistSavedSuccess(false), 5000);
      loadRecentLogs();
    } catch (err) {
      console.error('Error saving checklist offline:', err);
      alert('Falha ao gravar checklist no IndexedDB local.');
    }
  };

  // High-performance daily operational log submission interceptor
  const handleDailySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyMachineId) {
      alert("Selecione qual Máquina operou hoje.");
      return;
    }

    const siteId = dailySiteRef.current?.value || 'Codelmaq Matriz';
    const operatorId = dailyOperatorRef.current?.value || currentUserProfile?.id || 'Colaborador';
    const horimetroInicial = parseFloat(dailyOdometerStartRef.current?.value || '0');
    const horimetroFinal = parseFloat(dailyOdometerEndRef.current?.value || '0');
    const fuelAdded = parseFloat(dailyFuelAddedRef.current?.value || '0');
    const observations = dailyNotesRef.current?.value || '';

    if (horimetroFinal < horimetroInicial) {
      alert("O Horímetro Final não pode ser menor que o Horímetro Inicial.");
      return;
    }

    const uniqueDailyId = genId();

    const newDailyLog = {
      id: uniqueDailyId,
      operatorId: operatorId,
      machineId: dailyMachineId,
      siteId: siteId,
      data: new Date().toISOString().split('T')[0],
      horimetroInicial: horimetroInicial,
      horimetroFinal: horimetroFinal,
      status: 'fechado' as const,
      fuelAdded: fuelAdded,
      observations: observations,
      synced: 0,
      photos: [...dailyPhotos]
    };

    try {
      // Direct insertion to local Dexie engine without fetch
      await localDb.registrosDiarios.add(newDailyLog);
      
      // Update synchronization pending statistics
      await syncEngine.countPendingRecords();

      setDailySavedSuccess(true);
      setDailyMachineId('');
      setDailyPhotos([]);
      
      if (dailyOdometerStartRef.current) dailyOdometerStartRef.current.value = '';
      if (dailyOdometerEndRef.current) dailyOdometerEndRef.current.value = '';
      if (dailyFuelAddedRef.current) dailyFuelAddedRef.current.value = '0';
      if (dailyNotesRef.current) dailyNotesRef.current.value = '';

      setTimeout(() => setDailySavedSuccess(false), 5000);
      loadRecentLogs();
    } catch (err) {
      console.error('Falha ao registrar parte diária localmente:', err);
      alert('Erro ao gravar Parte Diária no IndexedDB local.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Cockpit Header with Premium design badges */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 bg-white dark:bg-[#101010]/30 border border-[#7c4ff0]/20 dark:border-[#a17af0]/15 shadow-sm rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white font-heading tracking-tight flex items-center gap-2">
            <Layers className="text-[#7c4ff0] dark:text-[#a17af0] animate-spin" size={20} />
            PAINEL OPERACIONAL OFFLINE-FIRST
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Grave check-lists e partes diárias seguros mesmo sem sinal de rede. Transmita quando houver internet.
          </p>
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl text-xs gap-1">
          <button 
            type="button" 
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-1.5 rounded-lg font-bold font-heading uppercase transition-all flex items-center gap-1 cursor-pointer ${activeTab === 'checklist' ? 'bg-[#ca8a04] dark:bg-[#eab308] text-white shadow-md shadow-yellow-500/20 font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
          >
            <ClipboardList size={13} />
            Checklist Diário
          </button>
          
          <button 
            type="button" 
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-lg font-bold font-heading uppercase transition-all flex items-center gap-1 cursor-pointer ${activeTab === 'daily' ? 'bg-[#ca8a04] dark:bg-[#eab308] text-white shadow-md shadow-yellow-500/20 font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
          >
            <FileText size={13} />
            Parte Diária
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg font-bold font-heading uppercase transition-all flex items-center gap-1 cursor-pointer ${activeTab === 'history' ? 'bg-[#ca8a04] dark:bg-[#eab308] text-white shadow-md shadow-yellow-500/20 font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
          >
            <Database size={13} />
            Fila Local
          </button>
        </div>
      </div>

      {/* COMPRESSING INDICATOR SPINNER */}
      {compressingText && (
        <div className="p-3 bg-yellow-500/15 border border-yellow-500/20 text-yellow-300 rounded-xl text-center text-xs flex items-center justify-center gap-2 animate-pulse">
          <Camera className="animate-bounce" size={14} />
          <span>{compressingText}</span>
        </div>
      )}

      {/* TAB A: CHECKLIST DIÁRIO */}
      {activeTab === 'checklist' && (
        <form onSubmit={handleChecklistSubmit} className="space-y-4 bg-white dark:bg-[#151515]/5 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-md">
          {checklistSavedSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle size={16} />
              <span><strong>Checklist salvo!</strong> Gravado com sucesso no IndexedDB local. O indicador de sincronismo no menu foi atualizado.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Machine Selector */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-400 uppercase font-bold tracking-wider">Ativo da Frota (Veículo)</label>
              <select
                required
                value={checklistMachineId}
                onChange={(e) => setChecklistMachineId(e.target.value)}
                className="bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
              >
                <option value="">Selecione o equipamento...</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} - {m.name} ({m.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Entrance Hour */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-400 uppercase font-bold tracking-wider">Horário entrada (Início Turno)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400" size={14} />
                <input
                  type="time"
                  defaultValue="07:00"
                  ref={checklistEntryHourRef}
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl p-2.5 pl-9 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
                />
              </div>
            </div>

            {/* Exit Hour */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-400 uppercase font-bold tracking-wider">Horário Saída (Fechamento)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400" size={14} />
                <input
                  type="time"
                  defaultValue="17:00"
                  ref={checklistExitHourRef}
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl p-2.5 pl-9 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
            {/* Initial vehicle km or machine meter */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-800 dark:text-gray-400 uppercase font-bold tracking-wider">Horômetro / Odrômetro (KM atual)</label>
              <div className="relative">
                <Gauge className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400" size={14} />
                <input
                  type="number"
                  ref={checklistOdometerRef}
                  required
                  placeholder="Ex: 1450"
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 pl-9 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono"
                />
              </div>
            </div>

            {/* Supervisor reference */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-800 dark:text-gray-400 uppercase font-bold tracking-wider">Responsável Técnico</label>
              <input
                type="text"
                disabled
                className="bg-gray-100 dark:bg-[#151515]/5 border border-gray-300 dark:border-white/5 rounded-xl p-2.5 text-xs text-gray-600 dark:text-gray-300 font-semibold"
                value={currentUserProfile?.nome || 'Operador Conectado'}
              />
            </div>
          </div>

          {/* CHECKLIST ITEMS ROW */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
              <ClipboardList size={14} />
              ITENS DE VISTORIA SENSÍVEIS (SELECIONE O STATUS)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.keys(checklistAnswers).map((itemKey) => {
                const labelMap: Record<string, string> = {
                  motor: 'Sistema do Motor',
                  hidraulica: 'Mecanismos Hidráulicos',
                  eletrica: 'Parte Elétrica',
                  freios: 'Freios de Emergência',
                  pneus_lagartas: 'Pneus / Lagartas',
                  luzes: 'Faróis e Iluminação',
                  nivel_oleo: 'Nível de Óleo / Arrefecimento',
                  vazamentos: 'Filtros e Vazamento'
                };

                const currentVal = checklistAnswers[itemKey];

                return (
                  <div key={itemKey} className="p-3 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5 flex flex-col justify-between space-y-2">
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{labelMap[itemKey] || itemKey}</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setChecklistAnswers(prev => ({ ...prev, [itemKey]: 'bom' }))}
                        className={`py-1 rounded text-[10px] font-bold text-center cursor-pointer transition-colors ${currentVal === 'bom' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/25' : 'bg-gray-200 dark:bg-black/30 text-gray-600 dark:text-gray-400 border border-transparent'}`}
                      >
                        Bom
                      </button>
                      <button
                        type="button"
                        onClick={() => setChecklistAnswers(prev => ({ ...prev, [itemKey]: 'reparar' }))}
                        className={`py-1 rounded text-[10px] font-bold text-center cursor-pointer transition-colors ${currentVal === 'reparar' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/25' : 'bg-gray-200 dark:bg-black/30 text-gray-600 dark:text-gray-400 border border-transparent'}`}
                      >
                        Reparo
                      </button>
                      <button
                        type="button"
                        onClick={() => setChecklistAnswers(prev => ({ ...prev, [itemKey]: 'critico' }))}
                        className={`py-1 rounded text-[10px] font-bold text-center cursor-pointer transition-colors ${currentVal === 'critico' ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-500 border border-red-300 dark:border-red-500/25' : 'bg-gray-200 dark:bg-black/30 text-gray-600 dark:text-gray-400 border border-transparent'}`}
                      >
                        Avaria
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DEFECT PHOTO COMPONENT WITH HIGH COMPRESSION COMPLIANCE */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1">
              <Camera size={14} />
              COLEÇÃO DE FOTOS DE AVARIAS OU CONSERVAÇÃO
            </span>

            <div className="flex flex-wrap gap-3 items-center">
              {/* Photo Input Trigger */}
              <label className="w-24 h-24 bg-[#101010] hover:bg-neutral-900 border-2 border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center cursor-pointer text-gray-500 dark:text-gray-400 transition-colors group">
                <Camera size={20} className="group-hover:text-[#eab308] transition-colors" />
                <span className="text-[9px] text-gray-400 mt-1 font-semibold text-center leading-tight">Anexar<br/>Fotos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoCapture(e, true)}
                  className="hidden"
                />
              </label>

              {/* Compressed Image Thumbnails with Base64 reference */}
              {defectPhotos.map((dataUri, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group bg-black">
                  <img src={dataUri} alt="defect preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removePhoto(idx, true)}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
                      title="Excluir imagem comprimida"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <span className="absolute bottom-1 right-1 bg-black/70 text-[8px] font-mono text-emerald-400 px-1 rounded">
                    JPEG Compr.
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none">Imagens são redimensionadas para max 800px no browser eliminando estouros de pilha.</p>
          </div>

          {/* Observations notes field */}
          <div className="flex flex-col space-y-1.5 pt-2">
            <label className="text-[10px] text-gray-800 dark:text-gray-400 uppercase font-bold tracking-wider">Notas Técnicas Extra</label>
            <textarea
              ref={checklistNotesRef}
              rows={2}
              placeholder="Descreva problemas observados ou observações de campo de forma livre..."
              className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-bold font-heading rounded-xl cursor-pointer text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-yellow-500/10"
            >
              <CheckCircle size={14} />
              Gravar Checklist em Cache Seguro
            </button>
          </div>
        </form>
      )}

      {/* TAB B: PARTE DIÁRIA */}
      {activeTab === 'daily' && (
        <form onSubmit={handleDailySubmit} className="space-y-4 bg-white dark:bg-[#151515]/5 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-md font-sans">
          {dailySavedSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle size={16} />
              <span><strong>Parte Diária gravada!</strong> Registrado com sucesso offline. Quando internet retornar use o painel central de sincronização.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Machine */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-800 dark:text-gray-400 uppercase font-bold tracking-wider">Ativo da Frota</label>
              <select
                required
                value={dailyMachineId}
                onChange={(e) => setDailyMachineId(e.target.value)}
                className="bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
              >
                <option value="">Selecione a máquina...</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Site / Obra */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-800 dark:text-gray-400 uppercase font-bold tracking-wider">Obra de Operação</label>
              <select
                ref={dailySiteRef}
                className="bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
              >
                {sites.map((st: any, idx: number) => (
                  <option key={st.id || idx} value={st.nome || st.name || st}>
                    {st.nome || st.name || st}
                  </option>
                ))}
                {sites.length === 0 && (
                  <option value="Codelmaq Matriz">Codelmaq Matriz</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Operator Selection */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-800 dark:text-gray-400 uppercase font-bold tracking-wider">Operador de Máquinas</label>
              <select
                ref={dailyOperatorRef}
                defaultValue={currentUserProfile?.id || ''}
                className="bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
              >
                <option value="">Selecione o operador...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} ({e.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Odometer Start value */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-400 uppercase font-bold tracking-wider">Horômetro / KM Inicial</label>
              <div className="relative">
                <Gauge className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400" size={14} />
                <input
                  type="number"
                  required
                  ref={dailyOdometerStartRef}
                  placeholder="Ex: 1450"
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl p-2.5 pl-9 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono"
                />
              </div>
            </div>

            {/* Odometer End value */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-400 uppercase font-bold tracking-wider">Horômetro / KM Final</label>
              <div className="relative">
                <Gauge className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400" size={14} />
                <input
                  type="number"
                  required
                  ref={dailyOdometerEndRef}
                  placeholder="Ex: 1462"
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl p-2.5 pl-9 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Combustível Abastecido Added */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-400 uppercase font-bold tracking-wider">Abastecimento Realizado (Litros)</label>
              <div className="relative">
                <Fuel className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400" size={14} />
                <input
                  type="number"
                  ref={dailyFuelAddedRef}
                  defaultValue="0"
                  placeholder="Abastecido no tanque"
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl p-2.5 pl-9 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono"
                />
              </div>
            </div>

            {/* Date validation */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] text-gray-700 dark:text-gray-400 uppercase font-bold tracking-wider">Data do Diário</label>
              <input
                type="text"
                disabled
                className="bg-gray-100 dark:bg-[#151515]/5 border border-gray-200 dark:border-white/5 rounded-xl p-2.5 text-xs text-gray-500 dark:text-gray-400 font-semibold"
                value={new Date().toLocaleDateString('pt-BR')}
              />
            </div>
          </div>

          {/* Defect photo Capture Area inside Daily Form */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1">
              <Camera size={14} />
              FOTOS DA OPERAÇÃO / HORÍMETRO DO VEÍCULO
            </span>

            <div className="flex flex-wrap gap-3 items-center">
              <label className="w-24 h-24 bg-[#101010] hover:bg-neutral-900 border-2 border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center cursor-pointer text-gray-500 dark:text-gray-400 transition-colors group">
                <Camera size={20} className="group-hover:text-[#eab308] transition-colors" />
                <span className="text-[9px] text-gray-400 mt-1 font-semibold text-center leading-tight">Anexar<br/>Fotos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoCapture(e, false)}
                  className="hidden"
                />
              </label>

              {dailyPhotos.map((dataUri, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group bg-black">
                  <img src={dataUri} alt="daily operation preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removePhoto(idx, false)}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <span className="absolute bottom-1 right-1 bg-black/70 text-[8px] font-mono text-emerald-400 px-1 rounded">
                    JPEG
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Observations notes field */}
          <div className="flex flex-col space-y-1.5 pt-2">
            <label className="text-[10px] text-gray-700 dark:text-gray-400 uppercase font-bold tracking-wider">Comentários e Intercorrências</label>
            <textarea
              ref={dailyNotesRef}
              rows={2}
              placeholder="Houve intercorrências, quebras, chuvas paralisantes ou abastecimento extra? Descreva..."
              className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#eab308] hover:bg-[#ca8a04] text-black font-bold font-heading rounded-xl cursor-pointer text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-yellow-500/10"
            >
              <CheckCircle size={14} />
              Fechar Turno Diário Offline-First
            </button>
          </div>
        </form>
      )}

      {/* TAB C: FILA LOCAL STATUS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4 bg-white dark:bg-[#151515]/5 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-md">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <div>
              <h3 className="text-sm font-bold text-white font-heading uppercase flex items-center gap-1.5">
                <Database className="text-[#eab308]" size={15} />
                REGISTROS ARMAZENADOS NO APARELHO (INDEXEDDB)
              </h3>
              <p className="text-[10px] text-gray-400">Total de histórico local em rascunho de integridade.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-yellow-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                <ClipboardList size={12} />
                Fila de Checklists Diários ({recentOfflineLogs.checklists.length})
              </h4>
              {recentOfflineLogs.checklists.length === 0 ? (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 italic pl-2">Nenhum checklist diário em cache local.</p>
              ) : (
                <div className="space-y-1.5 font-mono text-[10px]">
                  {recentOfflineLogs.checklists.map((chk, idx) => (
                    <div key={idx} className="p-2 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{chk.machineId}</span>
                          <span className="text-gray-500 dark:text-gray-400">{chk.data} (Entrada: {chk.horaEntrada || '07:00'} / Saída: {chk.horaSaid || '17:00'})</span>
                        </div>
                        <p className="text-gray-400 truncate max-w-sm">Obs: {chk.observacoes || '-'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {chk.synced === 0 ? (
                          <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded-md uppercase text-[8px] animate-pulse">
                            Pendente em Cache
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-md uppercase text-[8px]">
                            Sincronizado Nuvem
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-yellow-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                <FileText size={12} />
                Fila de Partes Diárias ({recentOfflineLogs.dailyLogs.length})
              </h4>
              {recentOfflineLogs.dailyLogs.length === 0 ? (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 italic pl-2">Nenhuma parte diária em cache local.</p>
              ) : (
                <div className="space-y-1.5 font-mono text-[10px]">
                  {recentOfflineLogs.dailyLogs.map((log, idx) => (
                    <div key={idx} className="p-2 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{log.machineId}</span>
                          <span className="text-gray-400">{log.data} (H.Inicial: {log.horimetroInicial} | H.Final: {log.horimetroFinal})</span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <MapPin size={11} /> {log.siteId} 
                          {log.fuelAdded > 0 && <span className="text-green-400">| +{log.fuelAdded}L combust.</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.synced === 0 ? (
                          <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded-md uppercase text-[8px] animate-pulse">
                            Pendente em Cache
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-md uppercase text-[8px]">
                            Sincronizado Nuvem
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default OfflineFormPanel;
