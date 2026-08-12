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
  QrCode,
  Play,
  Square,
  Clock,
  History,
  Plus,
} from 'lucide-react';
import { localDb } from '@/lib/localDb';
import { syncEngine, SyncStatusReport } from '@/lib/syncEngine';
import { compressImage } from '@/lib/imageCompression';
import { genId, parseDecimal } from '@/lib/utils';
import { useShiftStore } from '@/store/shiftStore';
import { QrScannerModal, QrScannerMockItem } from './QrScannerModal';
import { StartShiftModal } from './StartShiftModal';
import { EndShiftModal } from './EndShiftModal';
import { useShiftFeedback } from './ShiftFeedbackProvider';
import { playError, unlockAudio } from '@/lib/audioFeedback';
import { useClockGuard } from './ClockGuard';
import {
  trustedDayString as trustedDayStringImport,
  trustedNowIso as trustedNowIsoImport,
} from '@/lib/trustedClock';

// Rótulos legíveis dos itens de vistoria (compartilhados entre validação e render).
const CHECKLIST_LABELS: Record<string, string> = {
  motor: 'Sistema do Motor',
  hidraulica: 'Mecanismos Hidráulicos',
  eletrica: 'Parte Elétrica',
  freios: 'Freios de Emergência',
  pneus_lagartas: 'Pneus / Lagartas',
  luzes: 'Faróis e Iluminação',
  nivel_oleo: 'Nível de Óleo / Arrefecimento',
  vazamentos: 'Filtros e Vazamento'
};

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
  const openTurno = useShiftStore((s) => s.openTurno);
  const addMachine = useShiftStore((s) => s.addMachine);
  const closeMachine = useShiftStore((s) => s.closeMachine);
  const endTurno = useShiftStore((s) => s.endTurno);
  const turno = useShiftStore((s) => s.turno);
  const activeShift = useShiftStore((s) => s.activeShift);
  const feedback = useShiftFeedback();

  // Proteção contra registro com data/hora adulterada no relógio do aparelho.
  // Quando o drift entre o relógio do device e o servidor Supabase ultrapassa
  // o limite severo (>1h), o submit é bloqueado com mensagem clara.
  // O backend (trigger no Postgres) é a camada final de autoridade — ele sempre
  // sobrescreve `criado_em` com `now()` real do servidor.
  const { blocksSubmits: clockBlocked, severity: clockSeverity, driftMs } =
    useClockGuard();

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

  // Verification item answers — null = ainda não respondido (obrigatório na abertura de turno)
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, 'bom' | 'reparar' | 'critico' | null>>({
    motor: null,
    hidraulica: null,
    eletrica: null,
    freios: null,
    pneus_lagartas: null,
    luzes: null,
    nivel_oleo: null,
    vazamentos: null
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

  // Rastreia se havia máquina ativa na renderização anterior (para detectar encerramento).
  const lastActiveShiftRef = useRef(false);

  // Quando uma máquina é encerrada (aqui, no banner ou via "Adicionar máquina")
  // e o formulário volta a permitir seleção, limpamos máquina/vistoria/fotos
  // e os horímetros — deixando os campos livres para a próxima máquina.
  useEffect(() => {
    if (!activeShift && lastActiveShiftRef.current) {
      setMachineId('');
      setChecklistAnswers({
        motor: null,
        hidraulica: null,
        eletrica: null,
        freios: null,
        pneus_lagartas: null,
        luzes: null,
        nivel_oleo: null,
        vazamentos: null,
      });
      setPhotos([]);
      if (horimetroInicialRef.current) horimetroInicialRef.current.value = '';
      if (horimetroFinalRef.current) horimetroFinalRef.current.value = '';
      if (fuelAddedRef.current) fuelAddedRef.current.value = '';
      if (commentsRef.current) commentsRef.current.value = '';
    }
    lastActiveShiftRef.current = !!activeShift;
  }, [activeShift]);

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

  // Unified form submit: routes between three modes based on active shift + filled fields.
  //   * OPEN  — no active shift, horimetroFinal empty          → rascunho + openTurno()/addMachine()
  //   * FULL  — no active shift, horimetroFinal filled         → create closed record + checklist
  //   * CLOSE — active shift exists, horimetroFinal required    → update rascunho → fechado
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    unlockAudio(); // first user gesture — guarantees future audio plays

    // ⚠️ Bloqueio contra data adulterada no relógio do aparelho.
    // Se o drift entre o relógio do device e o do servidor for severo
    // (severity === 'block'), o turno não é gravado.
    if (clockBlocked) {
      playError();
      feedback.showWithSound({
        kind: 'error',
        title: 'Registro BLOQUEADO — relógio do aparelho adulterado',
        subtitle:
          'Detectamos que a data/hora do aparelho está muito diferente do servidor.',
        errorMessage:
          `Drift: ${typeof driftMs === 'number' ? Math.round(driftMs / 1000) : '?'}s. ` +
          'Ative "Data e hora automáticas" nas configurações do aparelho e toque em "Revalidar" no banner.',
      });
      return;
    }

    const operatorId = currentUserProfile?.id;
    if (!operatorId) {
      playError();
      feedback.showWithSound({
        kind: 'error',
        title: 'Operador não identificado',
        subtitle: 'Faça login novamente.',
        errorMessage: 'Não foi possível carregar o perfil do operador.',
      });
      return;
    }

    const horimetroInicial = parseDecimal(horimetroInicialRef.current?.value);
    const horimetroFinalStr = (horimetroFinalRef.current?.value || '').trim();
    // Accepts both "30,5" (pt-BR) and "30.5" — parseFloat would truncate at the comma.
    const horimetroFinalParsed = parseDecimal(horimetroFinalStr);
    const horimetroFinal = horimetroFinalStr === '' ? NaN : horimetroFinalParsed;
    const fuelAdded = parseDecimal(fuelAddedRef.current?.value || 0);
    const observations = commentsRef.current?.value || '';

    // Refuse to start/open a machine while a machine is already being worked.
    if (activeShift && turno?.operatorId === operatorId && activeShift.machineId !== machineId) {
      playError();
      feedback.showWithSound({
        kind: 'error',
        title: 'Já existe uma máquina em uso',
        subtitle: `Encerre a máquina ${activeShift.machineId} antes de iniciar outra.`,
        errorMessage: 'Toque em "Adicionar máquina" abaixo dos horímetros para trocar de equipamento.',
      });
      return;
    }

    const isClosing = !!activeShift && turno?.operatorId === operatorId;
    const wantsFullRecord = !isClosing && !turno && horimetroFinalStr !== '' && Number.isFinite(horimetroFinal);

    // ⚠️ Usa a data/hora "confiável" (do servidor, com cache local). Se nunca
    // conseguimos medir online, cai no fallback do device. De qualquer jeito, o
    // trigger do Postgres sobrescreve `criado_em` com `now()` real na hora de
    // sincronizar.
    const today = trustedDayStringImport();
    const nowIso = trustedNowIsoImport();

    try {
      // ---------------------------------------------------------------
      // MODE 1 — CLOSE  (active shift exists)
      // ---------------------------------------------------------------
      if (isClosing) {
        if (!Number.isFinite(horimetroFinal) || horimetroFinal < activeShift!.horimetroInicial) {
          playError();
          feedback.showWithSound({
            kind: 'error',
            title: 'Horímetro final inválido',
            subtitle: `Deve ser maior ou igual a ${activeShift!.horimetroInicial}.`,
            errorMessage: `Valor recebido: ${horimetroFinalStr || '(vazio)'}. Confira o painel da máquina e tente de novo.`,
          });
          return;
        }

        const horaFim = trustedNowIsoImport();

        // Update the existing rascunho with the close data
        await localDb.registrosDiarios.update(activeShift!.id, {
          horimetroFinal,
          fuelAdded,
          observations,
          status: 'fechado',
          horaFim,
          fechadoEm: horaFim,
          synced: 0,
          photos: [...photos],
          clock_skew_ms: typeof driftMs === 'number' ? driftMs : null,
          clock_skew_suspect: clockSeverity !== 'ok' ? 1 as const : 0 as const,
        });

        // Persist the checklist as a separate record
        const hasCritical = Object.values(checklistAnswers).some((val) => val === 'critico');
        const hasRepair = Object.values(checklistAnswers).some((val) => val === 'reparar');
        const checklistStatus: 'aprovado' | 'atencao' | 'critico' = hasCritical
          ? 'critico'
          : hasRepair
          ? 'atencao'
          : 'aprovado';
        const sanitizedAnswers = Object.fromEntries(
          Object.entries(checklistAnswers).map(([k, v]) => [k, v ?? 'bom'])
        );

        await localDb.checklists.add({
          id: genId(),
          machineId: activeShift!.machineId,
          supervisorId: operatorId,
          data: today,
          horaEntrada: new Date(activeShift!.startedAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          horaSaida: new Date(horaFim).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          horimetro: horimetroFinal,
          status: checklistStatus,
          answers: sanitizedAnswers,
          synced: 0,
          observacoes: observations,
          defectPhotos: [...photos],
        });

        await syncEngine.countPendingRecords();
        await syncEngine.runSync();

        const delta = Number((horimetroFinal - activeShift!.horimetroInicial).toFixed(1));
        const duracaoMs = new Date(horaFim).getTime() - new Date(activeShift!.startedAt).getTime();
        const duracaoHoras = duracaoMs / 3_600_000;
        const duracaoFmt = `${Math.floor(duracaoHoras)}h ${String(Math.round((duracaoHoras % 1) * 60)).padStart(2, '0')}min`;

        feedback.showWithSound({
          kind: 'close',
          title: 'Turno Fechado!',
          subtitle: 'Registro salvo no aparelho e sincronizado com o servidor.',
          details: [
            { label: 'Máquina', value: activeShift!.machineId },
            {
              label: 'Horímetro',
              value: `${activeShift!.horimetroInicial} → ${horimetroFinal}`,
              emphasis: 'highlight',
            },
            { label: 'Trabalhadas', value: `${delta}h • ${duracaoFmt}` },
            ...(fuelAdded > 0 ? [{ label: 'Combustível', value: `${fuelAdded} L` }] : []),
            ...(checklistStatus !== 'aprovado'
              ? [{ label: 'Vistoria', value: checklistStatus.toUpperCase(), emphasis: 'highlight' as const }]
              : []),
          ],
        });

        endTurno();
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 5000);
        resetManualForm();
        loadRecentLogs();
        return;
      }

      // ---------------------------------------------------------------
      // MODE 2 — FULL  (no active shift, final already filled)
      // Treat as a single-submit complete record (legacy behavior).
      // ---------------------------------------------------------------
      if (wantsFullRecord) {
        if (!machineId) {
          playError();
          feedback.showWithSound({
            kind: 'error',
            title: 'Selecione a máquina',
            errorMessage: 'Escolha a máquina no menu superior antes de salvar.',
          });
          return;
        }
        if (!Number.isFinite(horimetroInicial) || horimetroInicial < 0) {
          playError();
          feedback.showWithSound({
            kind: 'error',
            title: 'Horímetro inicial inválido',
            errorMessage: 'Digite o valor que aparece no painel da máquina no início do serviço.',
          });
          return;
        }
        if (horimetroFinal < horimetroInicial) {
          playError();
          feedback.showWithSound({
            kind: 'error',
            title: 'Horímetro final menor que o inicial',
            subtitle: `Inicial: ${horimetroInicial} • Final: ${horimetroFinal}`,
            errorMessage: 'Confira os valores digitados. O final não pode ser menor que o inicial.',
          });
          return;
        }

        const hasCritical = Object.values(checklistAnswers).some((val) => val === 'critico');
        const hasRepair = Object.values(checklistAnswers).some((val) => val === 'reparar');
        const status: 'aprovado' | 'atencao' | 'critico' = hasCritical
          ? 'critico'
          : hasRepair
          ? 'atencao'
          : 'aprovado';
        const sanitizedAnswers = Object.fromEntries(
          Object.entries(checklistAnswers).map(([k, v]) => [k, v ?? 'bom'])
        );

        const recordId = genId();

        const newChecklist = {
          id: recordId,
          machineId,
          supervisorId: operatorId,
          data: today,
          horaEntrada: '07:00',
          horaSaida: '17:00',
          horimetro: horimetroFinal,
          status,
          answers: sanitizedAnswers,
          synced: 0,
          observacoes: observations,
          defectPhotos: [...photos],
        };

        const newDailyLog = {
          id: recordId,
          operatorId,
          machineId,
          siteId:
            siteId ||
            (typeof sites[0] === 'string' ? sites[0] : (sites[0] as any)?.id || (sites[0] as any)?.nome || (sites[0] as any)?.name) ||
            '',
          data: today,
          horimetroInicial,
          horimetroFinal,
          status: 'fechado' as const,
          fuelAdded,
          observations,
          synced: 0,
          photos: [...photos],
          horaInicio: nowIso,
          horaFim: nowIso,
          fechadoEm: nowIso,
          // Marca o registro pra revisão manual quando havia drift mensurável
          // no momento do submit. O backend usa `criado_em = now()` autoritativo,
          // então mesmo que o front esteja errado, a auditoria pega.
          clock_skew_ms: typeof driftMs === 'number' ? driftMs : null,
          clock_skew_suspect: clockSeverity !== 'ok' ? 1 as const : 0 as const,
        };

        await localDb.checklists.add(newChecklist);
        await localDb.registrosDiarios.add(newDailyLog);
        await syncEngine.countPendingRecords();
        await syncEngine.runSync();

        const delta = Number((horimetroFinal - horimetroInicial).toFixed(1));

        feedback.showWithSound({
          kind: 'close',
          title: 'Turno Salvo!',
          subtitle: 'Registro completo gravado no aparelho e sincronizado.',
          details: [
            { label: 'Máquina', value: machineId },
            { label: 'Horímetro', value: `${horimetroInicial} → ${horimetroFinal}`, emphasis: 'highlight' },
            { label: 'Trabalhadas', value: `${delta}h` },
            ...(fuelAdded > 0 ? [{ label: 'Combustível', value: `${fuelAdded} L` }] : []),
            ...(status !== 'aprovado'
              ? [{ label: 'Vistoria', value: status.toUpperCase(), emphasis: 'highlight' as const }]
              : []),
          ],
        });

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 5000);
        resetManualForm();
        loadRecentLogs();
        return;
      }

      // ---------------------------------------------------------------
      // MODE 3 — OPEN  (no active shift, no final filled)
      // Create rascunho + openTurno()/addMachine().
      // ---------------------------------------------------------------
      if (!machineId) {
        playError();
        feedback.showWithSound({
          kind: 'error',
          title: 'Selecione a máquina',
          subtitle: 'Escolha a máquina no menu superior antes de abrir o turno.',
          errorMessage: 'O turno não foi aberto.',
        });
        return;
      }
      if (!Number.isFinite(horimetroInicial) || horimetroInicial < 0) {
        playError();
        feedback.showWithSound({
          kind: 'error',
          title: 'Horímetro inicial inválido',
          errorMessage: 'Digite o valor que aparece no painel da máquina.',
        });
        return;
      }

      // Vistoria sensível é PRÉ-REQUISITO para abrir o turno.
      const unansweredItems = Object.keys(checklistAnswers).filter((k) => !checklistAnswers[k]);
      if (unansweredItems.length > 0) {
        playError();
        feedback.showWithSound({
          kind: 'error',
          title: 'Complete os itens de vistoria',
          subtitle: `${unansweredItems.length} item(ns) ainda sem status.`,
          errorMessage: `Selecione Bom / Reparo / Avaria em: ${unansweredItems
            .map((k) => CHECKLIST_LABELS[k] || k)
            .join(', ')} para abrir o turno.`,
        });
        return;
      }

      const recordId = genId();
      const rascunho = {
        id: recordId,
        operatorId,
        machineId,
        siteId:
          siteId ||
          (typeof sites[0] === 'string' ? sites[0] : (sites[0] as any)?.id || (sites[0] as any)?.nome || (sites[0] as any)?.name) ||
          '',
        data: today,
        horimetroInicial,
        // horimetroFinal left undefined until the operator closes the shift.
        fuelAdded: 0,
        observations: '',
        status: 'rascunho' as const,
        synced: 0,
        photos: [...photos],
        horaInicio: nowIso,
        clock_skew_ms: typeof driftMs === 'number' ? driftMs : null,
        clock_skew_suspect: clockSeverity !== 'ok' ? 1 as const : 0 as const,
      };

      await localDb.registrosDiarios.add(rascunho);

      // Grava a vistoria sensível feita na abbertura do turno.
      const hasCritical = Object.values(checklistAnswers).some((val) => val === 'critico');
      const hasRepair = Object.values(checklistAnswers).some((val) => val === 'reparar');
      const checklistStatus: 'aprovado' | 'atencao' | 'critico' = hasCritical
        ? 'critico'
        : hasRepair
        ? 'atencao'
        : 'aprovado';
      const sanitizedAnswers = Object.fromEntries(
        Object.entries(checklistAnswers).map(([k, v]) => [k, v ?? 'bom'])
      );
      await localDb.checklists.add({
        id: genId(),
        machineId,
        supervisorId: operatorId,
        data: today,
        horaEntrada: new Date(nowIso).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        horimetro: horimetroInicial,
        status: checklistStatus,
        answers: sanitizedAnswers,
        synced: 0,
        observacoes: observations,
        defectPhotos: [...photos],
      });
      await syncEngine.countPendingRecords();

      const machine = (machines || []).find((m) => m.id === machineId);
      const machineSegment = {
        id: recordId,
        machineId,
        machineName: machine?.name || '',
        startedAt: nowIso,
        horimetroInicial,
      };

      // Primeira máquina do dia → abre a jornada. Máquina seguinte,
      // ainda dentro do expediente → só adiciona o segmento novo.
      if (turno) {
        addMachine(machineSegment);
      } else {
        openTurno(
          {
            id: genId(),
            operatorId,
            operatorName: currentUserProfile.nome,
            siteId: rascunho.siteId,
            data: today,
            startedAt: nowIso,
          },
          machineSegment
        );
      }

      feedback.showWithSound({
        kind: 'open',
        title: turno ? 'Nova Máquina Aberta!' : 'Turno Aberto!',
        subtitle: turno
          ? 'Máquina registrada na jornada de hoje. Troque/adicione quando precisar.'
          : 'Operação registrada. Encerre ao final do dia.',
        details: [
          { label: 'Máquina', value: machineId },
          { label: 'Horímetro inicial', value: String(horimetroInicial), emphasis: 'highlight' },
          {
            label: 'Entrada',
            value: new Date(nowIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      });

      // Don't fully reset — keep machine/site/checklist so the user can come back
      // and only fill the close fields. But clear the inputs.
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
      if (horimetroInicialRef.current) horimetroInicialRef.current.value = '';
      if (fuelAddedRef.current) fuelAddedRef.current.value = '';
      if (commentsRef.current) commentsRef.current.value = '';
      setPhotos([]);
      loadRecentLogs();
    } catch (err: any) {
      console.error('Falha ao salvar registro:', err);
      playError();
      feedback.showWithSound({
        kind: 'error',
        title: 'Erro ao salvar registro',
        subtitle: 'O registro NÃO foi gravado. Tente novamente.',
        errorMessage: err?.message || String(err),
      });
    }
  };

  const resetManualForm = () => {
    setMachineId('');
    setSiteId('');
    setChecklistAnswers({
      motor: null,
      hidraulica: null,
      eletrica: null,
      freios: null,
      pneus_lagartas: null,
      luzes: null,
      nivel_oleo: null,
      vazamentos: null,
    });
    setPhotos([]);
    if (horimetroInicialRef.current) horimetroInicialRef.current.value = '';
    if (horimetroFinalRef.current) horimetroFinalRef.current.value = '';
    if (fuelAddedRef.current) fuelAddedRef.current.value = '';
    if (commentsRef.current) commentsRef.current.value = '';
  };

  // ---------------------------------------------------------------------
  // QR Scan flow
  // ---------------------------------------------------------------------
  const scannerMockItems: QrScannerMockItem[] = React.useMemo(() => {
    return (machines || []).map((m) => ({
      code: `CODELMAQ-EQ-${m.id}`,
      title: m.id,
      subtitle: m.name || m.type,
      tag: m.type,
      payload: {
        id: m.id,
        nome: m.name,
        type: 'machine' as const,
      },
    }));
  }, [machines]);

  // Previous shift data — auto-fills initial horimetro on the next start
  const [previousHorimetro, setPreviousHorimetro] = useState<number | null>(null);
  const [previousEndDate, setPreviousEndDate] = useState<string | null>(null);

  const handleScan = (code: string) => {
    setScannerOpen(false);
    setShiftCreationError(null);
    if (activeShift) {
      playError();
      feedback.showWithSound({
        kind: 'error',
        title: 'Máquina já em uso',
        subtitle: `Encerre a máquina ${activeShift.machineId} antes de iniciar outra.`,
        errorMessage: 'Toque em "Adicionar máquina" abaixo dos horímetros para trocar de equipamento.',
      });
      return;
    }
    const machineIdFromCode = code.replace(/^CODELMAQ-EQ-/, '');
    setScannedCode(code);
    // Look up the most recent closed shift for this machine to pre-fill the initial horimetro
    lookupLastShift(machineIdFromCode);
  };

  const lookupLastShift = async (machineId: string, fillInput = false) => {
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
        // We already filtered to ensure horimetroFinal is a number.
        const finalValue = closed[0].horimetroFinal as number;
        setPreviousHorimetro(finalValue);
        setPreviousEndDate(closed[0].data || null);
        if (fillInput && horimetroInicialRef.current) {
          horimetroInicialRef.current.value = String(finalValue);
        }
      } else {
        setPreviousHorimetro(null);
        setPreviousEndDate(null);
        if (fillInput && horimetroInicialRef.current) {
          horimetroInicialRef.current.value = '';
        }
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
        playError();
        feedback.showWithSound({
          kind: 'error',
          title: 'Usuário não identificado',
          subtitle: 'Faça login novamente para abrir um turno.',
          errorMessage: 'Sessão expirada ou operador sem perfil carregado.',
        });
        return;
      }

      // Find machine record from props (fall back to id only)
      const machine = (machines || []).find((m) => m.id === data.machineId);
      const nowIso = trustedNowIsoImport();
      const todayStr = nowIso.split('T')[0];

      // Create a rascunho registro_diario tied to the user's first site
      const newDailyLog = {
        id: genId(),
        date: todayStr,
        data: todayStr,
        time: nowIso.slice(11, 16),
        machineId: data.machineId,
        machineName: data.machineName || machine?.name || '',
        machineType: machine?.type || '',
        operatorId: currentUserProfile.id,
        operatorName: currentUserProfile.nome,
        siteId: (typeof sites[0] === 'string' ? sites[0] : (sites[0] as any)?.id || (sites[0] as any)?.nome || (sites[0] as any)?.name) || '',
        horimetroInicial: data.horimetroInicial,
        // horimetroFinal intentionally left undefined until the shift is closed.
        fuelAdded: 0,
        observations: '',
        status: 'rascunho' as const,
        createdAt: nowIso,
        updatedAt: nowIso,
        horaInicio: data.horaInicio,
        photos: [],
        synced: 0,
        syncFailed: 0,
      };

      await localDb.registrosDiarios.add(newDailyLog);
      await syncEngine.countPendingRecords();

      const machineSegment = {
        id: newDailyLog.id,
        machineId: newDailyLog.machineId,
        machineName: newDailyLog.machineName,
        startedAt: nowIso,
        horimetroInicial: newDailyLog.horimetroInicial,
      };

      if (turno) {
        addMachine(machineSegment);
      } else {
        openTurno(
          {
            id: genId(),
            operatorId: currentUserProfile.id,
            operatorName: currentUserProfile.nome,
            siteId: newDailyLog.siteId,
            data: todayStr,
            startedAt: nowIso,
          },
          machineSegment
        );
      }

      // Pre-select the machine in the form
      setMachineId(data.machineId);

      // Clear prefill state so the next scan re-queries fresh
      setPreviousHorimetro(null);
      setPreviousEndDate(null);

      setScannedCode(null);

      // Big visual + audio confirmation
      feedback.showWithSound({
        kind: 'open',
        title: turno ? 'Nova Máquina Aberta!' : 'Turno Aberto!',
        subtitle: turno
          ? 'Máquina registrada na jornada de hoje. Troque/adicione quando precisar.'
          : 'Operação registrada no aparelho. Encerre ao final do dia.',
        details: [
          { label: 'Máquina', value: data.machineId },
          {
            label: 'Horímetro inicial',
            value: String(data.horimetroInicial),
            emphasis: 'highlight',
          },
          {
            label: 'Entrada',
            value: new Date(data.horaInicio).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ],
      });
    } catch (e: any) {
      console.error('Erro ao iniciar turno:', e);
      playError();
      feedback.showWithSound({
        kind: 'error',
        title: 'Erro ao abrir turno',
        subtitle: 'O turno NÃO foi criado. Tente novamente.',
        errorMessage: e?.message || String(e),
      });
    }
  };

  const machineLookup = React.useCallback(
    (id: string) => {
      const m = (machines || []).find((x) => x.id === id);
      return m ? { id: m.id, name: m.name, type: m.type, plate: (m as any).plate } : undefined;
    },
    [machines],
  );

  // ---------------------------------------------------------------------
  // "Adicionar máquina" — troca de equipamento dentro da jornada.
  // Exige o horímetro final da máquina atual (se ainda não anotado) e então
  // encerra o segmento atual (jornada continua aberta) liberando os campos
  // para a próxima máquina.
  // ---------------------------------------------------------------------
  const [switchModalOpen, setSwitchModalOpen] = useState(false);

  const handleAddMachine = () => {
    if (!turno) {
      playError();
      feedback.showWithSound({
        kind: 'error',
        title: 'Nenhum turno aberto',
        subtitle: 'Abra o turno da primeira máquina do dia antes de adicionar outra.',
        errorMessage: 'Toque em "Abrir Turno" com a máquina e o horímetro inicial preenchidos.',
      });
      return;
    }
    if (activeShift) {
      // Há máquina em uso → o sistema exige anotar o final atual antes de liberar.
      setSwitchModalOpen(true);
    } else {
      // Jornada aberta sem máquina em uso — os campos já estão livres.
      feedback.showWithSound({
        kind: 'success',
        title: 'Selecione a nova máquina',
        subtitle: 'Os campos estão livres. Escolha a máquina no menu superior e preencha o horímetro inicial.',
      });
    }
  };

  const confirmSwitchMachine = async (data: { horimetroFinal: number; fuelAdded: number; observations: string }) => {
    if (!activeShift) return;
    const horaInicioMs = new Date(activeShift.startedAt).getTime();
    try {
      if (!Number.isFinite(data.horimetroFinal) || data.horimetroFinal < activeShift.horimetroInicial) {
        playError();
        feedback.showWithSound({
          kind: 'error',
          title: 'Horímetro final inválido',
          subtitle: `O valor precisa ser maior ou igual a ${activeShift.horimetroInicial}.`,
          errorMessage: `Valor recebido: ${data.horimetroFinal}. Verifique o painel da máquina.`,
        });
        return;
      }

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
      await syncEngine.countPendingRecords();
      await syncEngine.runSync();

      const delta = Number((data.horimetroFinal - activeShift.horimetroInicial).toFixed(1));
      const duracaoHoras = (Date.now() - horaInicioMs) / 3_600_000;
      const duracaoFmt = `${Math.floor(duracaoHoras)}h ${String(Math.round((duracaoHoras % 1) * 60)).padStart(2, '0')}min`;

      feedback.showWithSound({
        kind: 'close',
        title: 'Máquina Encerrada!',
        subtitle: 'Segmento salvo. A jornada continua aberta — escolha a próxima máquina.',
        details: [
          { label: 'Máquina', value: activeShift.machineId },
          {
            label: 'Horímetro',
            value: `${activeShift.horimetroInicial} → ${data.horimetroFinal}`,
            emphasis: 'highlight',
          },
          { label: 'Trabalhadas', value: `${delta}h • ${duracaoFmt}` },
          ...(data.fuelAdded > 0 ? [{ label: 'Combustível', value: `${data.fuelAdded} L` }] : []),
        ],
      });

      // Encerra o segmento da máquina atual — a jornada (turno) permanece.
      closeMachine();
      setSwitchModalOpen(false);
      loadRecentLogs();
    } catch (e: any) {
      console.error('Erro ao encerrar máquina para troca:', e);
      playError();
      feedback.showWithSound({
        kind: 'error',
        title: 'Erro ao encerrar máquina',
        subtitle: 'O registro não foi salvo.',
        errorMessage: e?.message || String(e),
      });
    } finally {
      setSwitchModalOpen(false);
    }
  };

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
          {/* Anti-clock-tampering strip: aparece quando o drift está nas zonas
              'warn' ou 'block'. No modo 'block', o submit já é recusado em código,
              então aqui só mostramos o aviso visual pra deixar claro o motivo. */}
          {clockSeverity !== 'ok' && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 text-xs md:text-sm ${
                clockBlocked
                  ? 'bg-red-500/15 border-red-500/50 text-red-700 dark:text-red-300'
                  : 'bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-200'
              }`}
            >
              <Clock size={16} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-black uppercase tracking-wider text-[10px] md:text-[11px]">
                  {clockBlocked
                    ? 'Submit bloqueado: relógio do aparelho adulterado'
                    : 'Atenção: relógio do aparelho divergente do servidor'}
                </p>
                <p className="text-[11px] md:text-xs mt-0.5 opacity-90">
                  Drift detectado: {typeof driftMs === 'number' ? Math.round(driftMs / 60000) : '?'} min.
                  {clockBlocked
                    ? ' Ative "Data e hora automáticas" no aparelho e revalide no banner superior.'
                    : ' Recomendamos ativar a data automática nas configurações.'}
                </p>
              </div>
            </div>
          )}

          {/* Mode banner — tells the operator what the next submit will do. */}
          {(() => {
            const horimetroFinalLive = (horimetroFinalRef.current?.value || '').trim();
            const isClosing = !!activeShift && turno?.operatorId === currentUserProfile?.id;
            const wantsFull = !isClosing && !turno && horimetroFinalLive !== '';
            const mode = isClosing ? 'close' : wantsFull ? 'full' : 'open';
            const MODE_CONFIG = {
              open: {
                bg: 'bg-emerald-500/10 border-emerald-500/40',
                text: 'text-emerald-700 dark:text-emerald-300',
                icon: <Play size={16} fill="currentColor" />,
                title: turno ? 'MODO NOVA MÁQUINA' : 'MODO ABERTURA',
                subtitle: isClosing
                  ? undefined
                  : turno
                  ? 'Escolha a nova máquina e preencha o horímetro inicial para adicioná-la à jornada de hoje.'
                  : 'Preencha máquina, obra, horímetro inicial e checklist. Deixe o horímetro final em branco para abrir o turno.',
              },
              full: {
                bg: 'bg-blue-500/10 border-blue-500/40',
                text: 'text-blue-700 dark:text-blue-300',
                icon: <CheckCircle size={16} />,
                title: 'MODO REGISTRO COMPLETO',
                subtitle: 'Você preencheu horímetro final. Este submit cria um registro fechado de uma vez só (sem ficar em aberto).',
              },
              close: {
                bg: 'bg-blue-500/10 border-blue-500/40',
                text: 'text-blue-700 dark:text-blue-300',
                icon: <Square size={14} fill="currentColor" />,
                title: 'MODO FECHAMENTO',
                subtitle: activeShift
                  ? `Turno da máquina ${activeShift.machineId} em andamento desde ${new Date(activeShift.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Preencha o horímetro final e clique em Encerrar Turno.`
                  : 'Encerre o turno atual.',
              },
            } as const;
            const cfg = MODE_CONFIG[mode];
            return (
              <div className={`p-3 ${cfg.bg} border ${cfg.text} rounded-xl flex items-start gap-2 text-xs md:text-sm`}>
                <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase tracking-wider text-[11px]">{cfg.title}</p>
                  {cfg.subtitle && <p className="opacity-90 mt-0.5">{cfg.subtitle}</p>}
                </div>
              </div>
            );
          })()}

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
                onChange={(e) => {
                  setMachineId(e.target.value);
                  if (e.target.value) lookupLastShift(e.target.value, true);
                }}
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
                  <option key={st.id || idx} value={st.id || st.nome || st.name || st}>
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
                  type="text"
                  inputMode="decimal"
                  ref={horimetroInicialRef}
                  onInput={(e) => {
                    // Strip anything that isn't a digit/comma/period so pt-BR "30,5"
                    // works. Input is uncontrolled, so direct DOM write is safe.
                    const original = e.currentTarget.value;
                    const cleaned = original.replace(/[^\d.,-]/g, '');
                    if (cleaned !== original) e.currentTarget.value = cleaned;
                    setPreviousHorimetro(null);
                    setPreviousEndDate(null);
                  }}
                  placeholder="Ex: 1450"
                  className="w-full bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-4 md:p-2.5 pl-12 md:pl-9 text-xl md:text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono font-bold"
                />
              </div>
              {previousHorimetro !== null && (
                <span className="text-[11px] md:text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 flex items-center gap-1">
                  <History size={12} className="flex-shrink-0" />
                  Pré-preenchido com o final do último turno
                  {previousEndDate ? ` (${previousEndDate})` : ''}:{' '}
                  <b className="font-mono">{previousHorimetro}</b>. Confira no painel da máquina.
                </span>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-base md:text-[10px] text-gray-800 dark:text-gray-300 uppercase font-bold tracking-wider">Horímetro / KM Final</label>
              <div className="relative">
                <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 md:top-2.5 md:translate-y-0 text-gray-600 dark:text-gray-300" size={20} />
                <input
                  type="text"
                  inputMode="decimal"
                  ref={horimetroFinalRef}
                  onInput={(e) => {
                    const original = e.currentTarget.value;
                    const cleaned = original.replace(/[^\d.,-]/g, '');
                    if (cleaned !== original) e.currentTarget.value = cleaned;
                  }}
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
                  type="text"
                  inputMode="decimal"
                  ref={fuelAddedRef}
                  onInput={(e) => {
                    const original = e.currentTarget.value;
                    const cleaned = original.replace(/[^\d.,-]/g, '');
                    if (cleaned !== original) e.currentTarget.value = cleaned;
                  }}
                  placeholder="0"
                  className="w-full bg-white dark:bg-black/50 border-2 border-gray-300 dark:border-white/10 rounded-xl p-4 md:p-2.5 pl-12 md:pl-9 text-xl md:text-xs text-gray-900 dark:text-white focus:border-[#eab308] outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-base md:text-[10px] text-gray-800 dark:text-gray-300 uppercase font-bold tracking-wider">
                Data do Diário {clockBlocked ? '(bloqueada)' : '(servidor)'}
              </label>
              <input
                type="text"
                disabled
                className="w-full bg-gray-100 dark:bg-[#151515]/5 border-2 border-gray-300 dark:border-white/5 rounded-xl p-4 md:p-2.5 text-xl md:text-xs text-gray-900 dark:text-gray-200 font-bold"
                value={(() => {
                  try {
                    const iso = trustedNowIsoImport();
                    const [y, m, d] = iso.split('T')[0].split('-');
                    return `${d}/${m}/${y}`;
                  } catch {
                    return new Date().toLocaleDateString('pt-BR');
                  }
                })()}
              />
            </div>
          </div>

          {/* Adicionar máquina — troca de equipamento dentro da jornada do dia. */}
          {turno && (
            <div className="flex justify-center md:justify-start">
              <button
                type="button"
                onClick={handleAddMachine}
                className="inline-flex items-center gap-1.5 text-xs md:text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10 border border-gray-300 dark:border-white/10 hover:border-emerald-500/50 rounded-full px-3.5 py-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} />
                Adicionar máquina
              </button>
            </div>
          )}

          {/* ITENS DE VISTORIA */}
          <div className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-3">
            <span className="text-sm md:text-xs font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
              <ClipboardList size={16} />
              ITENS DE VISTORIA SENSÍVEIS (SELECIONE O STATUS)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.keys(checklistAnswers).map((itemKey) => {
                const currentVal = checklistAnswers[itemKey];

                return (
                  <div key={itemKey} className="p-4 md:p-3 bg-white dark:bg-black/20 rounded-xl border-2 border-gray-300 dark:border-white/5 flex flex-col justify-between space-y-2.5">
                    <span className="text-base md:text-xs font-bold text-gray-900 dark:text-white">{CHECKLIST_LABELS[itemKey] || itemKey}</span>
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

          {/* Submit — button label adapts to the current mode */}
          <div className="pt-2 flex justify-end">
            {(() => {
              const horimetroFinalLive = (horimetroFinalRef.current?.value || '').trim();
              const isClosing = !!activeShift && turno?.operatorId === currentUserProfile?.id;
              const wantsFull = !isClosing && !turno && horimetroFinalLive !== '';
              const mode = isClosing ? 'close' : wantsFull ? 'full' : 'open';
              const BTN_CONFIG = {
                open: {
                  label: turno ? 'Abrir Nova Máquina' : 'Abrir Turno',
                  icon: <Play size={18} className="md:!size-3.5" fill="currentColor" />,
                  classes: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30',
                },
                full: {
                  label: 'Salvar Turno Completo',
                  icon: <CheckCircle size={18} className="md:!size-3.5" />,
                  classes: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30',
                },
                close: {
                  label: 'Encerrar Turno',
                  icon: <Square size={14} className="md:!size-3" fill="currentColor" />,
                  classes: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30',
                },
              } as const;
              const cfg = BTN_CONFIG[mode];
              return (
                <button
                  type="submit"
                  className={`w-full md:w-auto px-6 py-3 md:py-2.5 ${cfg.classes} font-bold font-heading rounded-xl cursor-pointer text-base md:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors`}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              );
            })()}
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

      {/* End Shift Modal (troca de máquina) — exige o final da máquina atual */}
      <EndShiftModal
        open={switchModalOpen}
        onClose={() => setSwitchModalOpen(false)}
        onConfirm={confirmSwitchMachine}
        title="Encerrar Máquina Atual"
        subtitle={
          activeShift
            ? `${activeShift.machineId}${activeShift.machineName ? ` — ${activeShift.machineName}` : ''} — a jornada continua aberta.`
            : 'A jornada continua aberta.'
        }
        confirmLabel="Salvar e Adicionar Outra"
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
