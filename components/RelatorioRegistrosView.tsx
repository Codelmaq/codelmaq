"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Download, FileText, Camera, ClipboardCheck,
  ChevronLeft, ChevronRight, BarChart3, Fuel
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDateBR } from '@/lib/utils';

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

interface RelatorioRegistrosViewProps {
  userId?: string;
  isAdmin: boolean;
  isGestor: boolean;
  employees: any[];
  machines: any[];
}

export const RelatorioRegistrosView = ({ userId, isAdmin, isGestor, employees, machines }: RelatorioRegistrosViewProps) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('all');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const canSeeAll = isAdmin || isGestor;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vw_relatorio_registros' as any)
        .select('*')
        .order('data', { ascending: false });
      if (error) {
        console.error('Erro ao buscar relatório:', error.message);
        setRows([]);
      } else {
        setRows(data || []);
      }
    } catch (e) {
      console.error('Erro ao buscar relatório:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getOperatorName = (id: string) => {
    if (!id) return '-';
    const emp = employees.find((e: any) => e.id === id);
    return emp ? (emp.nome || emp.name || id) : id;
  };

  const getMachineUnit = (id: string) => {
    const m = machines.find((m: any) => m.id === id);
    return m?.measureUnit || 'h';
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r: any) => {
      if (!canSeeAll && r.operador_id !== userId) return false;
      const d = r.data ? new Date(r.data) : null;
      if (!d || isNaN(d.getTime())) return false;
      if (d.getMonth() !== month || d.getFullYear() !== year) return false;
      if (canSeeAll && selectedOperator !== 'all' && r.operador_id !== selectedOperator) return false;
      if (canSeeAll && searchTerm) {
        const t = searchTerm.toLowerCase();
        const opName = (r.operador_nome || '').toLowerCase();
        const machineLabel = `${r.ativo_id || ''} ${r.ativo_tipo || ''}`.toLowerCase();
        const loc = (r.frente_servico_nome || '').toLowerCase();
        if (!opName.includes(t) && !machineLabel.includes(t) && !loc.includes(t)) return false;
      }
      return true;
    }).sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [rows, canSeeAll, userId, month, year, selectedOperator, searchTerm]);

  const totalHoras = useMemo(() =>
    filteredRows.reduce((s: number, r: any) => s + (Number(r.horas_maquina) || 0), 0), [filteredRows]);

  const totalCombustivel = useMemo(() =>
    filteredRows.reduce((s: number, r: any) => s + (Number(r.combustivel_adicionado) || 0), 0), [filteredRows]);



  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const filterableEmployees = useMemo(() =>
    employees.filter((e: any) => {
      const r = (e.role || e.funcao || '').toLowerCase();
      return r === 'operador' || r === 'motorista' || r === 'colaborador' || r.startsWith('operador de');
    }), [employees]);

  const exportCSV = () => {
    const headers = ['Data','ID','Obra','Equipamento','Operador','Abertura','Fechamento','Horas Máquina','Combustível (L)','Checklist','Observações','Fotos'];
    const rowsCsv = filteredRows.map((r: any) => [
      r.data, String(r.id).substring(0, 8), r.frente_servico_nome || '',
      `${r.ativo_id || ''} ${r.ativo_tipo || ''}`.trim(), r.operador_nome || '',
      r.aberto_em || '', r.fechado_em || '',
      Number(r.horas_maquina || 0).toFixed(1),
      Number(r.combustivel_adicionado || 0).toFixed(1),
      r.checklist_respostas && r.checklist_respostas.length > 0 ? 'Sim' : 'Não',
      r.observacoes || '',
      r.fotos && r.fotos.length > 0 ? r.fotos.length : 0
    ]);
    const csv = [headers.join(','), ...rowsCsv.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `relatorio_registros_${MONTH_NAMES[month]}_${year}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Relatório de Registros — ${MONTH_NAMES[month]} / ${year}`, 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total: ${filteredRows.length} registros | Horas Máq.: ${totalHoras.toFixed(1)} | Comb.: ${totalCombustivel.toFixed(1)}L`, 14, 22);

    const headers = ['Data','Obra','Equipamento','Operador','Abr.','Fech.','Horas','Comb.(L)','Obs.'];
    const colWidths = [22, 28, 30, 28, 16, 16, 14, 14, 80];
    let y = 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let x = 14;
    headers.forEach((h, i) => { doc.text(h, x, y); x += colWidths[i]; });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    filteredRows.forEach((r: any) => {
      if (y > 190) { doc.addPage(); y = 15; }
      x = 14;
      const row = [
        r.data || '', r.frente_servico_nome || '', r.ativo_id || '', r.operador_nome || '',
        r.aberto_em ? new Date(r.aberto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        r.fechado_em ? new Date(r.fechado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        Number(r.horas_maquina || 0).toFixed(1),
        Number(r.combustivel_adicionado || 0).toFixed(1),
        (r.observacoes || '').substring(0, 80)
      ];
      row.forEach((cell, i) => { doc.text(cell, x, y); x += colWidths[i]; });
      y += 4;
    });
    doc.save(`relatorio_registros_${MONTH_NAMES[month]}_${year}.pdf`);
  };

  const getChecklistStatus = (respostas: any) => {
    if (!respostas || !Array.isArray(respostas) || respostas.length === 0) return null;
    let avariaCount = 0;
    respostas.forEach((r: any) => {
      if (r && typeof r === 'object') {
        Object.values(r).forEach((v: any) => { if (v === 'avaria') avariaCount++; });
      }
    });
    return { total: respostas.length, avarias: avariaCount };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
        <span className="ml-3 text-gray-500">Carregando registros...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <BarChart3 className="mr-2 text-yellow-600" size={28} />
            Relatório de Registros
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {canSeeAll ? 'Todos os registros de campo.' : 'Seus registros de campo.'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={exportCSV}
              className="bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors border border-green-200">
              <Download size={18} className="mr-2" /> CSV
            </button>
            <button onClick={exportPDF}
              className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors border border-red-200">
              <FileText size={18} className="mr-2" /> PDF
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Registros</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-50">{filteredRows.length}</div>
        </div>
        <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Horas Máquina</div>
          <div className="text-xl font-bold text-blue-600">{totalHoras.toFixed(1)} h</div>
        </div>
        <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Combustível</div>
          <div className="text-xl font-bold text-green-600">{totalCombustivel.toFixed(1)} L</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#101010] rounded-lg px-3 py-2">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[120px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {canSeeAll && (
            <>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#101010] rounded-lg px-3 py-2 flex-1 min-w-0">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por operador, equipamento ou obra..."
                  className="bg-transparent text-sm w-full outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400" />
              </div>
              <select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)}
                className="p-2 border border-gray-300 dark:border-zinc-700 rounded-md text-sm font-medium bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100">
                <option value="all">Todos Operadores</option>
                {filterableEmployees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.nome || emp.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#101010] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                <th className="p-3 font-medium">Data / ID</th>
                <th className="p-3 font-medium">Obra</th>
                <th className="p-3 font-medium">Equipamento</th>
                <th className="p-3 font-medium">Operador</th>
                <th className="p-3 font-medium text-center">Abertura</th>
                <th className="p-3 font-medium text-center">Fechamento</th>
                <th className="p-3 font-medium text-center">Horas Máq.</th>
                <th className="p-3 font-medium text-center">Abast. (L)</th>
                <th className="p-3 font-medium text-center">Checklist</th>
                <th className="p-3 font-medium">Observações</th>
                <th className="p-3 font-medium text-center">Fotos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filteredRows.length === 0 && (
                <tr><td colSpan={11} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhum registro encontrado para este período.
                </td></tr>
              )}
              {filteredRows.map((r: any) => {
                const unit = getMachineUnit(r.ativo_id);
                const clStatus = getChecklistStatus(r.checklist_respostas);
                const abertoTime = r.aberto_em ? new Date(r.aberto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                const fechadoTime = r.fechado_em ? new Date(r.fechado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#101010]/50 transition-colors">
                    <td className="p-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-50">{formatDateBR(r.data)}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{String(r.id).substring(0, 8)}</div>
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-300 max-w-[150px] truncate" title={r.frente_servico_nome || ''}>
                      {r.frente_servico_nome || '—'}
                    </td>
                    <td className="p-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-50">{r.ativo_id}</div>
                      <div className="text-[10px] text-gray-400">{r.ativo_tipo || ''}</div>
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-300">{r.operador_nome || '—'}</td>
                    <td className="p-3 text-sm text-center text-gray-600 dark:text-gray-300">
                      <div className="font-mono text-xs">{abertoTime}</div>
                      <div className="text-[10px] text-gray-400">{r.horimetro_inicial ?? '—'} {unit}</div>
                    </td>
                    <td className="p-3 text-sm text-center text-gray-600 dark:text-gray-300">
                      <div className="font-mono text-xs">{fechadoTime}</div>
                      <div className="text-[10px] text-gray-400">{r.horimetro_final ?? '—'} {unit}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-800">
                        {Number(r.horas_maquina || 0).toFixed(1)} {unit}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-center font-medium text-gray-700 dark:text-gray-200">
                      {Number(r.combustivel_adicionado || 0).toFixed(1)}
                    </td>
                    <td className="p-3 text-center">
                      {clStatus ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          clStatus.avarias > 0
                            ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                        }`}>
                          <ClipboardCheck size={12} />
                          {clStatus.avarias > 0 ? `${clStatus.avarias} avaria${clStatus.avarias > 1 ? 's' : ''}` : 'OK'}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="p-3 text-xs text-gray-500 dark:text-gray-400 max-w-[180px] truncate" title={r.observacoes || ''}>
                      {r.observacoes || '—'}
                    </td>
                    <td className="p-3 text-center">
                      {r.fotos && r.fotos.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                          <Camera size={12} /> {r.fotos.length}
                        </span>
                      ) : <span className="text-xs text-gray-400">0</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredRows.length === 0 && (
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
            Nenhum registro encontrado para este período.
          </div>
        )}
        {filteredRows.map((r: any) => {
          const unit = getMachineUnit(r.ativo_id);
          const clStatus = getChecklistStatus(r.checklist_respostas);
          const abertoTime = r.aberto_em ? new Date(r.aberto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
          const fechadoTime = r.fechado_em ? new Date(r.fechado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
          return (
            <div key={r.id} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-50 text-sm">{formatDateBR(r.data)}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{String(r.id).substring(0, 8)}</div>
                </div>
                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold border border-blue-100 dark:border-blue-800">
                  {Number(r.horas_maquina || 0).toFixed(1)} {unit}
                </span>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300 mb-3 space-y-1">
                <div><span className="font-medium text-gray-800 dark:text-gray-200">Equipamento:</span> {r.ativo_id} {r.ativo_tipo ? `(${r.ativo_tipo})` : ''}</div>
                <div><span className="font-medium text-gray-800 dark:text-gray-200">Operador:</span> {r.operador_nome || '—'}</div>
                <div><span className="font-medium text-gray-800 dark:text-gray-200">Obra:</span> {r.frente_servico_nome || '—'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Abertura</div>
                  <div className="font-mono font-medium">{abertoTime}</div>
                  <div className="text-[10px] text-gray-400">{r.horimetro_inicial ?? '—'} {unit}</div>
                </div>
                <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Fechamento</div>
                  <div className="font-mono font-medium">{fechadoTime}</div>
                  <div className="text-[10px] text-gray-400">{r.horimetro_final ?? '—'} {unit}</div>
                </div>
                <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5 text-center">
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Horas Máquina</div>
                  <div className="font-medium text-blue-700">{Number(r.horas_maquina || 0).toFixed(1)} {unit}</div>
                </div>
                <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5 text-center">
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Combustível</div>
                  <div className="font-medium">{Number(r.combustivel_adicionado || 0).toFixed(1)} L</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  {clStatus && (
                    <span className={`inline-flex items-center gap-1 font-medium ${clStatus.avarias > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <ClipboardCheck size={12} />
                      {clStatus.avarias > 0 ? `${clStatus.avarias} avaria${clStatus.avarias > 1 ? 's' : ''}` : 'Checklist OK'}
                    </span>
                  )}
                  {r.fotos && r.fotos.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Camera size={12} /> {r.fotos.length} foto{r.fotos.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {r.observacoes && (
                  <span className="truncate max-w-[150px]" title={r.observacoes}>
                    Obs: {r.observacoes.substring(0, 30)}{r.observacoes.length > 30 ? '...' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
