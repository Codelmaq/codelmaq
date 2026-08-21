"use client";
import React, { useMemo, useState } from 'react';
import {
  Search, CalendarDays, Users, Download, FileText, Camera,
  ClipboardCheck, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { formatDateBR } from '@/lib/utils';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface DailyLogsTableProps {
  logs: any[];
  machines: any[];
  employees: any[];
  isAdmin: boolean;
  userId?: string;
}

export const DailyLogsTable = ({ logs, machines, employees, isAdmin, userId }: DailyLogsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('all');
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  const getOperatorName = (id: string) => {
    if (!id) return '-';
    const emp = employees.find((e: any) => e.id === id);
    return emp ? (emp.nome || emp.name || id) : id;
  };

  const getMachineLabel = (id: string) => {
    const m = machines.find((m: any) => m.id === id);
    return m ? `${id} — ${m.type || 'Equipamento'}` : id;
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log: any) => {
      if (!isAdmin && log.operator !== userId) return false;
      const d = log.date ? new Date(log.date) : null;
      if (!d || isNaN(d.getTime())) return false;
      if (d.getMonth() !== month || d.getFullYear() !== year) return false;
      if (selectedOperator !== 'all' && log.operator !== selectedOperator) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        const opName = getOperatorName(log.operator).toLowerCase();
        const machineLabel = getMachineLabel(log.machineId).toLowerCase();
        const loc = (log.location || '').toLowerCase();
        if (!opName.includes(t) && !machineLabel.includes(t) && !loc.includes(t)) return false;
      }
      return true;
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, isAdmin, userId, month, year, selectedOperator, searchTerm, machines, employees]);

  const filterableEmployees = useMemo(() =>
    employees.filter((e: any) => {
      const r = (e.role || '').toLowerCase();
      return r === 'operador' || r === 'motorista' || r === 'colaborador' || r.startsWith('operador de');
    }), [employees]);

  const totalHoras = useMemo(() =>
    filteredLogs.reduce((sum: number, l: any) => sum + ((l.endHorimeter || 0) - (l.startHorimeter || 0)), 0),
    [filteredLogs]);

  const totalCombustivel = useMemo(() =>
    filteredLogs.reduce((sum: number, l: any) => sum + (Number(l.fuel) || 0), 0),
    [filteredLogs]);

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const exportCSV = () => {
    const headers = ['Data','ID','Obra','Equipamento','Operador','Abertura','Fechamento','Horas Máquina','Abastecimento (L)','Checklist','Observações','Fotos'];
    const rows = filteredLogs.map((l: any) => [
      formatDateBR(l.date), l.id, l.location, l.machineId, getOperatorName(l.operator),
      l.startHorimeter, l.endHorimeter,
      (l.endHorimeter || 0) - (l.startHorimeter || 0),
      l.fuel || 0,
      l.checklist ? JSON.stringify(l.checklist) : '',
      l.observations || '',
      l.photos ? l.photos.length : 0
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `registros_diarios_${MONTH_NAMES[month]}_${year}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Registros Diários — ${MONTH_NAMES[month]} / ${year}`, 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total: ${filteredLogs.length} registros | Horas: ${totalHoras.toFixed(1)} | Combustível: ${totalCombustivel.toFixed(1)} L`, 14, 22);

    const headers = ['Data','Obra','Equipamento','Operador','Abr.','Fech.','Horas','Comb.(L)','Obs.'];
    const colWidths = [22, 30, 32, 30, 16, 16, 16, 16, 60];
    let y = 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let x = 14;
    headers.forEach((h, i) => { doc.text(h, x, y); x += colWidths[i]; });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    filteredLogs.forEach((l: any) => {
      if (y > 190) { doc.addPage(); y = 15; }
      x = 14;
      const row = [
        formatDateBR(l.date), l.location || '', l.machineId || '', getOperatorName(l.operator),
        String(l.startHorimeter ?? ''), String(l.endHorimeter ?? ''),
        String(((l.endHorimeter || 0) - (l.startHorimeter || 0)).toFixed(1)),
        String(Number(l.fuel || 0).toFixed(1)),
        (l.observations || '').substring(0, 60)
      ];
      row.forEach((cell, i) => { doc.text(cell, x, y); x += colWidths[i]; });
      y += 4;
    });
    doc.save(`registros_diarios_${MONTH_NAMES[month]}_${year}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Registros</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-50">{filteredLogs.length}</div>
        </div>
        <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Horas Totais</div>
          <div className="text-xl font-bold text-blue-600">{totalHoras.toFixed(1)} h</div>
        </div>
        <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Combustível</div>
          <div className="text-xl font-bold text-green-600">{totalCombustivel.toFixed(1)} L</div>
        </div>
        <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mês / Ano</div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-50">{MONTH_NAMES[month].substring(0,3)}/{year}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          {/* Month Navigation */}
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

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#101010] rounded-lg px-3 py-2 flex-1 min-w-0">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por operador, equipamento ou obra..."
              className="bg-transparent text-sm w-full outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
          </div>

          {/* Operator Filter */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="p-2 border border-gray-300 dark:border-zinc-700 rounded-md text-sm font-medium bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100"
              >
                <option value="all">Todos Operadores</option>
                {filterableEmployees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.nome || emp.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Export Buttons */}
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-2 px-3 rounded-lg flex items-center text-sm transition-colors border border-green-200"
              >
                <Download size={15} className="mr-1" />
                CSV
              </button>
              <button
                onClick={exportPDF}
                className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-3 rounded-lg flex items-center text-sm transition-colors border border-red-200"
              >
                <FileText size={15} className="mr-1" />
                PDF
              </button>
            </div>
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
                <th className="p-3 font-medium text-center">Horas</th>
                <th className="p-3 font-medium text-center">Abast. (L)</th>
                <th className="p-3 font-medium text-center">Checklist</th>
                <th className="p-3 font-medium">Observações</th>
                <th className="p-3 font-medium text-center">Fotos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Nenhum registro encontrado para este período.
                  </td>
                </tr>
              )}
              {filteredLogs.map((log: any) => {
                const hours = (log.endHorimeter || 0) - (log.startHorimeter || 0);
                const hasChecklist = log.checklist && Object.keys(log.checklist).length > 0;
                const avariaCount = log.checklist
                  ? Object.values(log.checklist).filter((v: any) => v === 'avaria').length
                  : 0;
                return (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#101010]/50 transition-colors">
                    <td className="p-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-50">{formatDateBR(log.date)}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{String(log.id).substring(0, 8)}</div>
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-300 max-w-[150px] truncate" title={log.location}>
                      {log.location || '—'}
                    </td>
                    <td className="p-3 text-sm text-gray-900 dark:text-gray-50 font-medium">
                      {log.machineId}
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                      {getOperatorName(log.operator)}
                    </td>
                    <td className="p-3 text-sm text-center font-mono text-gray-600 dark:text-gray-300">
                      {log.startHorimeter ?? '—'}
                    </td>
                    <td className="p-3 text-sm text-center font-mono text-gray-600 dark:text-gray-300">
                      {log.endHorimeter ?? '—'}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-800">
                        {hours.toFixed(1)}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-center font-medium text-gray-700 dark:text-gray-200">
                      {Number(log.fuel || 0).toFixed(1)}
                    </td>
                    <td className="p-3 text-center">
                      {hasChecklist ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          avariaCount > 0
                            ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                        }`}>
                          <ClipboardCheck size={12} />
                          {avariaCount > 0 ? `${avariaCount} avaria${avariaCount > 1 ? 's' : ''}` : 'OK'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={log.observations}>
                      {log.observations || '—'}
                    </td>
                    <td className="p-3 text-center">
                      {log.photos && log.photos.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                          <Camera size={12} />
                          {log.photos.length}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">0</span>
                      )}
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
        {filteredLogs.length === 0 && (
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
            Nenhum registro encontrado para este período.
          </div>
        )}
        {filteredLogs.map((log: any) => {
          const hours = (log.endHorimeter || 0) - (log.startHorimeter || 0);
          const hasChecklist = log.checklist && Object.keys(log.checklist).length > 0;
          const avariaCount = log.checklist
            ? Object.values(log.checklist).filter((v: any) => v === 'avaria').length
            : 0;
          return (
            <div key={log.id} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-50 text-sm">{formatDateBR(log.date)}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{String(log.id).substring(0, 8)}</div>
                </div>
                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold border border-blue-100 dark:border-blue-800">
                  {hours.toFixed(1)} h
                </span>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300 mb-3 space-y-1">
                <div><span className="font-medium text-gray-800 dark:text-gray-200">Equipamento:</span> {log.machineId}</div>
                <div><span className="font-medium text-gray-800 dark:text-gray-200">Operador:</span> {getOperatorName(log.operator)}</div>
                <div><span className="font-medium text-gray-800 dark:text-gray-200">Obra:</span> {log.location || '—'}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5 text-center">
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Abertura</div>
                  <div className="font-mono font-medium">{log.startHorimeter ?? '—'}</div>
                </div>
                <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5 text-center">
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Fechamento</div>
                  <div className="font-mono font-medium">{log.endHorimeter ?? '—'}</div>
                </div>
                <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5 text-center">
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Combustível</div>
                  <div className="font-medium">{Number(log.fuel || 0).toFixed(1)} L</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  {hasChecklist && (
                    <span className={`inline-flex items-center gap-1 font-medium ${
                      avariaCount > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      <ClipboardCheck size={12} />
                      {avariaCount > 0 ? `${avariaCount} avaria${avariaCount > 1 ? 's' : ''}` : 'Checklist OK'}
                    </span>
                  )}
                  {log.photos && log.photos.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Camera size={12} /> {log.photos.length} foto{log.photos.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {log.observations && (
                  <span className="truncate max-w-[150px]" title={log.observations}>
                    Obs: {log.observations.substring(0, 30)}{log.observations.length > 30 ? '...' : ''}
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
