"use client";

import React, { useMemo, useState } from 'react';
import {
  HardHat, Search, Trash2, ChevronRight, UserPlus,
} from 'lucide-react';
import { ListaAprovacoes } from './ListaAprovacoes';
import { ROLE_LABELS, normalizeRole } from '@/types/auth';
import { genId } from '@/lib/utils';

interface ColaboradoresViewProps {
  employees: any[];
  dailyLogs?: any[];
  onAddEmployee?: (emp: any) => void;
  onRemoveEmployee?: (id: string) => void;
  onUpdateEmployeeStatus?: (id: string, status: string) => void;
  onOpenEmployeeHistory?: (employeeId: string) => void;
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

const getStatusBadge = (status: string) => {
  let style = 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-100';
  if (status === 'aprovado') style = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (status === 'pendente') style = 'bg-amber-100 text-amber-800 border border-amber-200';
  if (status === 'bloqueado') style = 'bg-red-100 text-red-800 border border-red-200';
  return <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${style}`}>{status}</span>;
};

export function ColaboradoresView({
  employees,
  onAddEmployee,
  onRemoveEmployee,
  onUpdateEmployeeStatus,
  onOpenEmployeeHistory,
}: ColaboradoresViewProps) {
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState('Todos');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('Todos');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState('operador');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');

  // Conta registros por operador (p/ mostrar badge ao lado do nome).
  const logCountByOperator = useMemo(() => {
    const map: Record<string, number> = {};
    (employees || []).forEach(() => {});
    return map;
  }, [employees]);

  const filteredEmployeesList = useMemo(() => {
    return (employees || []).filter((emp: any) => {
      const nomeLower = (emp.nome || emp.name || '').toLowerCase();
      const emailLower = (emp.email || '').toLowerCase();
      const queryLower = employeeSearch.toLowerCase();
      const matchesSearch = nomeLower.includes(queryLower) || emailLower.includes(queryLower);
      const roleNorm = normalizeRole(emp.role || emp.funcao);
      const matchesRole = employeeRoleFilter === 'Todos' || roleNorm === employeeRoleFilter;
      const matchesStatus = employeeStatusFilter === 'Todos' || emp.status === employeeStatusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, employeeSearch, employeeRoleFilter, employeeStatusFilter]);

  const handleEmployeeSubmit = (e: any) => {
    e.preventDefault();
    const name = newEmployeeName.trim();
    if (!name) return;
    onAddEmployee?.({
      id: genId(),
      nome: name,
      role: newEmployeeRole,
      email: newEmployeeEmail.trim() || undefined,
      status: 'aprovado',
    });
    setNewEmployeeName('');
    setNewEmployeeEmail('');
    setNewEmployeeRole('operador');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <HardHat className="mr-2 text-yellow-600" size={28} />
            Colaboradores / Equipe
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Aprovação de cadastros pendentes e gestão de todos os colaboradores. Clique em um colaborador para ver o histórico de registros diários.
          </p>
        </div>
      </div>

      {/* Cadastros Pendentes */}
      <ListaAprovacoes onStatusUpdate={onUpdateEmployeeStatus} />

      {/* Card: formulário + filtros + lista */}
      <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#101010] flex items-center justify-between">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <UserPlus size={18} className="mr-2 text-gray-600 dark:text-gray-300" /> Todos os Colaboradores
          </h3>
          <span className="text-xs bg-gray-200 text-gray-700 dark:text-gray-200 font-bold px-2 py-1 rounded-full">{employees?.length || 0}</span>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#101010]/50">
          <form onSubmit={handleEmployeeSubmit} className="flex flex-col gap-2">
            <input
              type="text"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              placeholder="Nome completo..."
              className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
            />
            <input
              type="email"
              value={newEmployeeEmail}
              onChange={(e) => setNewEmployeeEmail(e.target.value)}
              placeholder="E-mail (opcional)..."
              className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
            />
            <div className="flex gap-2">
              <select
                value={newEmployeeRole}
                onChange={(e) => setNewEmployeeRole(e.target.value)}
                className="flex-1 p-2 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-sm bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100"
              >
                <option value="administrador">Administrador</option>
                <option value="gestor">Gestor</option>
                <option value="motorista">Motorista</option>
                <option value="mecanico">Mecânico</option>
                <option value="operador">Operador</option>
              </select>
              <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 px-4 py-2 rounded-md font-semibold text-sm transition-colors cursor-pointer">
                Add
              </button>
            </div>
          </form>
        </div>

        {/* Filtros */}
        <div className="p-3 border-b border-gray-100 dark:border-white/5 bg-yellow-50/10 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full p-1.5 pl-8 text-xs border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={employeeRoleFilter}
              onChange={(e) => setEmployeeRoleFilter(e.target.value)}
              className="p-1 px-1.5 text-[11px] border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-200"
            >
              <option value="Todos">Cargos: Todos</option>
              <option value="administrador">Administrador</option>
              <option value="gestor">Gestor</option>
              <option value="motorista">Motorista</option>
              <option value="mecanico">Mecânico</option>
              <option value="operador">Operador</option>
            </select>
            <select
              value={employeeStatusFilter}
              onChange={(e) => setEmployeeStatusFilter(e.target.value)}
              className="p-1 px-1.5 text-[11px] border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-200"
            >
              <option value="Todos">Status: Todos</option>
              <option value="aprovado">Aprovados</option>
              <option value="pendente">Pendentes</option>
              <option value="bloqueado">Bloqueados</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 p-0 overflow-y-auto max-h-[60vh]">
          {filteredEmployeesList.length === 0 ? (
            <p className="text-xs text-gray-400 italic p-4 text-center">Nenhum colaborador encontrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredEmployeesList.map((emp: any) => {
                const roleNorm = normalizeRole(emp.role || emp.funcao);
                const canOpenHistory = !!onOpenEmployeeHistory && (emp.status === 'aprovado' || emp.status === 'bloqueado');
                return (
                  <li key={emp.id} className="p-3 hover:bg-gray-50 dark:bg-[#101010] flex flex-col space-y-1.5 group">
                    <div className="flex justify-between items-start">
                      <button
                        type="button"
                        disabled={!canOpenHistory}
                        onClick={() => canOpenHistory && onOpenEmployeeHistory?.(emp.id)}
                        className="min-w-0 flex-1 text-left flex items-start gap-2 disabled:cursor-default"
                        title={canOpenHistory ? 'Ver histórico de registros diários' : 'Sem histórico disponível'}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate flex items-center gap-1">
                            {emp.nome || emp.name}
                            {canOpenHistory && <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                          </div>
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 truncate" title={emp.email}>
                            {emp.email || '— sem e-mail —'}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1 items-center">
                            {getRoleBadge(emp.role || emp.funcao)}
                            {getStatusBadge(emp.status)}
                            <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                              {ROLE_LABELS[roleNorm] || ''}
                            </span>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => onRemoveEmployee?.(emp.id)}
                        className="text-gray-300 hover:text-red-600 transition-colors p-1 flex-shrink-0 cursor-pointer"
                        title="Remover colaborador"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex gap-1 pt-1.5 items-center justify-end border-t border-dashed border-gray-100 dark:border-white/5">
                      <span className="text-[9px] text-gray-400 font-medium">Ações de Status:</span>
                      {emp.status !== 'aprovado' && (
                        <button
                          type="button"
                          onClick={() => onUpdateEmployeeStatus?.(emp.id, 'aprovado')}
                          className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-150 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded cursor-pointer"
                        >
                          Aprovar/Ativar
                        </button>
                      )}
                      {emp.status === 'aprovado' && (
                        <button
                          type="button"
                          onClick={() => onUpdateEmployeeStatus?.(emp.id, 'bloqueado')}
                          className="px-1.5 py-0.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[9px] font-bold rounded cursor-pointer"
                        >
                          Bloquear
                        </button>
                      )}
                      {emp.status === 'bloqueado' && (
                        <button
                          type="button"
                          onClick={() => onUpdateEmployeeStatus?.(emp.id, 'aprovado')}
                          className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[9px] font-bold rounded cursor-pointer"
                        >
                          Desbloquear
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ColaboradoresView;
