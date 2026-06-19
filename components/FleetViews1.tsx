"use client";
import React, { useState, useMemo } from 'react';
import {
  Truck, Wrench, Users, Plus, Search, AlertTriangle,
  CheckCircle, Clock, MapPin, MoreVertical, X,
  ShieldCheck, Trash2, HardHat, Edit2, Fuel, RotateCcw,
  Upload, Download, Database
} from 'lucide-react';
import { StatusBadge, UrgencyBadge } from './ui/Badges';
import { ListaAprovacoes } from './ListaAprovacoes';
import { exportMachinesToCSV, parseMachinesCSV } from '@/lib/csvUtils';
import { genId } from '@/lib/utils';

export const DashboardView = ({ machines, maintenances, logs, alerts }: any) => {
  const total = machines.length;
  const emOperacao = machines.filter((m: any) => m.status === 'Em Operação').length;
  const disponivel = machines.filter((m: any) => m.status === 'Disponível').length;
  const emManutencao = machines.filter((m: any) => m.status === 'Em Manutenção').length;
  
  const pendentes = maintenances.filter((m: any) => m.status !== 'Concluída').length;
  const pendingAvarias = logs?.filter((l: any) => l.hasAvaria && ['Pendente Oficina', 'Aguardando Gerência', 'Aprovado Gerência'].includes(l.avariaStatus)) || [];
  const activeAlerts = alerts || [];

  // Fuel Consumption Calculations
  const today = new Date().toISOString().split('T')[0];
  
  const fuelStats = useMemo(() => {
    const stats: Record<string, { total: number; daily: number }> = {};
    
    logs?.forEach((log: any) => {
      const site = log.location || 'Não Informado';
      if (!stats[site]) {
        stats[site] = { total: 0, daily: 0 };
      }
      
      const fuelAmount = Number(log.fuel) || 0;
      stats[site].total += fuelAmount;
      
      if (log.date === today) {
        stats[site].daily += fuelAmount;
      }
    });
    
    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  }, [logs, today]);

  return (
    <div className="relative min-h-[80vh]">
      {/* Marca d'água (Logo) */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.03] mix-blend-multiply">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/logo.png" 
          alt="Codelmaq Watermark" 
          className="w-full max-w-4xl object-contain grayscale"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = document.getElementById('watermark-fallback');
            if (fallback) fallback.style.display = 'block';
          }}
        />
        <div id="watermark-fallback" className="hidden text-center text-gray-900 dark:text-gray-50">
          <div className="text-8xl font-black tracking-tighter">CODELMAQ</div>
          <div className="text-2xl font-medium tracking-widest mt-4">TERRAPLANAGEM INTELIGENTE</div>
        </div>
      </div>

      <div className="relative z-10 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Visão Geral da Frota</h2>

      {activeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="text-red-600" size={24} />
            <h3 className="text-lg font-bold text-red-800">Alertas de Manutenção Preventiva</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAlerts.map((alert: any, idx: number) => (
              <div key={idx} className="bg-white dark:bg-[#151515] p-4 rounded-lg shadow-sm border border-red-100 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-800 dark:text-gray-100">{alert.machineId}</span>
                  <span className="text-xs font-semibold bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    {alert.remaining < 0 ? `Vencido há ${Math.abs(alert.remaining)}${alert.measureUnit || 'h'}` : `Faltam ${alert.remaining}${alert.measureUnit || 'h'}`}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{alert.model}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Revisão de {alert.nextMilestone}{alert.measureUnit || 'h'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{alert.template.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white dark:bg-[#151515] p-3 sm:p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center space-x-2 sm:space-x-4">
          <div className="p-2 sm:p-3 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg text-gray-600 dark:text-gray-300 flex-shrink-0">
            <Truck size={20} className="sm:hidden" />
            <Truck size={24} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">Total de Equipamentos</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">{total}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#151515] p-3 sm:p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center space-x-2 sm:space-x-4">
          <div className="p-2 sm:p-3 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0">
            <Clock size={20} className="sm:hidden" />
            <Clock size={24} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">Em Operação</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">{emOperacao}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151515] p-3 sm:p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center space-x-2 sm:space-x-4">
          <div className="p-2 sm:p-3 bg-green-50 rounded-lg text-green-600 flex-shrink-0">
            <CheckCircle size={20} className="sm:hidden" />
            <CheckCircle size={24} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">Disponíveis no Pátio</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">{disponivel}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151515] p-3 sm:p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center space-x-2 sm:space-x-4">
          <div className="p-2 sm:p-3 bg-red-50 rounded-lg text-red-600 flex-shrink-0">
            <Wrench size={20} className="sm:hidden" />
            <Wrench size={24} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">Em Manutenção</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">{emManutencao}</p>
          </div>
        </div>
      </div>

      {/* Fuel Consumption Section */}
      <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Fuel className="text-green-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Consumo de Combustível por Obra</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fuelStats.map(([site, data]) => (
            <div key={site} className="bg-gray-50 dark:bg-[#101010] rounded-xl p-4 border border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-800 dark:text-gray-100 truncate pr-2" title={site}>{site}</span>
                <MapPin size={16} className="text-gray-400 flex-shrink-0" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#151515] p-3 rounded-lg border border-gray-100 dark:border-white/5 shadow-xs">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Total Acumulado</p>
                  <p className="text-lg font-black text-gray-900 dark:text-gray-50">{data.total.toLocaleString('pt-BR')} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">L</span></p>
                </div>
                <div className="bg-white dark:bg-[#151515] p-3 rounded-lg border border-gray-100 dark:border-white/5 shadow-xs">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-green-500 mb-1">Consumo Hoje</p>
                  <p className="text-lg font-black text-green-600">{data.daily.toLocaleString('pt-BR')} <span className="text-xs font-normal text-green-500">L</span></p>
                </div>
              </div>
            </div>
          ))}
          {fuelStats.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#101010] rounded-xl border border-dashed border-gray-200 dark:border-white/10">
              Nenhum dado de abastecimento registrado.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Ordens de Serviço Abertas</h3>
            <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{pendentes} abertas</span>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {maintenances.filter((m: any) => m.status !== 'Concluída').map((m: any) => (
              <div key={m.id} className="flex items-start p-3 hover:bg-gray-50 dark:bg-[#101010] rounded-lg transition-colors border border-gray-50">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600 mr-3 mt-1">
                  <AlertTriangle size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{m.id} - {m.type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.description}</p>
                </div>
                <UrgencyBadge urgency={m.urgency} />
              </div>
            ))}
            {pendentes === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma ordem de serviço aberta.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Avarias em Campo</h3>
            <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{pendingAvarias.length} pendentes</span>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {pendingAvarias.map((log: any) => (
              <div key={log.id} className="flex items-start p-3 hover:bg-gray-50 dark:bg-[#101010] rounded-lg transition-colors border border-gray-50">
                <div className="bg-red-100 p-2 rounded-lg text-red-600 mr-3 mt-1">
                  <Wrench size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{log.machineId}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{log.avariaDescription}</p>
                  <p className={`text-xs font-medium mt-1 ${log.avariaStatus === 'Aprovado Gerência' ? 'text-green-600' : log.avariaStatus === 'Aguardando Gerência' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {log.avariaStatus === 'Pendente Oficina' ? 'Triagem Pendente' : log.avariaStatus}
                  </p>
                </div>
              </div>
            ))}
            {pendingAvarias.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma avaria pendente.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Locais de Operação</h3>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {Array.from(new Set(machines.filter((m: any) => m.status === 'Em Operação').map((m: any) => m.location))).map((loc: any, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#101010] rounded-lg">
                <div className="flex items-center space-x-3">
                  <MapPin size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{loc}</span>
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {machines.filter((m: any) => m.location === loc).length} equipamento(s)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export const MachinesView = ({ machines, onEditMachine, onRemoveMachine }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const filteredMachines = useMemo(() => {
    return machines.filter((m: any) => {
      const matchesSearch = m.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            m.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            m.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'Todos' || m.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [machines, searchTerm, filterStatus]);

  const trucks = useMemo(() => {
    return filteredMachines.filter((m: any) => 
      m.type.toLowerCase().includes('caminhão') || 
      m.type.toLowerCase().includes('semi-reboque') || 
      m.type.toLowerCase().includes('cavalo mecânico')
    );
  }, [filteredMachines]);

  const heavyMachines = useMemo(() => {
    return filteredMachines.filter((m: any) => 
      !m.type.toLowerCase().includes('caminhão') && 
      !m.type.toLowerCase().includes('semi-reboque') && 
      !m.type.toLowerCase().includes('cavalo mecânico')
    );
  }, [filteredMachines]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Frota de Máquinas e Caminhões</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">O registro de novos equipamentos é efetuado através do Painel do Administrador.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50 dark:bg-[#101010]">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por ID, Tipo ou Marca..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['Todos', 'Disponível', 'Em Operação', 'Em Manutenção'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filterStatus === status 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-white dark:bg-[#151515] text-gray-600 dark:text-gray-300 border border-gray-300 hover:bg-gray-100 dark:bg-[#1e1e1e]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          <MachineTable title="Frota de Caminhões" data={trucks} onRemoveMachine={onRemoveMachine} />
          <MachineTable title="Frota de Máquinas" data={heavyMachines} onRemoveMachine={onRemoveMachine} />
        </div>
      </div>
    </div>
  );
};

const MachineTable = ({ title, data, onRemoveMachine }: { title: string, data: any[], onRemoveMachine?: (id: string) => void }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 px-4 pt-4">{title}</h3>
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-[#101010] text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wider">
            <th className="p-3 font-bold border-b">ID / Equipamento</th>
            <th className="p-3 font-bold border-b">Modelo</th>
            <th className="p-3 font-bold border-b">Ano Fab/Mod</th>
            <th className="p-3 font-bold border-b">Espécie Tipo</th>
            <th className="p-3 font-bold border-b">R$ Implemento</th>
            <th className="p-3 font-bold border-b">Carroceria</th>
            <th className="p-3 font-bold border-b">Chassi</th>
            <th className="p-3 font-bold border-b">Placa</th>
            <th className="p-3 font-bold border-b text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((machine: any) => (
            <tr key={machine.id} className="hover:bg-gray-50 dark:bg-[#101010]/50 transition-colors text-xs group">
              <td className="p-3">
                <div className="font-bold text-gray-900 dark:text-gray-50">{machine.id}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{machine.type}</div>
              </td>
              <td className="p-3 text-gray-700 dark:text-gray-200">{machine.brand} {machine.model}</td>
              <td className="p-3 text-gray-600 dark:text-gray-300">{machine.year}</td>
              <td className="p-3 text-gray-600 dark:text-gray-300">{machine.specieType || '-'}</td>
              <td className="p-3 text-gray-600 dark:text-gray-300">
                {machine.implementValue ? machine.implementValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
              </td>
              <td className="p-3 text-gray-600 dark:text-gray-300">{machine.bodywork || '-'}</td>
              <td className="p-3 font-mono text-[10px] text-gray-500 dark:text-gray-400">{machine.chassis || '-'}</td>
              <td className="p-3 font-mono text-[10px] text-gray-500 dark:text-gray-400">{machine.plate || '-'}</td>
              <td className="p-3 text-right">
                <div className="flex justify-end gap-1">
                  {onRemoveMachine && (
                    <button 
                      onClick={() => onRemoveMachine(machine.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Excluir veículo"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button className="p-1 text-gray-400 hover:text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1e1e1e] rounded transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={9} className="p-8 text-center text-gray-500 dark:text-gray-400">
                Nenhum equipamento encontrado nesta categoria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {/* Mobile View for this section */}
    <div className="md:hidden divide-y divide-gray-100">
      {data.map((machine: any) => (
        <div key={machine.id} className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-semibold text-gray-900 dark:text-gray-50">{machine.id}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{machine.type} ({machine.year})</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-xs font-bold text-gray-900 dark:text-gray-50">
                {machine.implementValue ? machine.implementValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
              </div>
              {onRemoveMachine && (
                <button 
                  onClick={() => onRemoveMachine(machine.id)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 dark:text-gray-400">
            <div><span className="font-bold">Modelo:</span> {machine.brand} {machine.model}</div>
            <div><span className="font-bold">Placa:</span> {machine.plate || '-'}</div>
            <div><span className="font-bold">Chassi:</span> {machine.chassis || '-'}</div>
            <div><span className="font-bold">Espécie:</span> {machine.specieType || '-'}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AdminView = ({
  machines, onAddMachine, onEditMachine, onRemoveMachine, onImportInitialMachines, onExportFleet, onImportFleetJSON,
  employees, onAddEmployee, onRemoveEmployee, onUpdateEmployeeStatus,
  sites, onAddSite, onRemoveSite,
  onResetCounters, onUndoReset, canUndoReset,
  onShowRLSModal, onCleanupLocalData,
  maintenanceTemplates, maintenancePlans, onAddTemplate, onAddMaintenancePlan, onUpdateMachine
}: any) => {
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState('Operador de Máquinas');
  const [newSite, setNewSite] = useState('');
  const [seedResult, setSeedResult] = useState<any>(null);
  const [seeding, setSeeding] = useState(false);

  // Colaboradores Filters
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState('Todos');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('Todos');

  const getStatusBadge = (status: string) => {
    let style = "bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-100";
    if (status === 'aprovado') style = "bg-emerald-100 text-emerald-800 border border-emerald-200";
    if (status === 'pendente') style = "bg-amber-100 text-amber-800 border border-amber-200";
    if (status === 'bloqueado') style = "bg-red-100 text-red-800 border border-red-200";
    return <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${style}`}>{status}</span>;
  };

  const filteredEmployeesList = useMemo(() => {
    return employees.filter((emp: any) => {
      const nomeLower = (emp.nome || '').toLowerCase();
      const queryLower = employeeSearch.toLowerCase();
      const matchesSearch = nomeLower.includes(queryLower);
      
      const matchesRole = employeeRoleFilter === 'Todos' || emp.role === employeeRoleFilter;
      const matchesStatus = employeeStatusFilter === 'Todos' || emp.status === employeeStatusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, employeeSearch, employeeRoleFilter, employeeStatusFilter]);

  // CSV States
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvPreviewRecords, setCsvPreviewRecords] = useState<any[]>([]);
  const [allCsvParsedRecords, setAllCsvParsedRecords] = useState<any[]>([]);
  const [csvImportErrors, setCsvImportErrors] = useState<string[] | null>(null);
  const [importConflictDecision, setImportConflictDecision] = useState<'substituir' | 'manter'>('substituir');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number; skipped: number } | null>(null);

  // Maintenance demo seed
  const handleSeedMaintenance = async () => {
    if (seeding) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const { computeSeedActions } = await import('@/lib/maintenanceSeed');
      const { newTemplates, newPlans, machineUpdates, templatesSkipped, plansSkipped } = computeSeedActions(
        maintenanceTemplates || [],
        maintenancePlans || [],
        machines || [],
      );

      for (const tpl of newTemplates) {
        await onAddTemplate({ ...tpl, id: genId() });
      }
      for (const plan of newPlans) {
        await onAddMaintenancePlan({ id: genId(), ...plan });
      }
      for (const upd of machineUpdates) {
        await onUpdateMachine(upd.id, { lastPreventive: upd.lastPreventive });
      }

      setSeedResult({
        templatesAdded: newTemplates.length,
        templatesSkipped,
        plansAdded: newPlans.length,
        plansSkipped,
        machinesUpdated: machineUpdates.length,
      });
    } catch (e) {
      console.error('Erro ao popular planos de manutenção:', e);
      setSeedResult({ error: true });
    } finally {
      setSeeding(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const csvStr = exportMachinesToCSV(machines);
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanAppName = "remix-codelmaq";
      const currentFormattedDate = new Date().toISOString().split('T')[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `${cleanAppName}-backup-${currentFormattedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Erro na exportação CSV: ${err.message || err}`);
    }
  };

  const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvImportErrors(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseMachinesCSV(text);

      if (parsed.errors && parsed.errors.length > 0) {
        setCsvImportErrors(parsed.errors);
        setAllCsvParsedRecords([]);
        setCsvPreviewRecords([]);
        setIsCsvImportModalOpen(true);
      } else {
        setAllCsvParsedRecords(parsed.data);
        setCsvPreviewRecords(parsed.data.slice(0, 5));
        setIsCsvImportModalOpen(true);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  const handleCSVImportConfirm = async () => {
    setIsImporting(true);
    let importedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const record of allCsvParsedRecords) {
      try {
        const existing = machines.find((m: any) => m.id === record.id);
        if (existing) {
          if (importConflictDecision === 'substituir') {
            await onEditMachine(record);
            importedCount++;
          } else {
            skippedCount++;
          }
        } else {
          await onAddMachine(record);
          importedCount++;
        }
      } catch (err) {
        console.error("Erro importando linha do CSV:", err);
        errorCount++;
      }
    }

    setImportResult({ imported: importedCount, errors: errorCount, skipped: skippedCount });
    setIsImporting(false);
  };

  const handleEmployeeSubmit = (e: any) => {
    e.preventDefault();
    if (newEmployeeName.trim() && !employees.find((emp: any) => emp.nome === newEmployeeName.trim())) {
      onAddEmployee({ id: genId(), nome: newEmployeeName.trim(), role: newEmployeeRole, status: 'aprovado' });
      setNewEmployeeName('');
    }
  };

  const handleSiteSubmit = (e: any) => {
    e.preventDefault();
    const cleanSite = newSite.trim();
    if (cleanSite && !sites.find((s: any) => (s.nome === cleanSite || s.name === cleanSite || s === cleanSite))) {
      onAddSite(cleanSite);
      setNewSite('');
    }
  };

  const getRoleBadge = (role: string) => {
    let style = "bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-100";
    if (role === 'Operador de Máquinas') style = "bg-blue-100 text-blue-800";
    if (role === 'Motorista') style = "bg-green-100 text-green-800";
    if (role === 'Mecânico') style = "bg-red-100 text-red-800";
    if (role === 'Ajudante') style = "bg-orange-100 text-orange-800";
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${style}`}>{role}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 dark:text-gray-100 flex items-center">
            <ShieldCheck className="mr-2 text-yellow-600" size={28} />
            Painel do Administrador (Cadastros Base)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Apenas administradores podem registrar novos equipamentos, membros da equipe e locais no sistema.
          </p>
        </div>
      </div>

      {/* Demo seed: popular planos de manutenção */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-300 dark:border-blue-700/50 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Database size={18} className="text-blue-700" />
              Popular Planos de Manutenção (Demo)
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-0.5 font-medium">
              Cria 4 templates de preventiva + 3 planos por máquina existente, com lastExchange já vencido para disparar os alertas no Dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSeedMaintenance}
            disabled={seeding}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            {seeding ? 'Populando...' : 'Executar Demo'}
          </button>
        </div>
        {seedResult && !seedResult.error && (
          <div className="mt-3 p-3 bg-white/70 dark:bg-black/30 border border-blue-200 dark:border-blue-700/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1 font-medium">
            <p>
              <strong>{seedResult.templatesAdded}</strong> templates criados
              {seedResult.templatesSkipped > 0 && ` (${seedResult.templatesSkipped} já existiam)`}.
            </p>
            <p>
              <strong>{seedResult.plansAdded}</strong> planos de manutenção criados
              {seedResult.plansSkipped > 0 && ` (${seedResult.plansSkipped} já existiam)`}.
            </p>
            {seedResult.machinesUpdated > 0 && (
              <p>
                <strong>{seedResult.machinesUpdated}</strong> máquinas tiveram o lastPreventive ajustado para disparar alertas.
              </p>
            )}
            <p className="pt-1 italic text-blue-700 dark:text-blue-300">
              Abra a aba &ldquo;Dashboard&rdquo; ou &ldquo;Controle Avulso&rdquo; para ver os alertas.
            </p>
          </div>
        )}
        {seedResult?.error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700/50 rounded-xl text-xs text-red-800 dark:text-red-200 font-medium">
            Erro ao popular. Verifique o console.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#151515] dark:bg-neutral-900 border-gray-200 dark:border-white/10 dark:border-neutral-800 rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-white/5 dark:border-neutral-800 bg-gray-50 dark:bg-[#101010] dark:bg-neutral-800/40 flex items-center justify-between">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 dark:text-gray-200 flex items-center">
              <Truck size={18} className="mr-2 text-gray-600 dark:text-gray-300" /> Equipamentos / Caminhões
            </h3>
            <span className="text-xs bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 dark:text-gray-300 font-bold px-2 py-1 rounded-full">{machines.length}</span>
          </div>
          <div className="p-4 border-b border-gray-100 dark:border-white/5 dark:border-neutral-800 flex flex-col gap-2">
            <button 
              onClick={() => { setEditingMachine(null); setIsMachineModalOpen(true); }}
              className="w-full bg-black dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
            >
              <Plus size={16} className="mr-2" /> Cadastrar Novo Veículo
            </button>
            <div className="relative w-full">
              <label className="w-full bg-black dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center cursor-pointer">
                <Truck size={16} className="mr-2" /> Importar Novos Veículos (JSON)
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      console.log("Nenhum arquivo selecionado.");
                      return;
                    }
                    console.log("Arquivo selecionado:", file.name, file.size, "bytes");
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const content = event.target?.result as string;
                        console.log("Conteúdo do arquivo lido com sucesso.");
                        const data = JSON.parse(content);
                        onImportFleetJSON(data);
                      } catch (err) {
                        console.error("Erro ao processar JSON:", err);
                        alert("Erro ao ler arquivo JSON: " + err);
                      }
                    };
                    reader.onerror = (err) => {
                      console.error("Erro na leitura do arquivo:", err);
                      alert("Erro ao ler arquivo.");
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }} 
                  className="hidden" 
                />
              </label>
            </div>
            
            {/* CSV Export & Import Buttons */}
            <button 
              onClick={handleExportCSV}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
            >
              <Download size={16} className="mr-2" /> Exportar CSV
            </button>

            <div className="relative w-full">
              <label className="w-full bg-black dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center cursor-pointer">
                <Upload size={16} className="mr-2" /> Importar CSV
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleImportCSVFile} 
                  className="hidden" 
                />
              </label>
            </div>

            <button 
              onClick={onExportFleet}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
            >
              <ShieldCheck size={16} className="mr-2" /> Exportar Frota (Backup JSON)
            </button>
            <button 
              onClick={() => onImportInitialMachines(false, true)}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
            >
              <Trash2 size={16} className="mr-2" /> Sincronização Forçada (Limpar e Recarregar)
            </button>
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-64">
            <ul className="divide-y divide-gray-100">
              {machines.map((m: any) => (
                <li key={m.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:bg-[#101010] transition-colors group">
                  <div className="min-w-0 pr-2">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{m.id} - {m.type}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.brand} {m.model} ({m.year})</div>
                    {m.plate && <div className="text-[10px] text-gray-400 font-mono mt-0.5">Placa: {m.plate}</div>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingMachine(m); setIsMachineModalOpen(true); }} className="text-gray-300 hover:text-blue-600 transition-colors p-1">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onRemoveMachine(m.id)} className="text-gray-300 hover:text-red-600 transition-colors p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ListaAprovacoes onStatusUpdate={onUpdateEmployeeStatus} />

        <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#101010] flex items-center justify-between">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <HardHat size={18} className="mr-2 text-gray-600 dark:text-gray-300" /> Colaboradores / Equipe
            </h3>
            <span className="text-xs bg-gray-200 text-gray-700 dark:text-gray-200 font-bold px-2 py-1 rounded-full">{employees.length}</span>
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
              <div className="flex gap-2">
                <select 
                  value={newEmployeeRole}
                  onChange={(e) => setNewEmployeeRole(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-sm bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100"
                >
                  <option value="Operador de Máquinas">Operador de Máquinas</option>
                  <option value="Motorista">Motorista</option>
                  <option value="Mecânico">Mecânico</option>
                  <option value="Ajudante">Ajudante</option>
                  <option value="Administrador">Administrador</option>
                </select>
                <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 px-4 py-2 rounded-md font-semibold text-sm transition-colors cursor-pointer">
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Filtros em Campo */}
          <div className="p-3 border-b border-gray-100 dark:border-white/5 bg-yellow-50/10 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
              <input 
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Buscar por nome..."
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
                <option value="Operador de Máquinas">Operador de Máquinas</option>
                <option value="Motorista">Motorista</option>
                <option value="Mecânico">Mecânico</option>
                <option value="Ajudante">Ajudante</option>
                <option value="Administrador">Administrador</option>
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

          <div className="flex-1 p-0 overflow-y-auto max-h-64">
            {filteredEmployeesList.length === 0 ? (
              <p className="text-xs text-gray-400 italic p-4 text-center">Nenhum colaborador encontrado.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredEmployeesList.map((emp: any) => (
                  <li key={emp.id} className="p-3 hover:bg-gray-50 dark:bg-[#101010] flex flex-col space-y-1.5 group">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{emp.nome}</div>
                        <div className="flex flex-wrap gap-1 mt-1 items-center">
                          {getRoleBadge(emp.role)}
                          {getStatusBadge(emp.status)}
                        </div>
                      </div>
                      <button onClick={() => onRemoveEmployee(emp.id)} className="text-gray-300 hover:text-red-600 transition-colors p-1 flex-shrink-0 cursor-pointer">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex gap-1 pt-1.5 items-center justify-end border-t border-dashed border-gray-100 dark:border-white/5">
                      <span className="text-[9px] text-gray-400 font-medium">Ações de Status:</span>
                      
                      {emp.status !== 'aprovado' && (
                        <button
                          type="button"
                          onClick={() => onUpdateEmployeeStatus(emp.id, 'aprovado')}
                          className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-150 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded cursor-pointer"
                        >
                          Aprovar/Ativar
                        </button>
                      )}
                      
                      {emp.status === 'aprovado' && (
                        <button
                          type="button"
                          onClick={() => onUpdateEmployeeStatus(emp.id, 'bloqueado')}
                          className="px-1.5 py-0.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[9px] font-bold rounded cursor-pointer"
                        >
                          Bloquear
                        </button>
                      )}

                      {emp.status === 'bloqueado' && (
                        <button
                          type="button"
                          onClick={() => onUpdateEmployeeStatus(emp.id, 'aprovado')}
                          className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[9px] font-bold rounded cursor-pointer"
                        >
                          Desbloquear
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#101010] flex items-center justify-between">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <MapPin size={18} className="mr-2 text-gray-600 dark:text-gray-300" /> Obras / Locais
            </h3>
            <span className="text-xs bg-gray-200 text-gray-700 dark:text-gray-200 font-bold px-2 py-1 rounded-full">{sites.length}</span>
          </div>
          <div className="p-4 border-b border-gray-100 dark:border-white/5">
            <form onSubmit={handleSiteSubmit} className="flex gap-2">
              <input 
                type="text" 
                value={newSite}
                onChange={(e) => setNewSite(e.target.value)}
                placeholder="Nome da obra ou local..." 
                className="flex-1 p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
              />
              <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 px-3 py-2 rounded-md font-semibold text-sm transition-colors">
                Add
              </button>
            </form>
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-64">
            <ul className="divide-y divide-gray-100">
              {sites.map((site: any) => (
                <li key={site.id || (typeof site === 'string' ? site : JSON.stringify(site))} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:bg-[#101010] text-sm text-gray-700 dark:text-gray-200 group">
                  {site.nome || site.name || site}
                  <button onClick={() => onRemoveSite(site.nome || site.name || site)} className="text-gray-300 hover:text-red-600 transition-colors p-1 cursor-pointer">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      <div className="bg-white dark:bg-[#151515] rounded-xl border border-red-200 shadow-sm overflow-hidden mt-6">
        <div className="bg-red-50 p-4 border-b border-red-200 flex items-center space-x-2">
          <AlertTriangle className="text-red-600" size={20} />
          <h3 className="text-lg font-bold text-red-800">Zona de Perigo / Testes</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            As ações abaixo afetam todo o sistema e devem ser usadas com cautela.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={onResetCounters}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
            >
              <AlertTriangle size={18} className="mr-2" />
              Zerar Todos os Contadores (Horímetro/KM)
            </button>
            
            <button 
              onClick={onCleanupLocalData}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
            >
              <RotateCcw size={18} className="mr-2" />
              Limpar Dados Locais (Sincronizar c/ Banco)
            </button>
            
            {canUndoReset && (
              <button 
                onClick={onUndoReset}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
              >
                <RotateCcw size={18} className="mr-2" />
                Desfazer Último Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {isMachineModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] max-w-[90vw] overflow-y-auto p-6 scrollbar-thin">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{editingMachine ? 'Editar Veículo/Máquina' : 'Cadastrar Novo Veículo/Máquina'}</h3>
              <button onClick={() => setIsMachineModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={(e: any) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const machineData = {
                id: formData.get('id'),
                type: formData.get('type'),
                brand: formData.get('brand'),
                model: formData.get('model'), 
                year: formData.get('year'),
                measureUnit: formData.get('measureUnit'),
                horimeter: Number(formData.get('horimeter')),
                specieType: formData.get('specieType'),
                bodywork: formData.get('bodywork'),
                chassis: formData.get('chassis'),
                plate: formData.get('plate'),
                renavam: formData.get('renavam'),
                implementValue: Number(formData.get('implementValue')),
                status: formData.get('status') || 'Disponível',
              };
              
              if (editingMachine) {
                onEditMachine({
                  ...editingMachine,
                  ...machineData
                });
              } else {
                onAddMachine({
                  ...machineData,
                  location: 'Pátio Central',
                  lastPreventive: machineData.horimeter || 0,
                  operator: null
                });
              }
              setIsMachineModalOpen(false);
            }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ID da Frota</label>
                  <input name="id" defaultValue={editingMachine?.id} disabled={!!editingMachine} required type="text" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100 dark:disabled:bg-[#101010] disabled:text-gray-600 dark:disabled:text-zinc-400" placeholder="Ex: CAM-005" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tipo de Equipamento</label>
                  <input name="type" defaultValue={editingMachine?.type} required type="text" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="Ex: Caminhão Basculante" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Marca</label>
                  <input name="brand" defaultValue={editingMachine?.brand} required type="text" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="Ex: Mercedes" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Modelo</label>
                  <input name="model" defaultValue={editingMachine?.model} required type="text" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="Ex: Actros" />
                </div>
                <div className="col-span-1 sm:col-span-2 bg-gray-50 dark:bg-[#101010] p-3 rounded border border-gray-200 dark:border-white/10">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Qual é a métrica de desgaste principal?</label>
                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" name="measureUnit" value="h" required defaultChecked={!editingMachine || editingMachine.measureUnit === 'h'} className="text-yellow-600 focus:ring-yellow-500 w-4 h-4 cursor-pointer" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Horímetro (Horas)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" name="measureUnit" value="km" required defaultChecked={editingMachine?.measureUnit === 'km'} className="text-yellow-600 focus:ring-yellow-500 w-4 h-4 cursor-pointer" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Quilometragem (KM)</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ano</label>
                  <input name="year" defaultValue={editingMachine?.year} required type="text" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="Ex: 2024 ou 2010/2011" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{editingMachine ? 'Leitura Atual (H/KM)' : 'Leitura Inicial (H/KM)'}</label>
                  <input name="horimeter" defaultValue={editingMachine?.horimeter} required type="number" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Espécie/Tipo</label>
                  <input name="specieType" defaultValue={editingMachine?.specieType} type="text" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="Ex: TOCO, TRUCADO" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Carroceria</label>
                  <input name="bodywork" defaultValue={editingMachine?.bodywork} type="text" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="Ex: CAÇAMBA BASCULANTE" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Chassi</label>
                  <input name="chassis" defaultValue={editingMachine?.chassis} type="text" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="Chassi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Placa</label>
                  <input name="plate" defaultValue={editingMachine?.plate} type="text" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="Placa" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Renavam</label>
                  <input name="renavam" defaultValue={editingMachine?.renavam} type="text" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="Renavam" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">R$ Implemento</label>
                  <input name="implementValue" defaultValue={editingMachine?.implementValue} type="number" step="0.01" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Status</label>
                  <select name="status" defaultValue={editingMachine?.status || 'Disponível'} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500">
                    <option value="Disponível">Disponível</option>
                    <option value="Em Operação">Em Operação</option>
                    <option value="Em Manutenção">Em Manutenção</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={() => setIsMachineModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#1e1e1e] rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-yellow-500 text-yellow-950 font-semibold rounded-md hover:bg-yellow-600">Salvar Equipamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCsvImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-[#151515] dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-white/10 dark:border-neutral-800 shadow-2xl w-full max-w-3xl max-h-[90vh] max-w-[90vw] overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-yellow-600 p-6 text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Upload size={28} />
                <div>
                  <h3 className="text-xl font-bold font-heading">Importação de Frota via CSV</h3>
                  <p className="text-xs text-yellow-100 mt-0.5">Arquivo selecionado: {csvFileName}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCsvImportModalOpen(false)}
                className="hover:bg-yellow-700 p-1.5 rounded-full transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {csvImportErrors ? (
                /* Header layout failures / structure error */
                <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-r-xl">
                  <div className="flex space-x-3">
                    <AlertTriangle className="text-red-500 shrink-0" size={20} />
                    <div>
                      <h4 className="font-bold text-red-800 dark:text-red-300">Falha na estrutura do arquivo</h4>
                      <ul className="text-sm text-red-700 dark:text-red-400 mt-2 list-disc ml-5 space-y-1 font-medium">
                        {csvImportErrors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Explanation and Settings */}
                  <div className="bg-yellow-50 dark:bg-yellow-950/10 border-l-4 border-yellow-500 p-4 rounded-r-xl space-y-2">
                    <h4 className="font-bold text-yellow-900 dark:text-yellow-300 text-sm">Configuração de Importação</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 dark:text-gray-300 mb-1 uppercase tracking-wider">
                          Resolução de conflito de ID
                        </label>
                        <select 
                          value={importConflictDecision}
                          onChange={(e: any) => setImportConflictDecision(e.target.value)}
                          className="w-full text-xs p-2.5 border border-yellow-200 dark:border-neutral-800 bg-white dark:bg-[#151515] dark:bg-neutral-800 rounded-lg text-gray-800 dark:text-gray-100 dark:text-gray-200 focus:ring-1 focus:ring-yellow-500"
                        >
                          <option value="substituir">Substituir registros existentes (Sobrescrever)</option>
                          <option value="manter">Manter existentes originais (Ignorar duplicados)</option>
                        </select>
                      </div>
                      <div className="flex flex-col justify-end">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-400 leading-relaxed font-medium">
                          Detectamos <strong>{allCsvParsedRecords.length}</strong> equipamentos no arquivo. Você pode definir se deseja sobrescrever ou ignorar em caso de conflitos.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Preview Section - First 5 rows */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 dark:text-gray-200 text-sm font-heading">
                      Visualização prévia (Primeiros 5 registros)
                    </h4>
                    <div className="border border-gray-100 dark:border-white/5 dark:border-neutral-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-gray-700 dark:text-gray-200 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-[#101010] dark:bg-neutral-800/60 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-neutral-800">
                          <tr>
                            <th className="p-3">ID Frota</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3">Marca/Modelo</th>
                            <th className="p-3">Ano</th>
                            <th className="p-3">Horímetro/KM</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                          {csvPreviewRecords.map((r, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:bg-[#101010]/50 dark:hover:bg-neutral-800/30">
                              <td className="p-3 font-semibold text-gray-900 dark:text-gray-50 dark:text-gray-100">{r.id}</td>
                              <td className="p-3">{r.type}</td>
                              <td className="p-3">{r.brand} {r.model}</td>
                              <td className="p-3">{r.year}</td>
                              <td className="p-3 font-mono">{r.horimeter} {r.measureUnit}</td>
                              <td className="p-3">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-[#1e1e1e] dark:bg-neutral-800 text-gray-700 dark:text-gray-200 dark:text-gray-300 font-bold uppercase tracking-wider">
                                  {r.status || 'Disponível'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Progress outcomes */}
                  {importResult && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 p-4 rounded-r-xl">
                      <div className="flex space-x-3">
                        <CheckCircle className="text-emerald-500 shrink-0" size={20} />
                        <div>
                          <h4 className="font-bold text-emerald-800 dark:text-emerald-300 font-heading">Importação Finalizada!</h4>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                            Resultado: <strong>{importResult.imported}</strong> registros criados/atualizados,{' '}
                            <strong>{importResult.skipped}</strong> ignorados/conflito resolvido e{' '}
                            <strong>{importResult.errors}</strong> erros de gravação.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 dark:bg-[#101010] dark:bg-neutral-800/40 border-t border-gray-100 dark:border-white/5 dark:border-neutral-800 flex justify-end space-x-2">
              <button 
                type="button"
                onClick={() => setIsCsvImportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors btn-font"
              >
                {importResult ? 'Fechar' : 'Cancelar'}
              </button>
              
              {!csvImportErrors && !importResult && (
                <button 
                  type="button"
                  disabled={isImporting}
                  onClick={handleCSVImportConfirm}
                  className="px-5 py-2 text-xs font-semibold bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white rounded-lg transition-all flex items-center justify-center shadow-lg shadow-yellow-500/15 btn-font"
                >
                  {isImporting ? 'Sincronizando...' : `Confirmar Importação de ${allCsvParsedRecords.length} Registros`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
