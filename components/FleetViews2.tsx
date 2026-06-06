"use client";
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Search, AlertTriangle, CheckCircle, MapPin, Clock,
  X, Sparkles, Loader2, Fuel, Trash2, Edit, Camera, Image as ImageIcon,
  Wrench, Gauge, Download, ShieldCheck
} from 'lucide-react';
import { StatusBadge, UrgencyBadge } from './ui/Badges';
import { generateWithGemini } from '@/lib/gemini';
import { defaultChecklistItems } from '@/lib/data';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateDailyLogsPDF } from '@/lib/pdfUtils';
import { genId, formatDateBR, safeTimeOf } from '@/lib/utils';

const formatOSId = (id: string) => {
  if (!id) return '';
  if (id.startsWith('OS-')) return id;
  if (id.includes('-')) return `OS-${id.split('-')[0].toUpperCase()}`;
  return `OS-${id.toUpperCase()}`;
};

const formatPDId = (id: string) => {
  if (!id) return '';
  if (id.startsWith('PD-')) return id;
  if (id.includes('-')) return `PD-${id.split('-')[0].toUpperCase()}`;
  return `PD-${id.toUpperCase()}`;
};

export const MaintenanceView = ({ maintenances, machines, onDeleteMaintenance, onAddMaintenance, isAdminAuthenticated }: any) => {
  const [aiModal, setAiModal] = useState({ isOpen: false, data: null as any, text: '', isLoading: false, error: '' });
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [isNewOSModalOpen, setIsNewOSModalOpen] = useState(false);

  const handleCreateOS = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const machineId = formData.get('machineId') as string;
    const machine = machines.find((m: any) => m.id === machineId);

    onAddMaintenance({
      id: genId(),
      machineId,
      type: machine?.type || 'Equipamento',
      date: formData.get('date'),
      description: formData.get('description'),
      type_maintenance: formData.get('type_maintenance'),
      status: 'Pendente',
      urgency: formData.get('urgency')
    });

    setIsNewOSModalOpen(false);
  };

  const handleGeneratePlan = async (m: any) => {
    setAiModal({ isOpen: true, data: m, text: '', isLoading: true, error: '' });
    const prompt = `Como um engenheiro mecânico sênior, crie um plano de ação passo a passo, recomendações de EPIs (Equipamentos de Proteção Individual) e liste os riscos potenciais para a seguinte manutenção em uma máquina de terraplanagem:\n\nEquipamento: ${m.type}\nOrdem de Serviço: ${m.id}\nProblema/Serviço: ${m.description}\nUrgência: ${m.urgency}\n\nResponda de forma clara e profissional.`;
    
    try {
      const text = await generateWithGemini(prompt);
      setAiModal(prev => ({ ...prev, text, isLoading: false }));
    } catch (error) {
      setAiModal(prev => ({ ...prev, error: 'Falha ao gerar o plano com IA. Tente novamente mais tarde.', isLoading: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Controle de Manutenção</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Abertura, acompanhamento e conclusão de ordens de serviço.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button 
            onClick={() => setIsNewOSModalOpen(true)}
            className="bg-black hover:bg-neutral-800 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-colors text-sm"
          >
            <Plus size={18} className="mr-2" />
            Nova OS
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#101010] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium border-b">Ordem de Serviço</th>
                <th className="p-4 font-medium border-b">Equipamento</th>
                <th className="p-4 font-medium border-b">Data Agendada</th>
                <th className="p-4 font-medium border-b">Descrição</th>
                <th className="p-4 font-medium border-b">Tipo</th>
                <th className="p-4 font-medium border-b">Urgência</th>
                <th className="p-4 font-medium border-b">Status</th>
                <th className="p-4 font-medium border-b text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {maintenances.map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:bg-[#101010]/50 transition-colors">
                  <td className="p-4 font-semibold text-gray-900 dark:text-gray-50">{formatOSId(m.id)}</td>
                  <td className="p-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-50">{m.machineId}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{m.type}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDateBR(m.date)}</td>
                  <td className="p-4 text-sm text-gray-700 dark:text-gray-200 max-w-xs truncate" title={m.description}>{m.description}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{m.type_maintenance}</td>
                  <td className="p-4"><UrgencyBadge urgency={m.urgency} /></td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      m.status === 'Concluída' ? 'bg-green-100 text-green-800' : 
                      m.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-100'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleGeneratePlan(m)}
                        className="inline-flex items-center px-2.5 py-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-md text-xs font-semibold transition-colors border border-yellow-200"
                        title="Gerar plano de ação com IA"
                      >
                        <Sparkles size={14} className="mr-1" /> Plano IA
                      </button>
                      {isAdminAuthenticated && (
                        <button 
                          onClick={() => setDeleteModal(m.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Excluir OS"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {maintenances.map((m: any) => (
            <div key={m.id} className="p-4 hover:bg-gray-50 dark:bg-[#101010]/50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-gray-900 dark:text-gray-50">{formatOSId(m.id)}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{formatDateBR(m.date)}</div>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    m.status === 'Concluída' ? 'bg-green-100 text-green-800' : 
                    m.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-100'
                  }`}>
                    {m.status}
                  </span>
                  {isAdminAuthenticated && (
                    <button 
                      onClick={() => setDeleteModal(m.id)}
                      className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mb-3">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-50">{m.machineId} <span className="text-gray-500 dark:text-gray-400 font-normal">({m.type})</span></div>
                <div className="text-sm text-gray-700 dark:text-gray-200 mt-1">{m.description}</div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-gray-100 dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-200 px-2 py-1 rounded text-xs">{m.type_maintenance}</span>
                <UrgencyBadge urgency={m.urgency} />
              </div>

              <button 
                onClick={() => handleGeneratePlan(m)}
                className="w-full inline-flex items-center justify-center px-3 py-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-md text-sm font-semibold transition-colors border border-yellow-200"
              >
                <Sparkles size={16} className="mr-2" /> Gerar Plano de Ação com IA
              </button>
            </div>
          ))}
          {maintenances.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhuma ordem de serviço cadastrada.</div>
          )}
        </div>
      </div>

      {aiModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-2xl max-w-[90vw] flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center space-x-2 text-yellow-700">
                <Sparkles size={24} />
                <h3 className="text-xl font-bold">Plano de Ação Inteligente</h3>
              </div>
              <button onClick={() => setAiModal({ isOpen: false, data: null, text: '', isLoading: false, error: '' })} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {aiModal.isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-yellow-600">
                  <Loader2 size={40} className="animate-spin mb-4" />
                  <p className="font-medium text-gray-600 dark:text-gray-300">A IA está elaborando o plano para a OS {formatOSId(aiModal.data?.id)}...</p>
                </div>
              ) : aiModal.error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
                  <AlertTriangle size={20} className="mr-2" />
                  {aiModal.error}
                </div>
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {aiModal.text}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#101010] rounded-b-xl flex justify-end">
              <button onClick={() => setAiModal({ isOpen: false, data: null, text: '', isLoading: false, error: '' })} className="px-4 py-2 bg-gray-200 text-gray-800 dark:text-gray-100 font-semibold rounded-md hover:bg-gray-300 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-md max-h-[90vh] max-w-[90vw] overflow-y-auto p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Excluir Ordem de Serviço?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Esta ação é irreversível. Deseja mesmo excluir a OS {formatOSId(deleteModal)}?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1e1e1e] font-semibold rounded-md hover:bg-gray-200">
                Cancelar
              </button>
              <button onClick={() => {
                onDeleteMaintenance(deleteModal);
                setDeleteModal(null);
              }} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewOSModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] max-w-[90vw] overflow-y-auto p-6 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Nova Ordem de Serviço</h3>
              <button onClick={() => setIsNewOSModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateOS} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Equipamento</label>
                  <select name="machineId" required className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500 dark:focus:ring-yellow-400 dark:focus:border-yellow-400">
                    <option value="">Selecione...</option>
                    {machines.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.id} - {m.type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data Agendada</label>
                  <input name="date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500 dark:focus:ring-yellow-400 dark:focus:border-yellow-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tipo de Manutenção</label>
                <select name="type_maintenance" required className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500 dark:focus:ring-yellow-400 dark:focus:border-yellow-400">
                  <option value="Corretiva">Corretiva</option>
                  <option value="Preventiva">Preventiva</option>
                  <option value="Preditiva">Preditiva</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Urgência</label>
                <select name="urgency" required className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500 dark:focus:ring-yellow-400 dark:focus:border-yellow-400">
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Descrição do Problema / Serviço</label>
                <textarea name="description" required rows={4} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500 dark:focus:ring-yellow-400 dark:focus:border-yellow-400" placeholder="Descreva o que precisa ser feito..."></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setIsNewOSModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1e1e1e] font-semibold rounded-md hover:bg-gray-200">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-neutral-800">
                  Criar Ordem de Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const dailyLogSchema = z.object({
  date: z.string().min(1, "A data é obrigatória"),
  machineId: z.string().min(1, "Selecione um equipamento"),
  operator: z.string().min(1, "Selecione o operador"),
  location: z.string().min(1, "Selecione a obra/local"),
  fuel: z.number().min(0, "Não pode ser negativo"),
  fuelSource: z.string().min(1, "Selecione a origem do combustível"),
  startHorimeter: z.number().min(0, "Não pode ser negativo"),
  endHorimeter: z.union([z.number().min(0, "Não pode ser negativo"), z.literal("")]).optional(),
  observations: z.string().optional(),
  checklist: z.record(z.string(), z.string()).optional(),
}).refine(data => {
  if (data.endHorimeter !== undefined && data.endHorimeter !== "" && data.endHorimeter !== null) {
    return Number(data.endHorimeter) >= data.startHorimeter;
  }
  return true;
}, {
  message: "O horímetro final deve ser maior ou igual ao inicial",
  path: ["endHorimeter"]
});

type DailyLogFormData = z.infer<typeof dailyLogSchema>;

export const DailyLogView = ({ logs = [], machines = [], employees = [], sites = [], onAddLog, onEditLog, onDeleteLog, isAdminAuthenticated }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiModal, setAiModal] = useState({ isOpen: false, text: '', isLoading: false, error: '' });
  
  const [formStartHorimeter, setFormStartHorimeter] = useState<string | number>('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  
  const [editingLog, setEditingLog] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, logId: null as any });
  const [openShiftConfirm, setOpenShiftConfirm] = useState({ isOpen: false, log: null as any });

  const getOperatorName = useCallback((id: string) => {
    if (!id) return '-';
    // Se já for um nome (legado), retorna ele mesmo
    if (id.length < 20 && !id.includes('-')) return id; 
    const emp = employees.find((e: any) => e.id === id);
    return emp ? emp.nome : id;
  }, [employees]);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<DailyLogFormData>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      fuel: 0,
      fuelSource: "Comboio",
      checklist: {}
    }
  });

  const filteredLogs = useMemo(() => {
    return logs.filter((l: any) => 
      (l.status === 'Concluído' || !l.status) && (
        l.machineId.toLowerCase().includes(searchTerm.toLowerCase()) || 
        getOperatorName(l.operator).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [logs, searchTerm, employees, getOperatorName]);

  const openLogs = useMemo(() => {
    return logs.filter((l: any) => l.status === 'Em Andamento');
  }, [logs]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Data', 'ID Registro', 'Equipamento', 'Operador', 
      'Abertura', 'Fechamento', 'Horas Maquina', 'Jornada Colaborador (h)'
    ];
    
    const rows = filteredLogs.map((log: any) => {
      const machineHours = log.endHorimeter - log.startHorimeter;
      
      let employeeHours = 0;
      if (log.openedAt && log.closedAt) {
        const start = new Date(log.openedAt).getTime();
        const end = new Date(log.closedAt).getTime();
        const diffMs = end - start;
        const diffHours = diffMs / (1000 * 60 * 60);
        // Descontando 1 hora de almoço
        employeeHours = Math.max(0, diffHours - 1);
      }
      
      return [
        formatDateBR(log.date),
        log.id,
        log.machineId,
        getOperatorName(log.operator),
        log.openedAt ? new Date(log.openedAt).toLocaleTimeString('pt-BR') : '-',
        log.closedAt ? new Date(log.closedAt).toLocaleTimeString('pt-BR') : '-',
        machineHours.toFixed(2),
        employeeHours.toFixed(2)
      ];
    });
    
    const csvContent = [
      headers.join(';'),
      ...rows.map((row: any[]) => row.join(';'))
    ].join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `controle_horas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredLogs, getOperatorName]);

  const handleAnalyzeLogs = async () => {
    setAiModal({ isOpen: true, text: '', isLoading: true, error: '' });
    const logsText = logs.map((l: any) => `[${l.machineId}] Operador ${getOperatorName(l.operator)} relatou: ${l.observations}`).join('\n');
    const prompt = `Atue como um gestor de frotas experiente. Analise as observações das partes diárias abaixo e destaque os riscos ou problemas mecânicos que precisam de atenção urgente para evitar que as máquinas quebrem. Formate a resposta de forma clara, com tópicos e recomendações de ações preventivas.\n\nObservações do dia:\n${logsText}`;
    
    try {
      const text = await generateWithGemini(prompt);
      setAiModal(prev => ({ ...prev, text, isLoading: false }));
    } catch (error) {
      setAiModal(prev => ({ ...prev, error: 'Falha ao analisar os relatórios. Tente novamente.', isLoading: false }));
    }
  };

  const openEditModal = (log: any) => {
    setEditingLog(log);
    setFormStartHorimeter(log.startHorimeter);
    setFormPhotos(log.photos || []);
    
    const checklistData: Record<string, string> = {};
    if (log.checklist) {
      Object.keys(log.checklist).forEach(key => {
        checklistData[key] = log.checklist[key];
      });
    }

    reset({
      date: log.date,
      machineId: log.machineId,
      operator: log.operator,
      location: log.location,
      fuel: log.fuel,
      fuelSource: log.fuelSource,
      startHorimeter: log.startHorimeter,
      endHorimeter: log.endHorimeter || "",
      observations: log.observations || "",
      checklist: checklistData
    });
    
    setIsModalOpen(true);
  };

  const closeFormModal = () => {
    setIsModalOpen(false);
    setEditingLog(null);
    setFormStartHorimeter('');
    setFormPhotos([]);
    reset({
      date: new Date().toISOString().split('T')[0],
      fuel: 0,
      fuelSource: "Comboio",
      checklist: {}
    });
  };

  const handlePhotoUpload = (e: any) => {
    const files = Array.from(e.target.files) as File[];
    if (formPhotos.length + files.length > 5) {
      alert("Pode anexar no máximo 5 fotografias.");
      return;
    }
    const newPhotos = files.map(file => URL.createObjectURL(file));
    setFormPhotos([...formPhotos, ...newPhotos].slice(0, 5));
  };

  const removePhoto = (indexToRemove: number) => {
    setFormPhotos(formPhotos.filter((_, index) => index !== indexToRemove));
  };

  const validOperators = employees.filter((e: any) => e.role === 'Operador de Máquinas');
  const validDrivers = employees.filter((e: any) => e.role === 'Motorista');

  const onSubmitForm = useCallback((data: DailyLogFormData) => {
    let hasAvaria = false;
    if (data.checklist) {
      Object.values(data.checklist).forEach(valor => {
        if (valor === 'avaria') hasAvaria = true;
      });
    }

    const logData = {
      ...editingLog,
      id: editingLog ? editingLog.id : genId(),
      date: data.date,
      machineId: data.machineId,
      operator: data.operator,
      location: data.location,
      startHorimeter: data.startHorimeter,
      endHorimeter: data.endHorimeter === "" ? 0 : Number(data.endHorimeter),
      fuel: data.fuel,
      fuelSource: data.fuelSource,
      checklist: data.checklist || {},
      hasAvaria: hasAvaria,
      avariaStatus: editingLog ? editingLog.avariaStatus : (hasAvaria ? 'Pendente Oficina' : 'OK'),
      observations: data.observations || "",
      photos: formPhotos
    };

    if (editingLog) {
      onEditLog(logData);
    } else {
      onAddLog(logData);
    }
    closeFormModal();
  }, [editingLog, formPhotos, onEditLog, onAddLog, closeFormModal]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Registro Diário</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Registro de operação e abastecimento em campo</p>
        </div>
        <div className="flex gap-2">
          {isAdminAuthenticated && (
            <>
              <button 
                onClick={handleExportCSV}
                className="bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors border border-green-200"
                title="Baixar planilha para o escritório"
              >
                <Download size={18} className="mr-2" />
                Exportar Horas
              </button>
              <button 
                onClick={() => generateDailyLogsPDF(filteredLogs, machines)}
                className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors border border-red-200"
                title="Baixar relatório em PDF"
              >
                <Download size={18} className="mr-2" />
                Exportar PDF
              </button>
              <button 
                onClick={handleAnalyzeLogs}
                className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors border border-yellow-200"
              >
                <Sparkles size={18} className="mr-2" />
                Análise Inteligente
              </button>
            </>
          )}
          <button 
            onClick={() => {
              setEditingLog(null);
              setFormStartHorimeter('');
              setFormPhotos([]);
              setIsModalOpen(true);
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Preencher Parte Diária
          </button>
        </div>
      </div>

      {/* Turnos em Aberto Section */}
      {openLogs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Loader2 size={20} className="mr-2 text-blue-600 animate-spin" />
            Turnos em Aberto (Aguardando Fechamento)
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-blue-100/50 text-blue-800 text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold border-b border-blue-200">Data</th>
                    <th className="p-4 font-bold border-b border-blue-200">Veículo</th>
                    <th className="p-4 font-bold border-b border-blue-200">Operador</th>
                    <th className="p-4 font-bold border-b border-blue-200">Leitura Inicial</th>
                    <th className="p-4 font-bold border-b border-blue-200 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {openLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-blue-100/30 transition-colors">
                      <td className="p-4 text-sm font-medium whitespace-nowrap">{formatDateBR(log.date)}</td>
                      <td className="p-4 text-sm font-bold">{log.machineId}</td>
                      <td className="p-4 text-sm">{getOperatorName(log.operator)}</td>
                      <td className="p-4 text-sm font-mono">{log.startHorimeter}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => openEditModal(log)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-md transition-colors shadow-sm"
                        >
                          Fechar Turno
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isAdminAuthenticated ? (
        <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#101010] flex justify-between items-center">
            <h3 className="font-bold text-gray-700 dark:text-gray-200">Histórico de Registros Concluídos</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar Veículo ou Operador..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#101010] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium border-b">Data / ID</th>
                  <th className="p-4 font-medium border-b">Veículo</th>
                  <th className="p-4 font-medium border-b">Operador</th>
                  <th className="p-4 font-medium border-b">Obra / Local</th>
                  <th className="p-4 font-medium border-b text-center">Abertura / Fechamento</th>
                  <th className="p-4 font-medium border-b text-center">Horímetro / KM</th>
                  <th className="p-4 font-medium border-b text-center">Abast.</th>
                  <th className="p-4 font-medium border-b text-center">Checklist</th>
                  <th className="p-4 font-medium border-b">Observações</th>
                  <th className="p-4 font-medium border-b text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log: any) => {
                  const machine = machines.find((m: any) => m.id === log.machineId);
                  const workedHours = log.endHorimeter - log.startHorimeter;
                  const unit = machine?.measureUnit || 'h';
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:bg-[#101010]/50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900 dark:text-gray-50 whitespace-nowrap">{formatDateBR(log.date)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{formatPDId(log.id)}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900 dark:text-gray-50">{log.machineId}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{machine?.type || 'N/A'}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-800 dark:text-gray-100 flex items-center mt-2">
                        {getOperatorName(log.operator)}
                      </td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-200">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1 text-gray-400" /> {log.location}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-600 dark:text-gray-300 text-center">
                        <div className="font-medium">{log.openedAt ? new Date(log.openedAt).toLocaleTimeString('pt-BR') : '-'}</div>
                        <div className="text-gray-400">{log.closedAt ? new Date(log.closedAt).toLocaleTimeString('pt-BR') : '-'}</div>
                      </td>
                      <td className="p-4 text-sm font-mono text-gray-600 dark:text-gray-300 text-center">
                        <div>{log.startHorimeter} - {log.endHorimeter}</div>
                        <div className="text-xs font-semibold text-blue-600 mt-1">{workedHours} {unit} trab.</div>
                      </td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-200 text-center">
                        <div className="flex justify-center items-center">
                          <Fuel size={14} className="mr-1 text-green-600" /> {log.fuel} L
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {log.hasAvaria ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800" title="Foi registrada avaria">
                            <AlertTriangle size={14} className="mr-1" /> Avaria
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800" title="Checklist OK">
                            <CheckCircle size={14} className="mr-1" /> OK
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                        <div className="truncate" title={log.observations}>{log.observations || '-'}</div>
                        {log.photos && log.photos.length > 0 && (
                          <div className="flex items-center mt-1 text-xs text-blue-600 font-semibold">
                            <ImageIcon size={12} className="mr-1" /> {log.photos.length} Foto(s) anexada(s)
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEditModal(log)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                          <Edit size={18} />
                        </button>
                        {isAdminAuthenticated && (
                          <button onClick={() => setDeleteModal({ isOpen: true, logId: log.id })} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredLogs.map((log: any) => {
              const machine = machines.find((m: any) => m.id === log.machineId);
              const workedHours = log.endHorimeter - log.startHorimeter;
              const unit = machine?.measureUnit || 'h';
              
              return (
                <div key={log.id} className="p-4 hover:bg-gray-50 dark:bg-[#101010]/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-50">{formatDateBR(log.date)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatPDId(log.id)}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(log)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                        <Edit size={18} />
                      </button>
                      {isAdminAuthenticated && (
                        <button onClick={() => setDeleteModal({ isOpen: true, logId: log.id })} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">Veículo</div>
                      <div className="font-medium text-gray-900 dark:text-gray-50">{log.machineId}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{machine?.type || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">Operador</div>
                      <div className="font-medium text-gray-900 dark:text-gray-50">{getOperatorName(log.operator)}</div>
                    </div>
                  </div>

                  <div className="mb-3 text-sm flex items-center text-gray-700 dark:text-gray-200">
                    <MapPin size={14} className="mr-1 text-gray-400" /> {log.location}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                    <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                      <div className="text-gray-500 dark:text-gray-400 text-xs mb-1 text-center">Horímetro/KM</div>
                      <div className="font-mono text-center text-xs">{log.startHorimeter} - {log.endHorimeter}</div>
                      <div className="text-xs font-semibold text-blue-600 text-center mt-1">{workedHours} {unit}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center">
                      <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Abast.</div>
                      <div className="font-medium flex items-center"><Fuel size={14} className="mr-1 text-green-600" /> {log.fuel} L</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center">
                      <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Checklist</div>
                      {log.hasAvaria ? (
                        <span className="inline-flex items-center text-xs font-medium text-red-600">
                          <AlertTriangle size={14} className="mr-1" /> Avaria
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium text-green-600">
                          <CheckCircle size={14} className="mr-1" /> OK
                        </span>
                      )}
                    </div>
                  </div>

                  {log.observations && (
                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                      <span className="font-medium text-gray-700 dark:text-gray-200">Obs:</span> {log.observations}
                      {log.photos && log.photos.length > 0 && (
                        <div className="flex items-center mt-1 text-xs text-blue-600 font-semibold">
                          <ImageIcon size={12} className="mr-1" /> {log.photos.length} Foto(s) anexada(s)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum registro concluído encontrado.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-[#101010] border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-[#1e1e1e] text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2">Acesso Restrito ao Histórico</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            O histórico de partes diárias concluídas está disponível apenas para administradores. 
            Utilize o botão acima para preencher um novo registro ou fechar um turno em aberto.
          </p>
        </div>
      )}

      {aiModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-2xl max-w-[90vw] flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center space-x-2 text-yellow-700">
                <Sparkles size={24} />
                <h3 className="text-xl font-bold">Resumo Diário da Frota</h3>
              </div>
              <button onClick={() => setAiModal({ isOpen: false, text: '', isLoading: false, error: '' })} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {aiModal.isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-yellow-600">
                  <Loader2 size={40} className="animate-spin mb-4" />
                  <p className="font-medium text-gray-600 dark:text-gray-300">A IA está analisando os registros...</p>
                </div>
              ) : aiModal.error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
                  <AlertTriangle size={20} className="mr-2" />
                  {aiModal.error}
                </div>
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {aiModal.text}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#101010] rounded-b-xl flex justify-end">
              <button onClick={() => setAiModal({ isOpen: false, text: '', isLoading: false, error: '' })} className="px-4 py-2 bg-gray-200 text-gray-800 dark:text-gray-100 font-semibold rounded-md hover:bg-gray-300 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Shift Confirmation Modal */}
      {openShiftConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-md max-h-[90vh] max-w-[90vw] overflow-y-auto p-6">
            <div className="flex items-center text-blue-600 mb-4">
              <Clock className="mr-2" size={24} />
              <h3 className="text-lg font-bold">Turno em Aberto Detectado</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Existe um turno em aberto para o equipamento <strong>{openShiftConfirm.log.machineId}</strong> (Operador: {openShiftConfirm.log.operator}). 
              Deseja carregar os dados para fechar este turno?
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {
                  const machineId = openShiftConfirm.log.machineId;
                  const machine = machines.find((m: any) => m.id === machineId);
                  const completedLogs = logs.filter((l: any) => l.machineId === machineId && l.status === 'Concluído');
                  const lastLog = completedLogs.length > 0 
                    ? [...completedLogs].sort((a: any, b: any) => safeTimeOf(b.date) - safeTimeOf(a.date))[0]
                    : null;
                  
                  setFormStartHorimeter(lastLog ? lastLog.endHorimeter : (machine ? machine.horimeter : ''));
                  setOpenShiftConfirm({ isOpen: false, log: null });
                }} 
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1e1e1e] font-semibold rounded-md hover:bg-gray-200"
              >
                Não, Novo Turno
              </button>
              <button 
                onClick={() => {
                  setEditingLog(openShiftConfirm.log);
                  setFormStartHorimeter(openShiftConfirm.log.startHorimeter);
                  setFormPhotos(openShiftConfirm.log.photos || []);
                  setOpenShiftConfirm({ isOpen: false, log: null });
                }} 
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
              >
                Sim, Carregar Dados
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-md max-h-[90vh] max-w-[90vw] overflow-y-auto p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Excluir Registro?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Esta ação é irreversível. Deseja mesmo excluir este registro?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteModal({ isOpen: false, logId: null })} className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1e1e1e] font-semibold rounded-md hover:bg-gray-200">
                Cancelar
              </button>
              <button onClick={() => {
                onDeleteLog(deleteModal.logId);
                setDeleteModal({ isOpen: false, logId: null });
              }} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-2xl max-w-[90vw] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{editingLog ? 'Editar Registro' : 'Novo Registro Diário'}</h3>
              <button onClick={closeFormModal} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form key={editingLog ? editingLog.id : 'new'} className="space-y-5" onSubmit={handleSubmit(onSubmitForm)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data</label>
                  <input {...register("date")} type="date" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:ring-yellow-500 focus:border-yellow-500" />
                  {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Equipamento / Caminhão</label>
                  <select 
                    {...register("machineId")}
                    className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:ring-yellow-500 focus:border-yellow-500"
                    onChange={(e) => {
                      const machineId = e.target.value;
                      setValue("machineId", machineId);
                      const machine = machines.find((m: any) => m.id === machineId);
                      
                      // Check if there's an open shift for this machine
                      const openLog = logs.find((l: any) => l.machineId === machineId && l.status === 'Em Andamento');
                      
                      if (openLog && !editingLog) {
                        setOpenShiftConfirm({ isOpen: true, log: openLog });
                        return;
                      }
                      
                      // Find the last completed log for this machine to suggest the starting horimeter
                      const completedLogs = logs.filter((l: any) => l.machineId === machineId && l.status === 'Concluído');
                      const lastLog = completedLogs.length > 0 
                        ? [...completedLogs].sort((a: any, b: any) => {
                            const dateA = safeTimeOf(a.date);
                            const dateB = safeTimeOf(b.date);
                            if (dateA !== dateB) return dateB - dateA;
                            // If same date, use closedAt or id as secondary sort
                            const timeA = a.closedAt ? new Date(a.closedAt).getTime() : 0;
                            const timeB = b.closedAt ? new Date(b.closedAt).getTime() : 0;
                            return timeB - timeA;
                          })[0]
                        : null;

                      const suggestedStart = lastLog ? lastLog.endHorimeter : (machine ? machine.horimeter : '');
                      setFormStartHorimeter(suggestedStart);
                      setValue("startHorimeter", Number(suggestedStart));
                    }}
                  >
                    <option value="" disabled>Selecione o veículo...</option>
                    {machines.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.id} - {m.type}</option>
                    ))}
                  </select>
                  {errors.machineId && <p className="text-red-500 text-xs mt-1">{errors.machineId.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Operador / Motorista</label>
                  <select {...register("operator")} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:ring-yellow-500 focus:border-yellow-500">
                    <option value="" disabled>Selecione quem operou...</option>
                    {validOperators.length > 0 && (
                      <optgroup label="Operadores de Máquinas">
                        {validOperators.map((op: any) => <option key={op.id} value={op.id}>{op.nome}</option>)}
                      </optgroup>
                    )}
                    {validDrivers.length > 0 && (
                      <optgroup label="Motoristas">
                        {validDrivers.map((drv: any) => <option key={drv.id} value={drv.id}>{drv.nome}</option>)}
                      </optgroup>
                    )}
                  </select>
                  {errors.operator && <p className="text-red-500 text-xs mt-1">{errors.operator.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Obra / Local</label>
                  <select {...register("location")} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:ring-yellow-500 focus:border-yellow-500">
                    <option value="" disabled>Selecione a obra...</option>
                    {sites.map((site: any) => {
                      const siteId = site.id;
                      const siteName = site.nome || site.name || (typeof site === 'string' ? site : 'Obra');
                      return <option key={siteId} value={siteId}>{siteName}</option>;
                    })}
                  </select>
                  {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Abastecimento (Litros)</label>
                  <input {...register("fuel", { valueAsNumber: true })} type="number" min="0" step="0.01" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:ring-yellow-500 focus:border-yellow-500" />
                  {errors.fuel && <p className="text-red-500 text-xs mt-1">{errors.fuel.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Origem do Combustível</label>
                  <select {...register("fuelSource")} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:ring-yellow-500 focus:border-yellow-500">
                    <option value="Comboio">Comboio (Estoque Interno)</option>
                    <option value="Posto de Combustível">Posto de Combustível</option>
                    <option value="Fazenda">Fazenda</option>
                    <option value="Outros">Outros</option>
                  </select>
                  {errors.fuelSource && <p className="text-red-500 text-xs mt-1">{errors.fuelSource.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Leitura Inicial (Horas ou KM)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.1"
                    {...register("startHorimeter", { 
                      valueAsNumber: true,
                      onChange: (e) => setFormStartHorimeter(e.target.value)
                    })} 
                    className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:ring-yellow-500 focus:border-yellow-500 font-mono" 
                  />
                  {errors.startHorimeter && <p className="text-red-500 text-xs mt-1">{errors.startHorimeter.message}</p>}
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Sugerido automaticamente com base no último fechamento.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Leitura Final (Opcional para Abertura)</label>
                  <input {...register("endHorimeter", { setValueAs: v => v === "" ? "" : Number(v) })} type="number" min={formStartHorimeter || 0} step="0.1" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:ring-yellow-500 focus:border-yellow-500 font-mono" />
                  {errors.endHorimeter && <p className="text-red-500 text-xs mt-1">{errors.endHorimeter.message}</p>}
                </div>
                
                <div className="md:col-span-2 mt-2">
                  <div className="bg-gray-50 dark:bg-[#101010] border border-gray-200 dark:border-white/10 rounded-lg p-4">
                    <h4 className="text-md font-bold text-gray-800 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-white/10 pb-2 flex items-center">
                      <CheckCircle size={18} className="mr-2 text-yellow-600" />
                      Checklist (Inspeção Diária)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {defaultChecklistItems.map(item => {
                        return (
                          <div key={item.id} className="flex justify-between items-center bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 p-2.5 rounded-md shadow-sm">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
                            <div className="flex space-x-4">
                              <label className="flex items-center space-x-1.5 cursor-pointer group">
                                <input type="radio" {...register(`checklist.${item.id}`)} value="ok" className="text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer" />
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:text-green-700">OK</span>
                              </label>
                              <label className="flex items-center space-x-1.5 cursor-pointer group">
                                <input type="radio" {...register(`checklist.${item.id}`)} value="avaria" className="text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer" />
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:text-red-700">Avaria</span>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Observações (Descreva problemas, caso existam)</label>
                  <textarea {...register("observations")} rows={3} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:ring-yellow-500 focus:border-yellow-500" placeholder="..."></textarea>
                  {errors.observations && <p className="text-red-500 text-xs mt-1">{errors.observations.message}</p>}
                </div>

                <div className="md:col-span-2 mt-2">
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                    <h4 className="text-md font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                      <Camera size={18} className="mr-2" />
                      Evidências Fotográficas da Avaria (Máx: 5 fotos)
                    </h4>
                    <div className="flex flex-wrap gap-4 items-center">
                      {formPhotos.map((photo, idx) => (
                        <div key={idx} className="relative w-20 h-20 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo} alt={`Foto ${idx+1}`} className="object-cover w-full h-full" />
                          <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      
                      {formPhotos.length < 5 && (
                        <label className="w-20 h-20 bg-white dark:bg-[#1e1e1e] border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors">
                          <Plus size={24} className="text-blue-500 dark:text-blue-400 mb-1" />
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-300 text-center leading-tight">Add<br/>Foto</span>
                          <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

              </div>
              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={closeFormModal} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#1e1e1e] rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-yellow-500 text-yellow-950 font-semibold rounded-md hover:bg-yellow-600">{editingLog ? 'Salvar' : 'Enviar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const MaintenancePlanView = ({ machines = [], plans = [], onAddPlan, onUpdatePlan }: any) => {
  const [selectedMachine, setSelectedMachine] = useState(machines[0]?.id || '');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [exchangeModal, setExchangeModal] = useState({ isOpen: false, plan: null as any });

  const activeMachine = machines.find((m: any) => m.id === selectedMachine);
  const machinePlans = plans.filter((p: any) => p.machineId === selectedMachine);

  const getStatus = (currentMeasure: number, lastExchange: number, interval: number, measureUnit: string) => {
    const nextExchange = lastExchange + interval;
    const remaining = nextExchange - currentMeasure;
    const percentage = ((currentMeasure - lastExchange) / interval) * 100;

    const threshold = measureUnit === 'km' ? 500 : 50;

    if (remaining <= 0) return { label: 'Vencido', color: 'text-red-700 bg-red-100 border-red-200', remaining, percentage: 100, isWarning: false };
    if (remaining <= threshold) return { label: 'Atenção (Próximo)', color: 'text-yellow-800 bg-yellow-100 border-yellow-200', remaining, percentage: Math.min(percentage, 100), isWarning: true };
    return { label: 'OK', color: 'text-green-700 bg-green-100 border-green-200', remaining, percentage: Math.min(percentage, 100), isWarning: false };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Gauge className="mr-2 text-yellow-600" size={28} />
            Planos de Caminhões / Métrica KM
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestão de troca específica de óleos e filtros. Base central para caminhões que seguem métricas por Quilometragem (KM).
          </p>
        </div>
        <button 
          onClick={() => setIsItemModalOpen(true)}
          disabled={!activeMachine}
          className="bg-black hover:bg-neutral-800 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} className="mr-2" />
          Novo Item Avulso
        </button>
      </div>

      <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#101010] flex items-center justify-between gap-4">
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Selecione o Veículo</label>
            <select 
              value={selectedMachine} 
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-[#1e1e1e]"
            >
              {machines.map((m: any) => (
                <option key={m.id} value={m.id}>{m.id} - {m.type} ({m.brand})</option>
              ))}
            </select>
          </div>
          
          {activeMachine && (
            <div className="hidden sm:flex bg-gray-900 text-white rounded-lg p-3 items-center space-x-4 shadow-inner">
              <div className="flex items-center">
                <Gauge size={20} className="text-yellow-500 mr-2" />
                <div>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">Leitura Atual</p>
                  <p className="text-xl font-mono font-bold">{activeMachine.horimeter} {activeMachine.measureUnit}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeMachine && (
          <div className="sm:hidden bg-gray-900 text-white p-4 flex items-center justify-between">
            <span className="text-xs uppercase text-gray-400 font-bold">Leitura Atual:</span>
            <span className="text-xl font-mono font-bold flex items-center">
              <Gauge size={18} className="text-yellow-500 mr-2" /> {activeMachine.horimeter} {activeMachine.measureUnit}
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <table className="w-full text-left border-collapse hidden md:table">
            <thead>
              <tr className="bg-white dark:bg-[#151515] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                <th className="p-4 font-medium w-1/3">Item de Manutenção</th>
                <th className="p-4 font-medium text-center">Última Troca</th>
                <th className="p-4 font-medium text-center">Intervalo</th>
                <th className="p-4 font-medium text-center">Próxima Troca</th>
                <th className="p-4 font-medium w-1/4">Status</th>
                <th className="p-4 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {machinePlans.map((plan: any) => {
                const status = getStatus(activeMachine.horimeter, plan.lastExchange, plan.interval, activeMachine.measureUnit);
                return (
                  <tr key={plan.id} className="hover:bg-gray-50 dark:bg-[#101010]/50 transition-colors">
                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-100">
                      {plan.item}
                    </td>
                    <td className="p-4 text-center font-mono text-gray-600 dark:text-gray-300">
                      {plan.lastExchange} {activeMachine.measureUnit}
                    </td>
                    <td className="p-4 text-center font-mono text-gray-500 dark:text-gray-400">
                      {plan.interval} {activeMachine.measureUnit}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-gray-900 dark:text-gray-50">
                      {plan.lastExchange + plan.interval} {activeMachine.measureUnit}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 font-mono">
                            {status.remaining > 0 ? `${status.remaining}${activeMachine.measureUnit} res.` : `passou`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${status.remaining <= 0 ? 'bg-red-500' : status.isWarning ? 'bg-yellow-500' : 'bg-green-500'}`} 
                            style={{ width: `${status.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setExchangeModal({ isOpen: true, plan })}
                        className="bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs font-bold py-1.5 px-3 rounded-md transition-colors"
                      >
                        Registrar Troca
                      </button>
                    </td>
                  </tr>
                )
              })}
              {machinePlans.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Nenhum item avulso registrado para este veículo.<br/>
                    Ideal para caminhões. Utilize o botão &quot;Novo Item Avulso&quot; para adicionar filtros e óleos baseados na etiqueta de quilometragem.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {machinePlans.map((plan: any) => {
              const status = getStatus(activeMachine.horimeter, plan.lastExchange, plan.interval, activeMachine.measureUnit);
              return (
                <div key={plan.id} className="p-4 space-y-3 bg-white dark:bg-[#151515]">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{plan.item}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase">Última Troca</span>
                      <span className="font-mono font-medium">{plan.lastExchange} {activeMachine.measureUnit}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase">Intervalo</span>
                      <span className="font-mono font-medium">{plan.interval} {activeMachine.measureUnit}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded col-span-2">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase">Próxima Troca</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-gray-50">{plan.lastExchange + plan.interval} {activeMachine.measureUnit}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 font-mono">
                        {status.remaining > 0 ? `${status.remaining}${activeMachine.measureUnit} restantes` : `Passou do limite`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full ${status.remaining <= 0 ? 'bg-red-500' : status.isWarning ? 'bg-yellow-500' : 'bg-green-500'}`} 
                        style={{ width: `${status.percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setExchangeModal({ isOpen: true, plan })}
                    className="w-full mt-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 text-sm font-bold py-2 px-3 rounded-md transition-colors"
                  >
                    Registrar Troca
                  </button>
                </div>
              );
            })}
            {machinePlans.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                Nenhum item avulso registrado para este veículo.<br/>
                Ideal para caminhões. Utilize o botão &quot;Novo Item Avulso&quot; para adicionar filtros e óleos baseados na etiqueta de quilometragem.
              </div>
            )}
          </div>
        </div>
      </div>

      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-md max-h-[90vh] max-w-[90vw] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Novo Item</h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              onAddPlan({
                id: genId(),
                machineId: selectedMachine,
                item: formData.get('item'),
                lastExchange: Number(formData.get('lastExchange')),
                interval: Number(formData.get('interval')),
              });
              setIsItemModalOpen(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Peça / Óleo</label>
                <input name="item" required type="text" placeholder="Ex: Filtro Diesel" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Vida Útil ({activeMachine?.measureUnit})</label>
                <input name="interval" required type="number" min="1" placeholder="Ex: 30000" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Marcador na Última Troca</label>
                <input name="lastExchange" required type="number" min="0" defaultValue={activeMachine?.horimeter} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" />
              </div>
              
              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#1e1e1e] rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-yellow-500 text-yellow-950 font-semibold rounded-md hover:bg-yellow-600">Salvar Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {exchangeModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-md max-h-[90vh] max-w-[90vw] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <Wrench className="mr-2 text-yellow-600" />
                Confirmar Substituição
              </h3>
              <button onClick={() => setExchangeModal({ isOpen: false, plan: null })} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              onUpdatePlan({
                ...exchangeModal.plan,
                lastExchange: Number(formData.get('newExchange'))
              });
              setExchangeModal({ isOpen: false, plan: null });
            }} className="space-y-4">
              
              <div className="bg-gray-50 dark:bg-[#101010] p-3 rounded-lg border border-gray-200 dark:border-white/10 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Peça Trocada:</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{exchangeModal.plan.item}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Painel da Máquina/Caminhão: <strong>{activeMachine.horimeter} {activeMachine.measureUnit}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Métrica exata no momento da troca</label>
                <input 
                  name="newExchange" 
                  required 
                  type="number" 
                  min={exchangeModal.plan.lastExchange} 
                  defaultValue={activeMachine.horimeter} 
                  className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-yellow-500 focus:border-yellow-500 font-mono text-lg bg-yellow-50 dark:bg-yellow-900/30 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={() => setExchangeModal({ isOpen: false, plan: null })} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#1e1e1e] rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-neutral-800">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
