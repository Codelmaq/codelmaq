"use client";

import React, { useMemo } from 'react';
import { ArrowLeft, ClipboardList, Mail, HardHat, Gauge, Fuel, MapPin } from 'lucide-react';
import { ROLE_LABELS, normalizeRole } from '@/types/auth';
import { formatDateBR } from '@/lib/utils';

interface EmployeeHistoryViewProps {
  employee: any;
  dailyLogs: any[];
  machines: any[];
  onBack?: () => void;
}

const getRoleBadge = (role: string) => {
  const r = (role || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  let style = 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-100';
  let label = role || '—';
  if (r === 'administrador' || r === 'admin') { style = 'bg-yellow-100 text-yellow-800 border border-yellow-200'; label = 'Administrador'; }
  else if (r === 'gestor' || r === 'gerente' || r === 'supervisor') { style = 'bg-purple-100 text-purple-800'; label = 'Gestor'; }
  else if (r === 'motorista' || r === 'driver') { style = 'bg-emerald-100 text-emerald-800'; label = 'Motorista'; }
  else if (r === 'mecanico') { style = 'bg-red-100 text-red-800'; label = 'Mecânico'; }
  else if (r === 'operador' || r === 'colaborador' || r.includes('maquina') || r === 'ajudante') {
    style = 'bg-blue-100 text-blue-800'; label = r === 'ajudante' ? 'Ajudante' : 'Operador';
  }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${style}`}>{label}</span>;
};

export function EmployeeHistoryView({ employee, dailyLogs, machines, onBack }: EmployeeHistoryViewProps) {
  const empId = employee?.id;

  const logs = useMemo(() => {
    if (!empId) return [];
    return (dailyLogs || [])
      .filter((l: any) => l.operator === empId || l.operatorId === empId)
      .sort((a: any, b: any) => {
        const da = String(a.date || a.data || '');
        const db = String(b.date || b.data || '');
        return db.localeCompare(da);
      });
  }, [empId, dailyLogs]);

  const totalHoursLogs = useMemo(() => {
    let total = 0;
    let fuel = 0;
    logs.forEach((l: any) => {
      const s = Number(l.startHorimeter ?? l.horimetroInicial);
      const e = Number(l.endHorimeter ?? l.horimetroFinal);
      if (Number.isFinite(s) && Number.isFinite(e)) total += e - s;
      const f = Number(l.fuel ?? l.fuelAdded);
      if (Number.isFinite(f)) fuel += f;
    });
    return { total, fuel };
  }, [logs]);

  const getMachineInfo = (machineId: string) => machines?.find((m: any) => m.id === machineId);

  if (!employee) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Colaborador não encontrado.
        <div className="mt-4">
          <button onClick={onBack} className="text-yellow-600 hover:underline cursor-pointer">← Voltar</button>
        </div>
      </div>
    );
  }

  const roleNorm = normalizeRole(employee.role || employee.funcao);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 cursor-pointer"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm p-5">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-xl flex-shrink-0">
            {(employee.nome || employee.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <HardHat size={20} className="text-yellow-600" />
              {employee.nome || employee.name}
            </h2>
            <div className="flex flex-wrap gap-2 mt-1 items-center">
              {getRoleBadge(employee.role || employee.funcao)}
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {ROLE_LABELS[roleNorm] || employee.role || employee.funcao}
              </span>
              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${employee.status === 'aprovado' ? 'bg-emerald-100 text-emerald-800' : employee.status === 'bloqueado' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                {employee.status}
              </span>
            </div>
            {employee.email && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1">
                <Mail size={12} /> {employee.email}
              </div>
            )}
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-gray-50 dark:bg-[#101010] rounded-lg border border-gray-100 dark:border-white/5 p-3">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Registros</div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{logs.length}</div>
          </div>
          <div className="bg-gray-50 dark:bg-[#101010] rounded-lg border border-gray-100 dark:border-white/5 p-3">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Gauge size={11} /> Total Trabalhado
            </div>
            <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{totalHoursLogs.total.toFixed(1)}h</div>
          </div>
          <div className="bg-gray-50 dark:bg-[#101010] rounded-lg border border-gray-100 dark:border-white/5 p-3">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Fuel size={11} /> Combustível
            </div>
            <div className="text-lg font-bold text-green-700 dark:text-green-400">{totalHoursLogs.fuel.toFixed(0)} L</div>
          </div>
          <div className="bg-gray-50 dark:bg-[#101010] rounded-lg border border-gray-100 dark:border-white/5 p-3">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">ID</div>
            <div className="text-[11px] font-mono text-gray-600 dark:text-gray-300 truncate" title={empId}>{empId}</div>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
          <ClipboardList size={18} className="mr-2 text-yellow-600" />
          Histórico de Registros Diários
        </h3>

        {logs.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 dark:bg-[#101010] rounded-xl border border-dashed border-gray-300 dark:border-white/10 text-gray-500 dark:text-gray-400">
            Nenhum registro diário encontrado para este colaborador.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                    <th className="p-3 font-medium">Data</th>
                    <th className="p-3 font-medium">Máquina</th>
                    <th className="p-3 font-medium">Obra / Local</th>
                    <th className="p-3 font-medium text-center">Variação de Métricas</th>
                    <th className="p-3 font-medium text-center">Balanço do Dia</th>
                    <th className="p-3 font-medium text-center">Combustível</th>
                    <th className="p-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log: any) => {
                    const mInfo = getMachineInfo(log.machineId);
                    const unit = mInfo?.measureUnit || 'h';
                    const s = Number(log.startHorimeter ?? log.horimetroInicial);
                    const e = Number(log.endHorimeter ?? log.horimetroFinal);
                    const delta = Number.isFinite(s) && Number.isFinite(e) ? e - s : NaN;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 dark:bg-[#101010]/50">
                        <td className="p-3 text-sm text-gray-900 dark:text-gray-50 font-medium whitespace-nowrap">
                          {formatDateBR(log.date || log.data)}
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300 font-semibold">{log.machineId}</td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} className="text-gray-400" />
                            {log.location || log.siteId || '—'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300 text-center font-mono">
                          {Number.isFinite(s) ? s : '—'} - {Number.isFinite(e) ? e : '—'}
                        </td>
                        <td className="p-3 text-sm font-bold text-blue-700 text-center bg-blue-50/30">
                          {Number.isFinite(delta) ? `${delta.toFixed(1)} ${unit}` : '—'}
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300 text-center">
                          {Number.isFinite(Number(log.fuel ?? log.fuelAdded)) ? `${log.fuel ?? log.fuelAdded} L` : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${(log.status === 'fechado' || log.status === 'Concluído') ? 'bg-emerald-100 text-emerald-800' : log.status === 'rascunho' || log.status === 'Em Andamento' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                            {log.status || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {logs.map((log: any) => {
                const mInfo = getMachineInfo(log.machineId);
                const unit = mInfo?.measureUnit || 'h';
                const s = Number(log.startHorimeter ?? log.horimetroInicial);
                const e = Number(log.endHorimeter ?? log.horimetroFinal);
                const delta = Number.isFinite(s) && Number.isFinite(e) ? e - s : NaN;
                return (
                  <div key={log.id} className="bg-white dark:bg-[#151515] p-4 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-900 dark:text-gray-50">{formatDateBR(log.date || log.data)}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${(log.status === 'fechado' || log.status === 'Concluído') ? 'bg-emerald-100 text-emerald-800' : log.status === 'rascunho' || log.status === 'Em Andamento' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>{log.status || '—'}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-3 space-y-0.5">
                      <div><span className="font-medium">Máquina:</span> {log.machineId}</div>
                      <div><span className="font-medium">Obra:</span> {log.location || log.siteId || '—'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Variação</div>
                        <div className="font-mono">{Number.isFinite(s) ? s : '—'} - {Number.isFinite(e) ? e : '—'}</div>
                      </div>
                      <div className="bg-blue-50/30 p-2 rounded border border-blue-100 dark:border-blue-500/10">
                        <div className="text-blue-600 dark:text-blue-400 mb-1">Balanço</div>
                        <div className="font-bold text-blue-700">{Number.isFinite(delta) ? `${delta.toFixed(1)} ${unit}` : '—'}</div>
                      </div>
                      <div className="col-span-2 bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5 flex items-center gap-1">
                        <Fuel size={12} className="text-green-600" />
                        <span className="text-gray-500 dark:text-gray-400">Abastecimento:</span>
                        <span className="font-medium">{Number.isFinite(Number(log.fuel ?? log.fuelAdded)) ? `${log.fuel ?? log.fuelAdded} L` : '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EmployeeHistoryView;
