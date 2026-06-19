"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  ClipboardList, 
  Gauge, 
  Camera, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Fuel, 
  MapPin,
  Loader2,
  Database,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { localDb } from '@/lib/localDb';
import { syncEngine, SyncStatusReport } from '@/lib/syncEngine';
import { compressImage } from '@/lib/imageCompression';
import { genId } from '@/lib/utils';
import { useShiftStore } from '@/store/shiftStore';
import { QrScannerModal, QrScannerMockItem } from './QrScannerModal';
import { StartShiftModal } from './StartShiftModal';

interface OfflineFormPanelProps {
  machines?: Array<{ id: string; name: string; type: string; measureUnit?: string }>;
  sites?: string[];
  currentUserProfile?: { id: string; nome: string; role: string; email: string } | null;
}

export function OfflineFormPanel({ 
  machines = [], 
  sites = [], 
  currentUserProfile 
}: OfflineFormPanelProps) {
  // Navigation tabs for the offline cockpit
  const [activeTab, setActiveTab] = useState<'checklist' | 'history'>('checklist');
  const [recentOfflineLogs, setRecentOfflineLogs] = useState<{ checklists: any[]; dailyLogs: any[] }>({
    checklists: [],
    dailyLogs: []
  });
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  // QR Scan flow state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [shiftCreationError, setShiftCreationError] = useState<string | null>(null);
  const startShift = useShiftStore((s) => s.startShift);
  const activeShift = useShiftStore((s) => s.activeShift);

  // Unified form state
  const [machineId, setMachineId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [compressingText, setCompressingText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Ref-based performant inputs
  const horimetroInicialRef = useRef<HTMLInputElement>(null);
  const horimetroFinalRef = useRef<HTMLInputElement>(null);
  const fuelAddedRef = useRef<HTMLInputElement>(null);
  const commentsRef = useRef<HTMLTextAreaElement>(null);

  // Verification item answers
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

  // Setup current values or load previous offline entries on mounting
  useEffect(() => {
    loadRecentLogs();
  }, [activeTab]);

  // Track global sync state to drive header loading indicator
  const [isSyncing, setIsSyncing] = useState(false);
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status: SyncStatusReport) => {
      setIsSyncing(status.isSyncing);
    });
    return unsubscribe;
  }, []);

  const loadRecentLogs = async () => {
    try {
      const dbChecklists = await localDb.checklists.toArray();
      const dbDaily = await localDb.registrosDiarios.toArray();
      setRecentOfflineLogs({ 
        checklists: dbChecklists.reverse().slice(0, 20), 
        dailyLogs: dbDaily.reverse().slice(0, 20) 
      });
    } catch (e) {
      console.error('Error loading recent offline history logs:', e);
    }
  };

  // Retry a single failed record: clear its sync_failed flag, re-run the sync engine.
  const handleRetryRecord = async (table: 'checklists' | 'registrosDiarios', id: string) => {
    try {
      setIsRetrying(id);
      if (table === 'checklists') {
        await localDb.checklists.update(id, { sync_failed: 0, sync_error: undefined });
      } else {
        await localDb.registrosDiarios.update(id, { sync_failed: 0, sync_error: undefined });
      }
      await syncEngine.countPendingRecords();
      await loadRecentLogs();
      await syncEngine.runSync();
      await loadRecentLogs();
    } catch (e) {
      console.error('Retry failed:', e);
    } finally {
      setIsRetrying(null);
    }
  };

  // Discard a failed record after explicit user confirmation.
  const handleDiscardRecord = async (table: 'checklists' | 'registrosDiarios', id: string, machineId: string) => {
    const confirmed = confirm(
      `Descartar definitivamente o registro do equipamento "${machineId}"?\n\n` +
      `Esta ação NÃO pode ser desfeita e o registro será perdido.`
    );
    if (!confirmed) return;
    try {
      if (table === 'checklists') {
        await localDb.checklists.delete(id);
      } else {
        await localDb.registrosDiarios.delete(id);
      }
      await syncEngine.countPendingRecords();
      await loadRecentLogs();
    } catch (e) {
      console.error('Discard failed:', e);
    }
  };

  // Generic fast image uploader with integrated compression logic
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressingText('Compressão em andamento...');
    const resolvedUrls: string[] = [...photos];

    try {
      for (let i = 0; i < files.length; i++) {
        if (resolvedUrls.length >= 4) {
          alert("Limite máximo de 4 imagens comprimidas atingido.");
          break;
        }
        const base64Data = await compressImage(files[i], 800, 800, 0.6);
        resolvedUrls.push(base64Data);
      }

      setPhotos(resolvedUrls);
    } catch (err) {
      console.error('Image compression failure:', err);
      alert('Não foi possível comprimir esta foto. Tente outra.');
    } finally {
      setCompressingText('');
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  // Unified form submit: saves to both checklists and registrosDiarios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId) {
      alert("Selecione a máquina.");
      return;
    }
    if (!currentUserProfile?.id) {
      alert("Operador não identificado. Faça login novamente.");
      return;
    }

    const horimetroInicial = parseFloat(horimetroInicialRef.current?.value || '0');
    const horimetroFinal = parseFloat(horimetroFinalRef.current?.value || '0');
    const fuelAdded = parseFloat(fuelAddedRef.current?.value || '0');
    const observations = commentsRef.current?.value || '';

    if (horimetroFinal < horimetroInicial) {
      alert("O Horímetro Final não pode ser menor que o Horímetro Inicial.");
      return;
    }

    const hasCritical = Object.values(checklistAnswers).some(val => val === 'critico');
    const hasRepair = Object.values(checklistAnswers).some(val => val === 'reparar');
    const status: 'aprovado' | 'atencao' | 'critico' = hasCritical 
      ? 'critico' 
      : hasRepair 
        ? 'atencao' 
        : 'aprovado';

    const recordId = genId();
    const today = new Date().toISOString().split('T')[0];
    const operatorId = currentUserProfile.id;

    const newChecklist = {
      id: recordId,
      machineId: machineId,
      supervisorId: operatorId,
      data: today,
      horaEntrada: '07:00',
      horaSaida: '17:00',
      horimetro: horimetroFinal,
      status: status,
      answers: { ...checklistAnswers },
      synced: 0,
      observacoes: observations,
      defectPhotos: [...photos]
    };

    const newDailyLog = {
      id: recordId,
      operatorId: operatorId,
      machineId: machineId,
      siteId: siteId || sites[0] || '',
      data: today,
      horimetroInicial: horimetroInicial,
      horimetroFinal: horimetroFinal,
      status: 'fechado' as const,
      fuelAdded: fuelAdded,
      observations: observations,
      synced: 0,
      photos: [...photos]
    };

    try {
      await localDb.checklists.add(newChecklist);
      await localDb.registrosDiarios.add(newDailyLog);
      await syncEngine.countPendingRecords();

      setSavedSuccess(true);
      setMachineId('');
      setSiteId('');
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
      setPhotos([]);
      if (horimetroInicialRef.current) horimetroInicialRef.current.value = '';
      if (horimetroFinalRef.current) horimetroFinalRef.current.value = '';
      if (fuelAddedRef.current) fuelAddedRef.current.value = '';
      if (commentsRef.current) commentsRef.current.value = '';

      setTimeout(() => setSavedSuccess(false), 5000);
      loadRecentLogs();
    } catch (err) {
      console.error('Falha ao salvar registro:', err);
      alert('Erro ao gravar no IndexedDB local.');
    }
  };

  // ---------------------------------------------------------------------
  // QR Scan flow
  // ---------------------------------------------------------------------
  const scannerMockItems: QrScannerMockItem[] = React.useMemo(() => {
    return (machines || []).map((m) => ({
      code: `CODELMAQ-EQ-${m.id}`,
      label: m.id,
      sublabel: m.name || m.type,
      color: 'yellow',
    }));
  }, [machines]);

  // Previous shift data — auto-fills initial horimetro on the next start
  const [previousHorimetro, setPreviousHorimetro] = useState<number | null>(null);
  const [previousEndDate, setPreviousEndDate] = useState<string | null>(null);

  const handleScan = (code: string) => {
    setScannerOpen(false);
    setShiftCreationError(null);
    if (activeShift) {
      setShiftCreationError('Já existe um turno em andamento. Encerre-o antes de iniciar outro.');
      return;
    }
    const machineIdFromCode = code.replace(/^CODELMAQ-EQ-/, '');
    setScannedCode(code);
    // Look up the most recent closed shift for this machine to pre-fill the initial horimetro
    lookupLastShift(machineIdFromCode);
  };

  const lookupLastShift = async (machineId: string) => {
    try {
      const records = await localDb.registrosDiarios
        .where('machineId').equals(machineId)
        .reverse()
        .sortBy('data');
      // Find the most recent closed record with a valid horimetroFinal
      const closed = records
        .filter((r) => r.status === 'fechado' && typeof r.horimetroFinal === 'number' && !isNaN(r.horimetroFinal))
        .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
      if (closed.length > 0) {
        setPreviousHorimetro(closed[0].horimetroFinal);
        setPreviousEndDate(closed[0].data || null);
      } else {
        setPreviousHorimetro(null);
        setPreviousEndDate(null);
      }
    } catch (e) {
      console.warn('lookupLastShift failed:', e);
      setPreviousHorimetro(null);
      setPreviousEndDate(null);
    }
  };

  const handleStartShift = async (data: { machineId: string; machineName?: string; horimetroInicial: number; horaInicio: string; previousHorimetro?: number }) => {
    try {
      if (!currentUserProfile?.id) {
        setShiftCreationError('Usuário não identificado. Faça login novamente.');
        return;
      }

      // Find machine record from props (fall back to id only)
      const machine = (machines || []).find((m) => m.id === data.machineId);

      // Create a rascunho registro_diario tied to the user's first site
      const newDailyLog = {
        id: genId(),
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toISOString().slice(11, 16),
        machineId: data.machineId,
        machineName: data.machineName || machine?.name || '',
        machineType: machine?.type || '',
        operatorId: currentUserProfile.id,
        operatorName: currentUserProfile.nome,
        siteId: sites[0] || '',
        horimetroInicial: data.horimetroInicial,
        horimetroFinal: null as number | null,
        fuelAdded: 0,
        fuelLevel: null as number | null,
        workDescription: '',
        observations: '',
        status: 'rascunho' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        horaInicio: data.horaInicio,
        horaFim: null as string | null,
        photos: [],
        synced: 0,
        syncFailed: 0,
      };

      await localDb.registrosDiarios.add(newDailyLog);
      await syncEngine.countPendingRecords();

      startShift({
        id: newDailyLog.id,
        machineId: newDailyLog.machineId,
        machineName: newDailyLog.machineName,
        operatorId: newDailyLog.operatorId,
        operatorName: newDailyLog.operatorName,
        startedAt: newDailyLog.createdAt,
        horimetroInicial: newDailyLog.horimetroInicial,
        siteId: newDailyLog.siteId,
      });

      // Pre-select the machine in the form
      setMachineId(data.machineId);

      // Clear prefill state so the next scan re-queries fresh
      setPreviousHorimetro(null);
      setPreviousEndDate(null);

      setScannedCode(null);
    } catch (e) {
      console.error('Erro ao iniciar turno:', e);
      setShiftCreationError('Erro ao criar turno. Tente novamente.');
    }
  };

  const machineLookup = React.useCallback(
    (id: string) => {
      const m = (machines || []).find((x) => x.id === id);
      return m ? { id: m.id, name: m.name, type: m.type, plate: (m as any).plate } : undefined;
    },
    [machines],
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-white dark:bg-[#101010]/30 border-2 border-gray-300 dark:border-[#a17af0]/15 shadow-sm rounded-2xl">
        <div className="min-w-0">
          <h2 className="text-sm md:text-xs font-bold text-gray-700 dark:text-gray-300 font-heading tracking-wider uppercase flex items-center gap-2">
            <Loader2 className={`text-[#eab308] ${isSyncing ? 'animate-spin' : ''}`} size={14} />
            Registro diário
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="w-full md:w-auto px-5 py-3 md:px-4 md:py-2.5 bg-gradient-to-br from-[#eab308] to-[#ca8a04] hover:from-[#facc15] hover:to-[#eab308] text-white font-black rounded-xl shadow-md shadow-yellow-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all text-base md:text-xs"
        >
          <QrCode size={20} className="md:!size-4" />
          Escanear QR Code
        </button>

        <div className="flex bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-800 p-1.5 md:p-1 rounded-xl text-sm md:text-xs gap-1 w-full md:w-auto">
          <button 
            type="button" 
            onClick={() => setActiveTab('checklist')}
            className={`flex-1 md:flex-none px-4 py-2.5 md:px-3 md:py-1.5 rounded-lg font-bold font-heading uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'checklist' ? 'bg-[#ca8a04] dark:bg-[#eab308] text-white shadow-md shadow-yellow-500/20 font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
          >
            <ClipboardList size={16} className="md:!size-3" />
            Checklist Diário
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none px-4 py-2.5 md:px-3 md:py-1.5 rounded-lg font-bold font-heading uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'history' ? 'bg-[#ca8a04] dark:bg-[#eab308] text-white shadow-md shadow-yellow-500/20 font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
          >
            <Database size={16} className="md:!size-3" />
            Fila Local
          </button>
        </div>
      </div>

      {/* COMPRESSING INDICATOR */}
      {compressingText && (
        <div className="p-3 bg-yellow-500/15 border border-yellow-500/30 text-yellow-700 dark:text-yellow-300 rounded-xl text-center text-base md:text-xs font-medium flex items-center justify-center gap-2 animate-pulse">
          <Camera className="animate-bounce" size={18} />
          <span>{compressingText}</span>
        </div>
      )}

      {/* UNIFIED FORM */}
      {activeTab === 'checklist' && (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-[#151515]/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl p-4 sm:p-5 md:p-6 backdrop-blur-md shadow-sm">
          {savedSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm sm:text-base font-medium flex items-center gap-2">
              <CheckCircle size={18} />
              <span><strong className="font-bold">Registro salvo!</strong> Checklist e Parte Diária gravados com sucesso no aparelho. Sincronização automática quando houver internet.</span>
            </div>
          )}

          {/* Linha 1: Ativo + Obra */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <label className="text-base md:text-[10px] text-gray-800 dark:text-gray-300 uppercase font-bold tracking-wider">Ativo da Frota</label>
              <select
                required
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-4 md:p-2.5 text-lg md:text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-medium"
              >
                <option value="">Selecione a máquina...</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} - {m.name} ({m.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-base md:text-[10px] text-gray-800 dark:text-gray-300 uppercase font-bold tracking-wider">Obra de Operação</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-4 md:p-2.5 text-lg md:text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-medium"
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

          {/* Linha 2: Hor.Inicial + Hor.Final + Abastecimento + Data — empilhados no mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <label className="text-base md:text-[10px] text-gray-800 dark:text-gray-300 uppercase font-bold tracking-wider">Horímetro / KM Inicial</label>
              <div className="relative">
                <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 md:top-2.5 md:translate-y-0 text-gray-600 dark:text-gray-300" size={20} />
                <input
                  type="number"
                  required
                  ref={horimetroInicialRef}
                  placeholder="Ex: 1450"
                  className="w-full bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-4 md:p-2.5 pl-12 md:pl-9 text-xl md:text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-base md:text-[10px] text-gray-800 dark:text-gray-300 uppercase font-bold tracking-wider">Horímetro / KM Final</label>
              <div className="relative">
                <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 md:top-2.5 md:translate-y-0 text-gray-600 dark:text-gray-300" size={20} />
                <input
                  type="number"
                  required
                  ref={horimetroFinalRef}
                  placeholder="Ex: 1462"
                  className="w-full bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-4 md:p-2.5 pl-12 md:pl-9 text-xl md:text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-base md:text-[10px] text-gray-800 dark:text-gray-300 uppercase font-bold tracking-wider">Abastecimento (Litros)</label>
              <div className="relative">
                <Fuel className="absolute left-4 top-1/2 -translate-y-1/2 md:top-2.5 md:translate-y-0 text-gray-600 dark:text-gray-300" size={20} />
                <input
                  type="number"
                  ref={fuelAddedRef}
                  placeholder="0"
                  className="w-full bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-4 md:p-2.5 pl-12 md:pl-9 text-xl md:text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-base md:text-[10px] text-gray-800 dark:text-gray-300 uppercase font-bold tracking-wider">Data do Diário</label>
              <input
                type="text"
                disabled
                className="w-full bg-gray-100 dark:bg-[#151515]/5 border-2 border-gray-300 dark:border-white/5 rounded-xl p-4 md:p-2.5 text-xl md:text-xs text-gray-900 dark:text-gray-200 font-bold"
                value={new Date().toLocaleDateString('pt-BR')}
              />
            </div>
          </div>

          {/* ITENS DE VISTORIA */}
          <div className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-3">
            <span className="text-sm md:text-xs font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
              <ClipboardList size={16} />
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
                  <div key={itemKey} className="p-4 md:p-3 bg-white dark:bg-black/20 rounded-xl border-2 border-gray-300 dark:border-white/5 flex flex-col justify-between space-y-2.5">
                    <span className="text-base md:text-xs font-bold text-gray-900 dark:text-white">{labelMap[itemKey] || itemKey}</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setChecklistAnswers(prev => ({ ...prev, [itemKey]: 'bom' }))}
                        className={`py-2.5 md:py-1.5 rounded-lg text-sm md:text-[10px] font-bold text-center cursor-pointer transition-colors ${currentVal === 'bom' ? 'bg-emerald-200 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-500 dark:border-emerald-500/40' : 'bg-gray-100 dark:bg-black/30 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-transparent'}`}
                      >
                        Bom
                      </button>
                      <button
                        type="button"
                        onClick={() => setChecklistAnswers(prev => ({ ...prev, [itemKey]: 'reparar' }))}
                        className={`py-2.5 md:py-1.5 rounded-lg text-sm md:text-[10px] font-bold text-center cursor-pointer transition-colors ${currentVal === 'reparar' ? 'bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-2 border-amber-500 dark:border-amber-500/40' : 'bg-gray-100 dark:bg-black/30 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-transparent'}`}
                      >
                        Reparo
                      </button>
                      <button
                        type="button"
                        onClick={() => setChecklistAnswers(prev => ({ ...prev, [itemKey]: 'critico' }))}
                        className={`py-2.5 md:py-1.5 rounded-lg text-sm md:text-[10px] font-bold text-center cursor-pointer transition-colors ${currentVal === 'critico' ? 'bg-red-200 dark:bg-red-500/20 text-red-800 dark:text-red-300 border-2 border-red-500 dark:border-red-500/40' : 'bg-gray-100 dark:bg-black/30 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-transparent'}`}
                      >
                        Avaria
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FOTOS */}
          <div className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-3">
            <span className="text-sm md:text-xs font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
              <Camera size={16} />
              FOTOS DA OPERAÇÃO / HORÍMETRO DO VEÍCULO
            </span>

            <div className="flex flex-wrap gap-3 items-center">
              <label className="w-28 h-28 md:w-24 md:h-24 bg-gray-50 hover:bg-gray-100 dark:bg-[#101010] dark:hover:bg-neutral-900 border-2 border-dashed border-gray-400 dark:border-white/20 rounded-xl flex flex-col items-center justify-center cursor-pointer text-gray-700 dark:text-gray-300 transition-colors group">
                <Camera size={24} className="md:!size-5 group-hover:text-[#eab308] transition-colors" />
                <span className="text-xs md:text-[9px] text-gray-600 dark:text-gray-300 mt-1.5 md:mt-1 font-bold text-center leading-tight">Anexar<br/>Fotos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </label>

              {photos.map((dataUri, idx) => (
                <div key={idx} className="relative w-28 h-28 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 border-gray-300 dark:border-white/10 group bg-black">
                  <img src={dataUri} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="p-2 md:p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
                    >
                      <Trash2 size={18} className="md:!size-3.5" />
                    </button>
                  </div>
                  <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] md:text-[8px] font-mono text-emerald-300 px-1.5 md:px-1 rounded font-bold">
                    JPEG
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Comentários */}
          <div className="flex flex-col space-y-1.5 pt-2">
            <label className="text-xs md:text-[10px] text-gray-800 dark:text-gray-300 uppercase font-bold tracking-wider">Comentários e Intercorrências</label>
            <textarea
              ref={commentsRef}
              rows={3}
              placeholder="Houve intercorrências, quebras, chuvas paralisantes ou abastecimento extra? Descreva..."
              className="w-full bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-3 md:p-2.5 text-base md:text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 md:py-2.5 bg-[#eab308] hover:bg-[#ca8a04] text-black font-bold font-heading rounded-xl cursor-pointer text-base md:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg shadow-yellow-500/20"
            >
              <CheckCircle size={18} className="md:!size-3.5" />
              Fechar Turno Diário Offline-First
            </button>
          </div>
        </form>
      )}

      {/* TAB C: FILA LOCAL STATUS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4 bg-white dark:bg-[#151515]/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-md">
          <div className="flex justify-between items-center pb-3 border-b-2 border-gray-200 dark:border-white/5">
            <div>
              <h3 className="text-lg md:text-sm font-bold text-gray-900 dark:text-white font-heading uppercase flex items-center gap-1.5">
                <Database className="text-[#eab308]" size={20} />
                FILA LOCAL — INDEXEDDB
              </h3>
              <p className="text-sm md:text-[10px] text-gray-600 dark:text-gray-300 mt-1 font-medium">Pendentes aguardam conexão. Falhos precisam de ação: corrija o cadastro ou descarte.</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* CHECKLISTS SECTION */}
            {(() => {
              const all = recentOfflineLogs.checklists;
              const failed = all.filter((c) => c.synced === 0 && c.sync_failed === 1);
              const pending = all.filter((c) => c.synced === 0 && c.sync_failed !== 1);
              const synced = all.filter((c) => c.synced === 1);

              return (
                <div>
                  <h4 className="text-base md:text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList size={16} className="md:!size-3" />
                    Checklists Diários — {all.length} no total
                  </h4>

                  {/* FAILED CHECKLISTS */}
                  {failed.length > 0 && (
                    <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-red-400 font-bold text-[10px] uppercase tracking-wider">
                        <AlertTriangle size={12} />
                        {failed.length} registro(s) com falha de sincronização
                      </div>
                      {failed.map((chk) => (
                        <div key={chk.id} className="p-2 bg-black/40 border border-red-500/20 rounded-lg space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white">{chk.machineId}</span>
                                <span className="text-gray-400">{chk.data}</span>
                                <span className="px-1.5 py-0.5 bg-red-500/20 border border-red-500/40 text-red-300 font-bold rounded-md uppercase text-[8px]">
                                  Falhou
                                </span>
                              </div>
                              <p className="text-[10px] text-red-300/90 leading-snug break-words">
                                {chk.sync_error || 'Erro desconhecido na última tentativa de sincronização.'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleRetryRecord('checklists', chk.id)}
                              disabled={isRetrying === chk.id}
                              className="px-2 py-1 bg-[#eab308] hover:bg-[#ca8a04] text-black font-bold rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw size={10} className={isRetrying === chk.id ? 'animate-spin' : ''} />
                              Tentar Novamente
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDiscardRecord('checklists', chk.id, chk.machineId)}
                              className="px-2 py-1 bg-zinc-700 hover:bg-red-600 text-white font-bold rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={10} />
                              Descartar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PENDING CHECKLISTS */}
                  {pending.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[9px] text-amber-400 font-bold uppercase tracking-wider mb-1 pl-1">
                        Pendentes ({pending.length})
                      </div>
                      <div className="space-y-1">
                        {pending.map((chk) => (
                          <div key={chk.id} className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center justify-between gap-2">
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-[10px]">{chk.machineId}</span>
                                <span className="text-gray-400 text-[10px]">{chk.data}</span>
                              </div>
                              <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Obs: {chk.observacoes || '-'}</p>
                            </div>
                            <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold rounded-md uppercase text-[8px] animate-pulse whitespace-nowrap">
                              Pendente
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SYNCED CHECKLISTS (compact) */}
                  {synced.length > 0 && (
                    <div>
                      <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1 pl-1">
                        Sincronizados ({synced.length})
                      </div>
                      <div className="space-y-1">
                        {synced.slice(0, 3).map((chk) => (
                          <div key={chk.id} className="p-1.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-bold text-gray-300 text-[10px]">{chk.machineId}</span>
                              <span className="text-gray-500 dark:text-gray-400 text-[10px]">{chk.data}</span>
                            </div>
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-md uppercase text-[8px] whitespace-nowrap">
                              OK
                            </span>
                          </div>
                        ))}
                        {synced.length > 3 && (
                          <p className="text-[9px] text-gray-500 dark:text-gray-400 italic pl-1">+{synced.length - 3} já sincronizados</p>
                        )}
                      </div>
                    </div>
                  )}

                  {all.length === 0 && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 italic pl-2">Nenhum checklist diário em cache local.</p>
                  )}
                </div>
              );
            })()}

            {/* DAILY LOGS SECTION */}
            {(() => {
              const all = recentOfflineLogs.dailyLogs;
              const failed = all.filter((l) => l.synced === 0 && l.sync_failed === 1);
              const pending = all.filter((l) => l.synced === 0 && l.sync_failed !== 1);
              const synced = all.filter((l) => l.synced === 1);

              return (
                <div>
                  <h4 className="text-xs font-bold text-yellow-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={12} />
                    Partes Diárias — {all.length} no total
                  </h4>

                  {/* FAILED LOGS */}
                  {failed.length > 0 && (
                    <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-red-400 font-bold text-[10px] uppercase tracking-wider">
                        <AlertTriangle size={12} />
                        {failed.length} registro(s) com falha de sincronização
                      </div>
                      {failed.map((log) => (
                        <div key={log.id} className="p-2 bg-black/40 border border-red-500/20 rounded-lg space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white">{log.machineId}</span>
                                <span className="text-gray-400">{log.data}</span>
                                <span className="px-1.5 py-0.5 bg-red-500/20 border border-red-500/40 text-red-300 font-bold rounded-md uppercase text-[8px]">
                                  Falhou
                                </span>
                              </div>
                              <p className="text-[10px] text-red-300/90 leading-snug break-words">
                                {log.sync_error || 'Erro desconhecido na última tentativa de sincronização.'}
                              </p>
                              <p className="text-[9px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <MapPin size={10} /> {log.siteId} | H.Inicial: {log.horimetroInicial} | H.Final: {log.horimetroFinal}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleRetryRecord('registrosDiarios', log.id)}
                              disabled={isRetrying === log.id}
                              className="px-2 py-1 bg-[#eab308] hover:bg-[#ca8a04] text-black font-bold rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw size={10} className={isRetrying === log.id ? 'animate-spin' : ''} />
                              Tentar Novamente
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDiscardRecord('registrosDiarios', log.id, log.machineId)}
                              className="px-2 py-1 bg-zinc-700 hover:bg-red-600 text-white font-bold rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={10} />
                              Descartar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PENDING LOGS */}
                  {pending.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[9px] text-amber-400 font-bold uppercase tracking-wider mb-1 pl-1">
                        Pendentes ({pending.length})
                      </div>
                      <div className="space-y-1">
                        {pending.map((log) => (
                          <div key={log.id} className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center justify-between gap-2">
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-[10px]">{log.machineId}</span>
                                <span className="text-gray-400 text-[10px]">{log.data}</span>
                              </div>
                              <p className="text-[9px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <MapPin size={10} /> {log.siteId}
                                {log.fuelAdded > 0 && <span className="text-green-400">| +{log.fuelAdded}L</span>}
                              </p>
                            </div>
                            <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold rounded-md uppercase text-[8px] animate-pulse whitespace-nowrap">
                              Pendente
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SYNCED LOGS (compact) */}
                  {synced.length > 0 && (
                    <div>
                      <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1 pl-1">
                        Sincronizados ({synced.length})
                      </div>
                      <div className="space-y-1">
                        {synced.slice(0, 3).map((log) => (
                          <div key={log.id} className="p-1.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-bold text-gray-300 text-[10px]">{log.machineId}</span>
                              <span className="text-gray-500 dark:text-gray-400 text-[10px]">{log.data}</span>
                            </div>
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-md uppercase text-[8px] whitespace-nowrap">
                              OK
                            </span>
                          </div>
                        ))}
                        {synced.length > 3 && (
                          <p className="text-[9px] text-gray-500 dark:text-gray-400 italic pl-1">+{synced.length - 3} já sincronizados</p>
                        )}
                      </div>
                    </div>
                  )}

                  {all.length === 0 && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 italic pl-2">Nenhuma parte diária em cache local.</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* QR Scanner Modal (offline-first) */}
      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        mockItems={scannerMockItems}
        title="Escanear QR da Máquina"
        description="Aponte a câmera para o QR Code colado no equipamento ou use a gaveta de teste."
      />

      {/* Start Shift Modal — asks for horimetro inicial */}
      <StartShiftModal
        open={!!scannedCode}
        scannedCode={scannedCode}
        machineLookup={machineLookup}
        previousHorimetro={previousHorimetro}
        previousEndDate={previousEndDate}
        onClose={() => {
          setScannedCode(null);
          setPreviousHorimetro(null);
          setPreviousEndDate(null);
        }}
        onConfirm={handleStartShift}
      />

      {/* Shift creation error banner */}
      {shiftCreationError && (
        <div className="fixed bottom-4 right-4 z-50 p-3 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2 shadow-lg">
          <AlertTriangle size={14} />
          <span>{shiftCreationError}</span>
          <button
            type="button"
            onClick={() => setShiftCreationError(null)}
            className="ml-2 px-2 py-0.5 bg-red-500/20 hover:bg-red-500/30 rounded text-[10px] font-bold uppercase"
          >
            Fechar
          </button>
        </div>
      )}

    </div>
  );
}

export default OfflineFormPanel;
