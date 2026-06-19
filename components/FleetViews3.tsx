"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  CheckCircle, Clock, X, Cog, PackageSearch, FileText,
  Truck, AlertOctagon, AlertTriangle, CheckCircle2, Wrench,
  Briefcase, PieChart, BarChart3, CalendarDays, ClipboardList,
  Users, Fuel, Camera, Printer, Droplets, Plus, History, ArrowDownCircle, ArrowUpCircle,
  Settings, Edit2, Trash2, Trophy, Star, TrendingUp, Award, User, Download,
  ImageIcon, Lock
} from 'lucide-react';
import { MAINTENANCE_DB, defaultChecklistItems } from '@/lib/data';
import { generateFuelTruckPDF, generatePerformancePDF, generateFieldMetricsPDF } from '@/lib/pdfUtils';
import { genId, formatDateBR, safeTimeOf, safeParseDate } from '@/lib/utils';
import { localDb, LocalPenalty } from '@/lib/localDb';
import { PenaltyModal } from './PenaltyModal';

export const PerformanceView = ({
  scoringRules,
  pointsHistory,
  monthlyRanking,
  employees,
  userProfile,
  logs,
  isAdmin = false,
}: any) => {
  const [activeTab, setActiveTab] = useState('ranking');
  const [penalties, setPenalties] = useState<LocalPenalty[]>([]);
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);

  // Reload penalties from local DB
  const reloadPenalties = useCallback(async () => {
    try {
      const list = await localDb.penalties.toArray();
      setPenalties(list.sort((a, b) => (b.dataEvento || '').localeCompare(a.dataEvento || '')));
    } catch (e) {
      console.error('Erro ao carregar penalidades:', e);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      reloadPenalties();
    }, 0);
    return () => clearTimeout(id);
  }, [reloadPenalties]);

  // Determine active operator's name
  const userNome = userProfile?.nome || "João Silva";

  // Calculate total points for each driver
  const driverPoints = useMemo(() => {
    const points: Record<string, number> = {};
    (pointsHistory || []).forEach((log: any) => {
      points[log.id_motorista] = (points[log.id_motorista] || 0) + log.valor_aplicado;
    });
    return points;
  }, [pointsHistory]);

  // Personal statistics derived from daily logs
  const userLogs = useMemo(() => {
    return (logs || []).filter((log: any) => {
      const matchOperatorId = log.operatorId === userProfile?.id;
      const matchOperatorName = (log.operatorName || '').toLowerCase() === userNome.toLowerCase();
      const matchMotoristaName = (log.motorista || '').toLowerCase() === userNome.toLowerCase();
      return matchOperatorId || matchOperatorName || matchMotoristaName;
    });
  }, [logs, userProfile, userNome]);

  const userStats = useMemo(() => {
    let totalChecklists = userLogs.length;
    let totalHours = userLogs.reduce((sum: number, log: any) => {
      const duration = Number(log.horimetroFinal || 0) - Number(log.horimetroInicial || 0);
      return sum + (duration > 0 ? duration : 0);
    }, 0);
    
    let totalFuel = userLogs.reduce((sum: number, log: any) => sum + Number(log.fuelAdded || 0), 0);
    let avariasCount = userLogs.filter((log: any) => log.hasAvaria).length;
    let avgHours = totalChecklists > 0 ? (totalHours / totalChecklists).toFixed(1) : "0";

    return {
      totalChecklists,
      totalHours,
      totalFuel,
      avariasCount,
      avgHours
    };
  }, [userLogs]);

  // User position inside ranking
  const userRankPosition = useMemo(() => {
    const sorted = [...(monthlyRanking || [])].sort((a, b) => b.pontos_acumulados - a.pontos_acumulados);
    const index = sorted.findIndex((rank: any) => (rank.id_motorista || '').toLowerCase() === userNome.toLowerCase());
    return index !== -1 ? index + 1 : null;
  }, [monthlyRanking, userNome]);

  const userRankData = useMemo(() => {
    return (monthlyRanking || []).find((rank: any) => (rank.id_motorista || '').toLowerCase() === userNome.toLowerCase());
  }, [monthlyRanking, userNome]);

  const personalPointsValue = useMemo(() => {
    return userRankData ? userRankData.pontos_acumulados : (driverPoints[userNome] || 0);
  }, [userRankData, driverPoints, userNome]);

  // Sort ranking by points descending
  const sortedRanking = useMemo(() => {
    return [...(monthlyRanking || [])].sort((a, b) => b.pontos_acumulados - a.pontos_acumulados);
  }, [monthlyRanking]);

  // Sort history by date descending
  const sortedHistory = useMemo(() => {
    return [...(pointsHistory || [])].sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime());
  }, [pointsHistory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Trophy className="mr-2 text-yellow-500" size={28} />
            Meu Desempenho e Ranking
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Profissional ativo: <strong className="text-[#eab308] font-semibold">{userNome}</strong> ({userProfile?.role || 'Colaborador'})
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setPenaltyModalOpen(true)}
              className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors border border-red-200 cursor-pointer"
              title="Aplicar penalidade a um operador (debita pontos)"
            >
              <AlertOctagon size={18} className="mr-2" />
              Aplicar Penalidade
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => generatePerformancePDF(sortedRanking, sortedHistory)}
              className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors border border-red-200 cursor-pointer"
              title="Baixar relatório em PDF (apenas admin)"
            >
              <Download size={18} className="mr-2" />
              Exportar PDF
            </button>
          )}
        </div>
      </div>

      {/* Minhas Penalidades em Destaque — acima do Bento Grid */}
      {(() => {
        const filtered = isAdmin
          ? penalties
          : penalties.filter((p) => p.operatorId === userProfile?.id);
        const recent = filtered.slice(0, 3);
        const total = filtered.reduce((acc, p) => acc + p.points, 0);
        const hasPenalties = recent.length > 0;

        return (
          <div
            className={`relative overflow-hidden rounded-2xl border-2 p-4 md:p-5 shadow-sm ${
              hasPenalties
                ? 'bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-red-300 dark:from-red-900/20 dark:via-orange-900/20 dark:to-red-900/20 dark:border-red-700/50'
                : 'bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border-emerald-300 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-emerald-900/20 dark:border-emerald-700/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                    hasPenalties
                      ? 'bg-red-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {hasPenalties ? <AlertOctagon size={22} /> : <CheckCircle2 size={22} />}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-[10px] md:text-xs uppercase font-black tracking-wider ${
                      hasPenalties ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {isAdmin ? 'Penalidades Recentes (toda a frota)' : 'Minhas Penalidades'}
                  </p>
                  <h3
                    className={`text-lg md:text-xl font-black leading-tight ${
                      hasPenalties ? 'text-red-900 dark:text-red-100' : 'text-emerald-900 dark:text-emerald-100'
                    }`}
                  >
                    {hasPenalties
                      ? `${filtered.length} ${filtered.length === 1 ? 'penalidade ativa' : 'penalidades ativas'} — ${total} pts`
                      : 'Você está em dia — continue assim!'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('penalties')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap flex-shrink-0 cursor-pointer transition-colors ${
                  hasPenalties
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {hasPenalties ? 'Ver todas' : 'Ver histórico'}
              </button>
            </div>

            {hasPenalties ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                {recent.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white/80 dark:bg-black/30 border-2 border-red-200 dark:border-red-800/50 rounded-xl p-3 flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 flex items-center justify-center flex-shrink-0">
                      <AlertOctagon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                        {p.infractionLabel}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono font-black text-red-700 dark:text-red-300">
                          {p.points} pts
                        </span>
                        <span className="text-[10px] text-gray-600 dark:text-gray-400">
                          · {new Date(p.dataEvento).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs md:text-sm text-emerald-800 dark:text-emerald-200 font-medium">
                {isAdmin
                  ? 'Nenhuma penalidade foi aplicada na frota ainda.'
                  : 'Mantenha a excelência: faça o checklist, cuide do equipamento e respeite as regras de segurança.'}
              </p>
            )}
          </div>
        );
      })()}

      {/* Bento Grid — Resumo Operacional de Desempenho */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pontuação */}
        <div className="bg-gradient-to-br from-amber-100 to-yellow-50 border-2 border-amber-400 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-25 text-amber-600">
            <Trophy size={40} />
          </div>
          <div>
            <p className="text-xs font-black text-amber-900 uppercase tracking-wider">Pontuação Geral</p>
            <h4 className="text-3xl font-black text-amber-950 mt-1">{personalPointsValue} <span className="text-xs font-bold text-amber-800">pts</span></h4>
          </div>
          <div className="mt-4 pt-3 border-t-2 border-amber-300 flex justify-between items-center text-xs">
            <span className="text-amber-900 font-bold">Nível sugerido:</span>
            <span className="font-extrabold uppercase text-amber-950 bg-amber-300 px-2 py-0.5 rounded-md">
              {personalPointsValue >= 900 ? '🥇 Ouro' : personalPointsValue >= 700 ? '🥈 Prata' : '🥉 Bronze'}
            </span>
          </div>
        </div>

        {/* Card 2: Ranking Position */}
        <div className="bg-white dark:bg-[#151515] border-2 border-gray-300 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-10 text-yellow-500">
            <Award size={40} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Posição no Ranking</p>
            <h4 className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-1">
              {userRankPosition ? `#${userRankPosition}º` : 'Sem rank'}
            </h4>
          </div>
          <div className="mt-4 pt-3 border-t-2 border-gray-200 dark:border-white/5 flex justify-between items-center text-xs">
            <span className="text-gray-700 dark:text-gray-300 font-bold">Situação de Posição:</span>
            <span className={`font-black ${userRankData?.posicao_anterior > userRankPosition ? 'text-green-700' : 'text-gray-700 dark:text-gray-300'}`}>
              {userRankData?.posicao_anterior > userRankPosition ? '📈 Subindo' : 'Stable'}
            </span>
          </div>
        </div>

        {/* Card 3: Checklists Realizados */}
        <div className="bg-white dark:bg-[#151515] border-2 border-gray-300 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-10 text-emerald-500">
            <CheckCircle2 size={40} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Checklists / Turnos</p>
            <h4 className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-1">{userStats.totalChecklists} <span className="text-xs font-bold text-gray-700 dark:text-gray-300">enviados</span></h4>
          </div>
          <div className="mt-4 pt-3 border-t-2 border-gray-200 dark:border-white/5 flex justify-between items-center text-xs">
            <span className="text-gray-700 dark:text-gray-300 font-bold">Avarias relatadas:</span>
            <span className={`font-black ${userStats.avariasCount > 0 ? 'text-amber-700' : 'text-gray-700 dark:text-gray-300'}`}>
              ⚠️ {userStats.avariasCount}
            </span>
          </div>
        </div>

        {/* Card 4: Horômetro em campo */}
        <div className="bg-white dark:bg-[#151515] border-2 border-gray-300 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-10 text-blue-500">
            <Clock size={40} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Tempo de Plantão</p>
            <h4 className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-1">{userStats.totalHours.toFixed(1)} <span className="text-xs font-bold text-gray-700 dark:text-gray-300">horas</span></h4>
          </div>
          <div className="mt-4 pt-3 border-t-2 border-gray-200 dark:border-white/5 flex justify-between items-center text-xs">
            <span className="text-gray-700 dark:text-gray-300 font-bold">Horas médias úteis:</span>
            <span className="font-black text-gray-900 dark:text-gray-100">{userStats.avgHours}h / turno</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap border-b border-gray-200 dark:border-white/10 -mb-px">
        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex-1 min-w-[33%] sm:flex-none sm:min-w-0 px-3 sm:px-6 py-3 text-xs sm:text-sm font-bold transition-colors border-b-2 text-center whitespace-nowrap ${activeTab === 'ranking' ? 'border-[#eab308] text-[#eab308]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'} cursor-pointer`}
        >
          <span className="sm:hidden">Ranking</span>
          <span className="hidden sm:inline">Ranking Mensal</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[33%] sm:flex-none sm:min-w-0 px-3 sm:px-6 py-3 text-xs sm:text-sm font-bold transition-colors border-b-2 text-center whitespace-nowrap ${activeTab === 'history' ? 'border-[#eab308] text-[#eab308]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'} cursor-pointer`}
        >
          <span className="sm:hidden">Extrato</span>
          <span className="hidden sm:inline">Meu Extrato de Pontos</span>
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 min-w-[33%] sm:flex-none sm:min-w-0 px-3 sm:px-6 py-3 text-xs sm:text-sm font-bold transition-colors border-b-2 text-center whitespace-nowrap ${activeTab === 'rules' ? 'border-[#eab308] text-[#eab308]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'} cursor-pointer`}
        >
          <span className="sm:hidden">Regras</span>
          <span className="hidden sm:inline">Regras de Pontuação</span>
        </button>
        <button
          onClick={() => setActiveTab('help')}
          className={`flex-1 min-w-[33%] sm:flex-none sm:min-w-0 px-3 sm:px-6 py-3 text-xs sm:text-sm font-bold transition-colors border-b-2 text-center whitespace-nowrap ${activeTab === 'help' ? 'border-[#eab308] text-[#eab308]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'} cursor-pointer`}
        >
          <span className="sm:hidden">Ajuda</span>
          <span className="hidden sm:inline">Regras e Ajuda</span>
        </button>
        <button
          onClick={() => setActiveTab('penalties')}
          className={`flex-1 min-w-[33%] sm:flex-none sm:min-w-0 px-3 sm:px-6 py-3 text-xs sm:text-sm font-bold transition-colors border-b-2 text-center whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === 'penalties' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'} cursor-pointer`}
        >
          <AlertOctagon size={14} />
          <span className="sm:hidden">Penalidades</span>
          <span className="hidden sm:inline">{isAdmin ? 'Penalidades Aplicadas' : 'Minhas Penalidades'}</span>
        </button>
      </div>

      {activeTab === 'ranking' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top 3 Podium */}
            {sortedRanking.slice(0, 3).map((rank: any, index: number) => (
              <div key={`podium-${rank.id_motorista || 'unknown'}-${index}`} className={`relative p-6 rounded-2xl border-2 flex flex-col items-center text-center shadow-sm ${index === 0 ? 'bg-yellow-50 border-yellow-200 scale-105 z-10' : index === 1 ? 'bg-gray-50 dark:bg-[#101010] border-gray-200 dark:border-white/10' : 'bg-orange-50 border-orange-200'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-400 text-white' : 'bg-orange-400 text-white'}`}>
                  {index === 0 ? <Trophy size={32} /> : index === 1 ? <Award size={32} /> : <Star size={32} />}
                </div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{rank.id_motorista}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{index === 0 ? '1º Lugar' : index === 1 ? '2º Lugar' : '3º Lugar'}</p>
                <div className="text-3xl font-black text-gray-900 dark:text-gray-50">{rank.pontos_acumulados} pts</div>
                <div className="mt-2 text-xs font-bold text-green-600 flex items-center">
                  <TrendingUp size={12} className="mr-1" />
                  {rank.posicao_anterior - (index + 1) > 0 ? `Subiu ${rank.posicao_anterior - (index + 1)} posições` : 'Manteve posição'}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#101010]">
              <h3 className="font-bold text-gray-700 dark:text-gray-200">Ranking Geral</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#101010] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                  <th className="p-4 font-medium">Posição</th>
                  <th className="p-4 font-medium">Motorista</th>
                  <th className="p-4 font-medium text-right">Pontos</th>
                  <th className="p-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRanking.map((rank: any, index: number) => (
                  <tr key={`rank-row-${rank.id_motorista || 'unknown'}-${index}`} className="hover:bg-gray-50 dark:bg-[#101010] transition-colors">
                    <td className="p-4 font-bold text-gray-600 dark:text-gray-300">#{index + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold text-xs">
                          {rank.id_motorista.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-100">{rank.id_motorista}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-black text-gray-900 dark:text-gray-50">{rank.pontos_acumulados}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${rank.pontos_acumulados > 100 ? 'bg-green-100 text-green-700' : rank.pontos_acumulados > 50 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-200'}`}>
                        {rank.pontos_acumulados > 100 ? 'Elite' : rank.pontos_acumulados > 50 ? 'Pro' : 'Iniciante'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#101010] flex justify-between items-center">
            <h3 className="font-bold text-gray-700 dark:text-gray-200">Extrato Detalhado</h3>
            <div className="text-sm font-bold text-blue-600">Total: {Object.values(driverPoints).reduce((a: any, b: any) => a + b, 0)} pts</div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#101010] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Evento</th>
                <th className="p-4 font-medium text-right">Pontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedHistory.map((log: any, index: number) => (
                <tr key={log.id_log || `log-history-${index}`} className="hover:bg-gray-50 dark:bg-[#101010] transition-colors">
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                    {new Date(log.data_evento).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-800 dark:text-gray-100">{log.id_regra}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Ref: {log.referencia_id}</div>
                  </td>
                  <td className={`p-4 text-right font-bold ${log.valor_aplicado > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {log.valor_aplicado > 0 ? '+' : ''}{log.valor_aplicado}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(scoringRules || []).map((rule: any, index: number) => (
            <div key={rule.id_regra || `rule-item-${index}`} className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100">{rule.descricao}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Tipo: {rule.tipo_calculo}</p>
              </div>
              <div className={`text-xl font-black px-4 py-2 rounded-lg ${rule.valor_pontos > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {rule.valor_pontos > 0 ? '+' : ''}{rule.valor_pontos}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'help' && (
        <div className="space-y-8 max-w-4xl mx-auto bg-white dark:bg-[#151515] p-8 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="text-center space-y-4">
            <h3 className="text-3xl font-black text-gray-900 dark:text-gray-50 flex items-center justify-center">
              <Trophy className="mr-3 text-yellow-500" size={36} />
              Programa de Excelência CODELMAQ
            </h3>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400 italic">&quot;Quem cuida, ganha!&quot;</p>
            <p className="text-gray-800 dark:text-gray-100 leading-relaxed font-medium">
              Bem-vindo ao seu painel de desempenho! Este programa foi criado para reconhecer os melhores profissionais da nossa frota. Aqui, cada ação sua no dia a dia conta pontos para prêmios e bônus mensais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-50 flex items-center border-b-2 border-green-300 pb-2">
                <ClipboardList className="mr-2 text-green-700" size={20} />
                📝 Como acumular pontos?
              </h4>
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">É simples: basta fazer o que você já faz de melhor, com atenção aos detalhes!</p>
              <ul className="space-y-3">
                <li className="flex justify-between items-center p-3.5 bg-green-100 rounded-lg border-2 border-green-300 shadow-sm">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-50">Checklist em dia</span>
                  <span className="font-black text-green-800 text-base">+10 pts/dia</span>
                </li>
                <li className="flex justify-between items-center p-3.5 bg-green-100 rounded-lg border-2 border-green-300 shadow-sm">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-50">Máquina/Caminhão Limpo</span>
                  <span className="font-black text-green-800 text-base">+50 pts/semana</span>
                </li>
                <li className="flex justify-between items-center p-3.5 bg-green-100 rounded-lg border-2 border-green-300 shadow-sm">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-50">Direção Segura</span>
                  <span className="font-black text-green-800 text-base">+200 pts/mês</span>
                </li>
                <li className="flex justify-between items-center p-3.5 bg-green-100 rounded-lg border-2 border-green-300 shadow-sm">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-50">Economia de Combustível</span>
                  <span className="font-black text-green-800 text-base">+150 pts/mês</span>
                </li>
                <li className="flex justify-between items-center p-3.5 bg-green-100 rounded-lg border-2 border-green-300 shadow-sm">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-50">Olho de Águia</span>
                  <span className="font-black text-green-800 text-base">+100 pts</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-50 flex items-center border-b-2 border-red-300 pb-2">
                <AlertTriangle className="mr-2 text-red-700" size={20} />
                ⚠️ Fique atento às penalidades
              </h4>
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">Para mantermos a segurança de todos, alguns pontos podem ser retirados:</p>
              <ul className="space-y-3">
                <li className="flex justify-between items-center p-3.5 bg-red-100 rounded-lg border-2 border-red-300 shadow-sm">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-50">Deixar de fazer o Daily Check</span>
                  <span className="font-black text-red-800 text-base">-50 pts</span>
                </li>
                <li className="flex justify-between items-center p-3.5 bg-red-100 rounded-lg border-2 border-red-300 shadow-sm">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-50">Multas ou avarias por descuido</span>
                  <span className="font-black text-red-800 text-base">-300 a -500 pts</span>
                </li>
                <li className="flex justify-between items-center p-3.5 bg-red-100 rounded-lg border-2 border-red-300 shadow-sm">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-50">Motor ocioso sem necessidade</span>
                  <span className="font-black text-red-800 text-base">-20 pts</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <Award className="mr-2 text-yellow-600" size={20} />
              🎁 Níveis e Premiações
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-400 rounded-xl text-center shadow-sm">
                <div className="text-3xl mb-1">🥇</div>
                <div className="font-black text-yellow-900 text-lg mb-1 uppercase tracking-wider">OURO</div>
                <div className="text-xs text-yellow-900 font-black mb-2">Acima de 900 pts</div>
                <p className="text-xs text-gray-900 dark:text-gray-900 font-bold">Bônus máximo no cartão + Certificado de Operador Elite.</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-400 rounded-xl text-center shadow-sm">
                <div className="text-3xl mb-1">🥈</div>
                <div className="font-black text-gray-900 text-lg mb-1 uppercase tracking-wider">PRATA</div>
                <div className="text-xs text-gray-900 font-black mb-2">700 a 899 pts</div>
                <p className="text-xs text-gray-900 font-bold">Bônus intermediário no cartão + Kit Codelmaq.</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-orange-100 to-orange-200 border-2 border-orange-400 rounded-xl text-center shadow-sm">
                <div className="text-3xl mb-1">🥉</div>
                <div className="font-black text-orange-900 text-lg mb-1 uppercase tracking-wider">BRONZE</div>
                <div className="text-xs text-orange-900 font-black mb-2">500 a 699 pts</div>
                <p className="text-xs text-gray-900 font-bold">Reconhecimento no mural e participação em sorteios.</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-6 rounded-2xl border-2 border-blue-300 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Cog size={80} />
            </div>
            <h4 className="text-blue-900 font-black text-base flex items-center mb-2">
              <Droplets className="mr-2" size={18} />
              💡 Dica do Engenheiro:
            </h4>
            <p className="text-blue-950 italic font-bold relative z-10">
              &quot;O segredo para chegar no Ouro não é correr, é ter constância. Quem faz o checklist todo dia e cuida da máquina como se fosse sua, sempre termina o mês no topo do ranking!&quot;
            </p>
          </div>
        </div>
      )}

      {activeTab === 'penalties' && (
        <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="font-black text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertOctagon size={18} />
                {isAdmin ? 'Penalidades Aplicadas' : 'Minhas Penalidades'}
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1 font-medium">
                {isAdmin
                  ? 'Histórico de penalidades aplicadas aos operadores. Você vê a foto de evidência.'
                  : 'Histórico de infrações registradas contra você. A foto é confidencial e visível apenas à gestão.'}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setPenaltyModalOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-500/20"
              >
                <Plus size={14} />
                Nova Penalidade
              </button>
            )}
          </div>

          {(() => {
            const filtered = isAdmin
              ? penalties
              : penalties.filter((p) => p.operatorId === userProfile?.id);

            if (filtered.length === 0) {
              return (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-3">
                    <CheckCircle2 size={32} />
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-300 font-bold text-base">
                    {isAdmin ? 'Nenhuma penalidade aplicada ainda.' : 'Parabéns! Você não possui penalidades registradas.'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 font-medium">
                    {isAdmin ? 'Use o botão acima para registrar uma nova infração.' : 'Continue mantendo a excelência!'}
                  </p>
                </div>
              );
            }

            const totalPenalty = filtered.reduce((acc, p) => acc + p.points, 0);
            return (
              <div>
                <div className="p-3 bg-gray-50 dark:bg-[#101010] border-b border-gray-200 dark:border-white/10 flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-200">
                    {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
                  </span>
                  <span className={`font-black text-base ${totalPenalty < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {totalPenalty} pts
                  </span>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-white/5">
                  {filtered.map((p) => (
                    <div key={p.id} className="p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-[#101010] transition-colors">
                      {isAdmin && p.photoEvidencia ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-red-300 flex-shrink-0 group">
                          <img src={p.photoEvidencia} alt="evidência" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon size={16} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
                          <Lock size={18} />
                          <span className="text-[8px] mt-1 font-bold uppercase tracking-wider">Confidencial</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            {p.infractionLabel}
                          </p>
                          <span className={`px-2 py-0.5 rounded-md font-black text-sm whitespace-nowrap ${p.points < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {p.points} pts
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-medium">
                          {isAdmin ? (
                            <>Operador: <strong>{p.operatorName}</strong></>
                          ) : (
                            <>Aplicado por: <strong>{p.aplicadoPorNome}</strong></>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                          {new Date(p.dataEvento).toLocaleString('pt-BR')}
                        </p>
                        {p.observacoes && (
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-1.5 italic border-l-2 border-gray-300 dark:border-white/10 pl-2">
                            &quot;{p.observacoes}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {isAdmin && (
        <PenaltyModal
          open={penaltyModalOpen}
          onClose={() => setPenaltyModalOpen(false)}
          employees={employees || []}
          currentUserProfile={userProfile}
          onApplied={reloadPenalties}
        />
      )}
    </div>
  );
};

export const FuelTruckView = ({ stock, refills, onRefill, onEditRefill, onDeleteRefill, machines, onMachineRefill, isAdmin }: any) => {
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [isMachineRefillModalOpen, setIsMachineRefillModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [editModal, setEditModal] = useState({ isOpen: false, data: null as any });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: '' });
  const [refillError, setRefillError] = useState<string | null>(null);
  const capacity = 5000;
  const percentage = (stock / capacity) * 100;

  const handleRefill = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amount = Number(formData.get('amount'));
    const date = formData.get('date');
    const supplier = formData.get('supplier');

    onRefill({
      id: `REF-${genId().split('-')[0]}`,
      date,
      amount,
      supplier,
      type: 'Entrada'
    });
    setIsRefillModalOpen(false);
  };

  const handleEditSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amount = Number(formData.get('amount'));
    const date = formData.get('date');
    const supplier = formData.get('supplier');
    const machineId = formData.get('machineId');

    onEditRefill({
      ...editModal.data,
      date,
      amount,
      supplier: supplier || null,
      machineId: machineId || null
    });
    setEditModal({ isOpen: false, data: null });
  };

  const handleMachineRefillSubmit = (e: any) => {
    e.preventDefault();
    if (stock <= 0) {
      setRefillError('Estoque do caminhão zerado. Abasteça o caminhão antes de debitar para um equipamento.');
      return;
    }
    const formData = new FormData(e.target);
    const amount = Number(formData.get('amount'));
    const machineId = formData.get('machineId');
    const date = formData.get('date');

    if (!machineId) {
      setRefillError('Selecione um equipamento.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setRefillError('A quantidade deve ser maior que zero.');
      return;
    }
    if (amount > stock) {
      setRefillError(`Estoque insuficiente: ${stock}L disponíveis no caminhão.`);
      return;
    }

    onMachineRefill({
      id: `DEB-${genId().split('-')[0]}`,
      date,
      amount,
      machineId,
      type: 'Débito'
    });
    setRefillError(null);
    setIsMachineRefillModalOpen(false);
  };

  const handleAdjustmentSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amount = Number(formData.get('amount'));
    const type = formData.get('type');
    const date = formData.get('date');
    const reason = formData.get('reason');

    onRefill({
      id: `ADJ-${genId().split('-')[0]}`,
      date,
      amount,
      supplier: `Ajuste: ${reason}`,
      type: type === 'Entrada' ? 'Entrada' : 'Débito'
    });
    setIsAdjustmentModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Fuel className="mr-2 text-green-600" size={28} />
            Controle do Caminhão Comboio
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestão de estoque de diesel e abastecimentos da frota.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button 
            onClick={() => generateFuelTruckPDF(refills, machines, stock)}
            className="bg-[#eab308] hover:bg-yellow-600 text-yellow-950 font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-all shadow-sm text-sm"
            title="Baixar relatório em PDF"
          >
            <Download size={18} className="mr-2" />
            Exportar PDF
          </button>
          {isAdmin && (
            <button 
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="bg-black dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white px-4 py-2 rounded-lg flex items-center justify-center shadow-sm transition-all text-sm"
            >
              <Settings size={20} className="mr-2" />
              Ajuste Manual
            </button>
          )}
          <button 
            onClick={() => {
              setIsMachineRefillModalOpen(true);
              setRefillError(null);
            }}
            className="bg-black dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white px-4 py-2 rounded-lg flex items-center justify-center shadow-sm transition-all text-sm"
          >
            <Truck size={20} className="mr-2" />
            Abastecer Equipamento
          </button>
          <button 
            onClick={() => setIsRefillModalOpen(true)}
            className="bg-black dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white px-4 py-2 rounded-lg flex items-center justify-center shadow-sm transition-all text-sm"
          >
            <Plus size={20} className="mr-2" />
            Registrar Recebimento (Diesel)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Card */}
        <div className="lg:col-span-1 bg-white dark:bg-[#151515] p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center">
              <Droplets className="mr-2 text-blue-500" size={20} />
              Estoque Atual
            </h3>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${percentage < 20 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {percentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-100 stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
                <circle 
                  className={`${percentage < 20 ? 'text-red-500' : 'text-green-500'} stroke-current transition-all duration-1000`} 
                  strokeWidth="10" 
                  strokeDasharray={`${percentage * 2.51} 251`} 
                  strokeLinecap="round" 
                  fill="transparent" 
                  r="40" cx="50" cy="50" 
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="50" fontFamily="sans-serif" fontSize="12" textAnchor="middle" alignmentBaseline="middle" className="font-black fill-gray-800">
                  {stock.toLocaleString('pt-BR')}L
                </text>
                <text x="50" y="65" fontFamily="sans-serif" fontSize="6" textAnchor="middle" alignmentBaseline="middle" className="fill-gray-400 uppercase tracking-widest font-bold">
                  de {capacity}L
                </text>
              </svg>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Capacidade Total</span>
              <span className="font-bold text-gray-800 dark:text-gray-100">5.000 Litros</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className={`font-bold ${percentage < 20 ? 'text-red-600' : 'text-green-600'}`}>
                {percentage < 20 ? 'Estoque Crítico' : 'Estoque Normal'}
              </span>
            </div>
          </div>
        </div>

        {/* History Card */}
        <div className="lg:col-span-2 bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#101010] flex items-center justify-between">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center">
              <History className="mr-2 text-gray-500 dark:text-gray-400" size={20} />
              Histórico de Movimentação
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#101010] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                  <th className="p-4 font-medium">Data</th>
                  <th className="p-4 font-medium">Tipo</th>
                  <th className="p-4 font-medium">Origem/Destino</th>
                  <th className="p-4 font-medium text-right">Volume</th>
                  {isAdmin && <th className="p-4 font-medium text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...refills].sort((a: any, b: any) => safeTimeOf(b.date) - safeTimeOf(a.date)).map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:bg-[#101010] transition-colors">
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {formatDateBR(item.date)}
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center text-xs font-bold ${item.type === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.type === 'Entrada' ? <ArrowUpCircle size={14} className="mr-1" /> : <ArrowDownCircle size={14} className="mr-1" />}
                        {item.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-800 dark:text-gray-100">
                      {item.supplier || item.machineId || '-'}
                    </td>
                    <td className={`p-4 text-sm font-bold text-right ${item.type === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.type === 'Entrada' ? '+' : '-'}{item.amount.toLocaleString('pt-BR')} L
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button 
                            onClick={() => setEditModal({ isOpen: true, data: item })}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ isOpen: true, id: item.id })}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {refills.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400 italic">
                      Nenhuma movimentação registrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] max-w-[90vw] overflow-y-auto p-6 transform transition-all">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">Excluir Registro?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita e afetará o estoque atual do caminhão.
              </p>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setDeleteConfirm({ isOpen: false, id: '' })}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onDeleteRefill(deleteConfirm.id);
                    setDeleteConfirm({ isOpen: false, id: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-md max-h-[90vh] max-w-[90vw] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <Settings className="mr-2 text-amber-600" />
                Ajuste Manual de Estoque
              </h3>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={handleAdjustmentSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tipo de Ajuste</label>
                <select name="type" required className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-amber-500 focus:border-amber-500">
                  <option value="Entrada">Entrada (Aumentar Estoque)</option>
                  <option value="Débito">Saída (Diminuir Estoque)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Quantidade (Litros)</label>
                <input name="amount" required type="number" min="1" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-amber-500 focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data</label>
                <input name="date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-amber-500 focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Motivo do Ajuste</label>
                <input name="reason" required type="text" placeholder="Ex: Correção de erro de digitação" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-amber-500 focus:border-amber-500" />
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={() => setIsAdjustmentModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#1e1e1e] rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-700 shadow-sm">Confirmar Ajuste</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-md max-h-[90vh] max-w-[90vw] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <Edit2 className="mr-2 text-blue-600" />
                Editar Registro
              </h3>
              <button onClick={() => setEditModal({ isOpen: false, data: null })} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data</label>
                <input name="date" required type={editModal.data.type === 'Entrada' ? 'date' : 'datetime-local'} defaultValue={editModal.data.date} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Quantidade (Litros)</label>
                <input name="amount" required type="number" min="1" defaultValue={editModal.data.amount} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              {editModal.data.type === 'Entrada' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Fornecedor / Nota Fiscal</label>
                  <input name="supplier" required type="text" defaultValue={editModal.data.supplier} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Equipamento</label>
                  <select name="machineId" required defaultValue={editModal.data.machineId} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-blue-500 focus:border-blue-500">
                    {machines.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.id} - {m.model}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={() => setEditModal({ isOpen: false, data: null })} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#1e1e1e] rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 shadow-sm">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Machine Refill Modal */}
      {isMachineRefillModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-md max-h-[90vh] max-w-[90vw] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <Truck className="mr-2 text-blue-600" />
                Abastecimento de Equipamento
              </h3>
              <button onClick={() => { setIsMachineRefillModalOpen(false); setRefillError(null); }} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleMachineRefillSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Equipamento</label>
                <select
                  name="machineId"
                  required
                  className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um equipamento...</option>
                  {machines.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.id} - {m.model} ({m.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data/Hora</label>
                <input
                  name="date"
                  required
                  type="datetime-local"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Quantidade (Litros)</label>
                <input
                  name="amount"
                  required
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ex: 50"
                  onInput={(e: any) => {
                    const v = Number(e.target.value || 0);
                    setRefillError(v > stock && stock > 0 ? `Estoque insuficiente: ${stock}L disponíveis no caminhão.` : null);
                  }}
                  className={`w-full p-2 border rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-blue-500 focus:border-blue-500 ${refillError ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700'}`}
                />
                {refillError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{refillError}</p>
                )}
              </div>

              <div className={`p-3 rounded-lg border-2 ${stock <= 0 ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700/50' : 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700/50'}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-700 dark:text-gray-200">Disponível no Caminhão:</span>
                  <span className={`font-black text-base ${stock <= 0 ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                    {stock.toLocaleString('pt-BR')}L
                  </span>
                </div>
                {stock <= 0 && (
                  <p className="text-xs text-red-700 dark:text-red-300 mt-2 font-medium">
                    ⚠️ Estoque zerado. Abasteça o caminhão primeiro (botão &ldquo;Abastecer Caminhão&rdquo; acima) antes de debitar para um equipamento.
                  </p>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={() => { setIsMachineRefillModalOpen(false); setRefillError(null); }} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#1e1e1e] rounded-md hover:bg-gray-200">Cancelar</button>
                <button
                  type="submit"
                  disabled={stock <= 0}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Abastecimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refill Modal */}
      {isRefillModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-md max-h-[90vh] max-w-[90vw] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <ArrowUpCircle className="mr-2 text-green-600" />
                Recebimento de Diesel
              </h3>
              <button onClick={() => setIsRefillModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={handleRefill}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data do Recebimento</label>
                <input name="date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-green-500 focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Quantidade (Litros)</label>
                <input name="amount" required type="number" min="1" max={capacity - stock} placeholder={`Máximo: ${capacity - stock}L`} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-green-500 focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Fornecedor / Nota Fiscal</label>
                <input name="supplier" required type="text" placeholder="Ex: Posto Ipiranga / NF 1234" className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-green-500 focus:border-green-500" />
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={() => setIsRefillModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#1e1e1e] rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 shadow-sm">Confirmar Entrada</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const WorkshopView = ({ logs, machines, employees, plans, alerts, onAddMaintenance, onUpdateLogStatus, onPerformPreventive, onPerformCustomPreventive, onSendToManagement }: any) => {
  const getOperatorName = useCallback((id: string) => {
    if (!id) return '-';
    // Se já for um nome (legado), retorna ele mesmo
    if (id.length < 20 && !id.includes('-')) return id; 
    const emp = employees.find((e: any) => e.id === id);
    return emp ? emp.nome : id;
  }, [employees]);
  const [osModal, setOsModal] = useState({ isOpen: false, logData: null as any });
  const [partsRequestModal, setPartsRequestModal] = useState({ isOpen: false, logData: null as any });
  const [sentReports, setSentReports] = useState<Record<string, boolean>>({});

  const pendingAvarias = logs.filter((l: any) => l.hasAvaria && ['Pendente Oficina', 'Aguardando Gerência', 'Aprovado Gerência'].includes(l.avariaStatus));

  const preventiveAlerts = (alerts || []).map((alert: any) => {
    const statusType = alert.remaining <= 0 ? '🚨 URGENTE: Manutenção Vencida' : '⚠️ ATENÇÃO: Máquina próxima de manutenção';
    return {
      machineId: alert.machineId,
      model: alert.model,
      type: alert.machineType,
      currentHorimeter: alert.horimeter,
      nextMilestone: alert.nextMilestone,
      remaining: alert.remaining,
      measureUnit: alert.measureUnit,
      planLevel: alert.template.interval === 'Variável' ? 'Variável' : `${alert.template.interval}${alert.measureUnit || 'h'}`,
      parts: alert.template.items || [],
      statusType,
      template: alert.template,
      isCustom: alert.isCustom,
      duePlans: alert.duePlans,
      isFallback: alert.isFallback,
      isMissingPlan: alert.isMissingPlan,
      suggestion: alert.suggestion
    };
  });

  const handleGenerateOS = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    onAddMaintenance({
      id: genId(),
      machineId: osModal.logData.machineId,
      type: machines.find((m: any) => m.id === osModal.logData.machineId)?.type || 'Equipamento',
      date: formData.get('date'),
      description: formData.get('description'),
      type_maintenance: 'Corretiva',
      status: 'Pendente',
      urgency: formData.get('urgency')
    });

    onUpdateLogStatus(osModal.logData.id, 'Resolvido/OS Criada');
    setOsModal({ isOpen: false, logData: null });
  };

  const handleSendToGerenciaAutomated = (e: React.MouseEvent, alert: any) => {
    e.preventDefault();
    const reportData = {
      id: `REL-${genId().split('-')[0]}`,
      date: new Date().toISOString(),
      machineId: alert.machineId,
      type: 'Manutenção Preventiva',
      urgency: alert.remaining <= 0 ? 'Alta' : 'Média',
      description: `Plano ${alert.planLevel || 'KM'} (${alert.nextMilestone || ''}). Restam: ${alert.remaining}. Peças sugeridas: ${alert.parts && alert.parts.length > 0 ? alert.parts.join(', ') : (alert.duePlans ? alert.duePlans.map((p:any)=>p.item).join(', ') : '')}`,
      status: 'Avaliando',
      photos: []
    };
    onSendToManagement(reportData);
    setSentReports({ ...sentReports, [alert.machineId]: true });
  };

  const handleRequestPartsGerencia = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const partsNeeded = formData.get('partsNeeded');

    const reportData = {
      id: `REL-${genId().split('-')[0]}`,
      date: new Date().toISOString(),
      machineId: partsRequestModal.logData.machineId,
      type: 'Avaria em Campo (Solicitação de Peças)',
      urgency: 'Alta',
      description: `Relato do Operador: ${partsRequestModal.logData.observations}\n\nPeças solicitadas pela Oficina:\n${partsNeeded}`,
      status: 'Avaliando',
      photos: partsRequestModal.logData.photos,
      linkedLogId: partsRequestModal.logData.id
    };
    
    onSendToManagement(reportData);
    onUpdateLogStatus(partsRequestModal.logData.id, 'Aguardando Gerência');
    setPartsRequestModal({ isOpen: false, logData: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Cog className="mr-2 text-gray-600 dark:text-gray-300" size={28} />
            Oficina e Triagem
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestão de avarias diárias, fluxo de peças e previsões das fabricantes.</p>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center border-b border-gray-200 dark:border-white/10 pb-2">
        <Clock className="mr-2 text-blue-600" size={20} />
        Manutenção Preventiva e Planos Customizados
      </h3>
      
      {preventiveAlerts.length === 0 ? (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center text-blue-800 font-medium">
          Nenhum equipamento ou veículo próximo do vencimento de manutenção.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {preventiveAlerts.map((alert: any) => (
            <div key={alert.machineId} className={`bg-white dark:bg-[#151515] rounded-xl border shadow-sm overflow-hidden flex flex-col ${alert.remaining <= 0 ? 'border-red-300' : 'border-orange-300'}`}>
              <div className={`p-4 border-b flex justify-between items-center ${alert.remaining <= 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                <div className="font-bold text-sm">
                  {alert.statusType}
                </div>
                <span className="text-xs font-mono bg-white dark:bg-[#151515] px-2 py-1 rounded shadow-sm border border-black/10">
                  {alert.remaining <= 0 ? `Vencido há ${Math.abs(alert.remaining)}${alert.measureUnit || 'h'}` : `Faltam ${alert.remaining}${alert.measureUnit || 'h'}`}
                </span>
              </div>
              
              <div className="p-5 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Equipamento</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{alert.machineId}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{alert.type} (MOD: {alert.model})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Plano</p>
                    <p className="text-lg font-bold text-blue-600">PM - {alert.nextMilestone}{alert.measureUnit || 'h'}</p>
                    <p className="text-sm font-mono text-gray-500 dark:text-gray-400">Nível: {alert.planLevel}</p>
                  </div>
                </div>

                {alert.suggestion && (
                  <div className={`p-3 rounded-lg text-xs font-medium border ${alert.isMissingPlan ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    {alert.suggestion}
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-[#101010] rounded-lg p-3 border border-gray-200 dark:border-white/10">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase flex items-center mb-2">
                    <PackageSearch size={14} className="mr-1 text-gray-500 dark:text-gray-400" />
                    Kit de Intervenção:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-gray-700 dark:text-gray-200 space-y-1">
                    {alert.parts.map((part: string, idx: number) => (
                      <li key={idx}>{part}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#101010]">
                {alert.isCustom ? (
                  <button 
                    onClick={() => onPerformCustomPreventive(alert.machineId, alert.duePlans)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <CheckCircle size={18} className="mr-2" />
                    Marcar Troca como Concluída
                  </button>
                ) : (
                  <button 
                    onClick={() => onPerformPreventive(alert.machineId, alert.nextMilestone)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <CheckCircle size={18} className="mr-2" />
                    Marcar Revisão como Concluída
                  </button>
                )}
                <button 
                  onClick={(e) => handleSendToGerenciaAutomated(e, alert)}
                  disabled={sentReports[alert.machineId]}
                  className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:text-gray-100 text-sm font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
                  {sentReports[alert.machineId] ? 'Relatório Enviado à Gerência' : 'Enviar Pedido de Peças para Gerência'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SEÇÃO 3: AVARIAS EM CAMPO (FOTOS E FLUXO DE APROVAÇÃO) */}
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center border-b border-gray-200 dark:border-white/10 pb-2 mt-8">
        <AlertOctagon className="mr-2 text-red-600" size={20} />
        Avarias em Campo (Triagem e Solicitação de Peças)
      </h3>

      {pendingAvarias.length === 0 ? (
        <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-green-100 text-green-600 p-4 rounded-full mb-4">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Sem incidentes em campo</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingAvarias.map((log: any) => {
            const machine = machines.find((m: any) => m.id === log.machineId);
            const failedItems = defaultChecklistItems.filter(item => log.checklist && log.checklist[item.id] === 'avaria');

            return (
              <div key={log.id} className="bg-white dark:bg-[#151515] rounded-xl border border-red-200 shadow-sm overflow-hidden flex flex-col">
                <div className={`p-4 border-b flex justify-between items-center ${log.avariaStatus === 'Aprovado Gerência' ? 'bg-green-50 border-green-200 text-green-800' : log.avariaStatus === 'Aguardando Gerência' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <div className="flex items-center font-bold text-sm">
                    {log.avariaStatus === 'Aprovado Gerência' ? <CheckCircle2 size={18} className="mr-2" /> : <AlertTriangle size={18} className="mr-2" />}
                    {log.avariaStatus === 'Pendente Oficina' ? 'Triagem Pendente' : log.avariaStatus}
                  </div>
                  <span className="text-xs font-semibold bg-white dark:bg-[#151515] px-2 py-1 rounded shadow-sm border border-black/10">
                    {formatDateBR(log.date)}
                  </span>
                </div>
                
                <div className="p-5 flex-1 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Veículo</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{log.machineId}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mb-1">Checklist Negativo</p>
                    <ul className="space-y-1">
                      {failedItems.length > 0 ? failedItems.map(item => (
                        <li key={item.id} className="text-sm text-red-600 flex items-center">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                          {item.label}
                        </li>
                      )) : (
                        <li className="text-sm text-gray-600 dark:text-gray-300">-</li>
                      )}
                    </ul>
                  </div>

                  {log.observations && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                      <p className="text-xs text-yellow-800 font-semibold mb-1">Obs ({getOperatorName(log.operator)}):</p>
                      <p className="text-sm text-yellow-900 italic">&quot;{log.observations}&quot;</p>
                    </div>
                  )}

                  {/* Exibição das Fotos Enviadas pelo Operador */}
                  {log.photos && log.photos.length > 0 && (
                    <div>
                       <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mb-2 flex items-center"><Camera size={14} className="mr-1"/> Fotos da Avaria</p>
                       <div className="flex gap-2 overflow-x-auto pb-2">
                         {log.photos.map((photoUrl: string, idx: number) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img key={idx} src={photoUrl} alt={`Avaria ${idx}`} className="w-16 h-16 object-cover rounded border border-gray-300 flex-shrink-0" />
                         ))}
                       </div>
                    </div>
                  )}

                </div>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#101010] flex flex-col gap-2">
                  {log.avariaStatus === 'Pendente Oficina' && (
                    <button 
                      onClick={() => setPartsRequestModal({ isOpen: true, logData: log })}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <PackageSearch size={16} className="mr-2" />
                      Solicitar Peças (Gerência)
                    </button>
                  )}
                  
                  {log.avariaStatus === 'Aguardando Gerência' && (
                     <div className="w-full bg-yellow-100 text-yellow-800 text-sm font-semibold py-2 px-3 rounded-lg flex items-center justify-center border border-yellow-200">
                        <Clock size={16} className="mr-2 animate-pulse" /> Aguardando Aprovação
                     </div>
                  )}

                  {(log.avariaStatus === 'Pendente Oficina' || log.avariaStatus === 'Aprovado Gerência') && (
                    <button 
                      onClick={() => setOsModal({ isOpen: true, logData: log })}
                      className={`w-full text-sm font-semibold py-2 px-3 rounded-lg flex items-center justify-center transition-colors ${log.avariaStatus === 'Aprovado Gerência' ? 'bg-black text-white hover:bg-neutral-800 shadow-md ring-2 ring-green-400' : 'bg-white dark:bg-[#151515] hover:bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-100 border border-gray-300'}`}
                    >
                      <Wrench size={16} className="mr-2" />
                      {log.avariaStatus === 'Aprovado Gerência' ? 'Gerar OS (Aprovado!)' : 'Gerar OS (Sem pedir peças)'}
                    </button>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Solicitar Peças à Gerência */}
      {partsRequestModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] max-w-[90vw] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <PackageSearch className="mr-2 text-blue-600" />
                Solicitar Aprovação de Peças
              </h3>
              <button onClick={() => setPartsRequestModal({ isOpen: false, logData: null })} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={handleRequestPartsGerencia}>
              <div className="bg-blue-50 p-3 rounded border border-blue-100 text-sm text-blue-800 mb-2">
                O pedido será enviado para a caixa de entrada da Administração Geral. As fotos da avaria (se existirem) seguirão anexadas automaticamente.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Peças e Serviços Necessários</label>
                <textarea 
                  name="partsNeeded" 
                  required 
                  rows={4} 
                  placeholder="Ex: 1x Mangueira de radiador (Ref. 2341), 5L Aditivo Arrefecimento. Orçamento estimado: R$ 450,00."
                  className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500"
                ></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t mt-4">
                <button type="button" onClick={() => setPartsRequestModal({ isOpen: false, logData: null })} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#1e1e1e] rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Enviar para Gerência</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerar OS */}
      {osModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] max-w-[90vw] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Gerar Ordem de Serviço</h3>
              <button onClick={() => setOsModal({ isOpen: false, logData: null })} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={handleGenerateOS}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Equipamento</label>
                <input type="text" disabled value={osModal.logData.machineId} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-gray-100 dark:bg-[#101010] text-gray-600 dark:text-zinc-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data Agendada</label>
                <input name="date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Urgência</label>
                <select name="urgency" required className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500">
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Descrição</label>
                <textarea 
                  name="description" 
                  required 
                  rows={3} 
                  defaultValue={`Origem: Relatório Diário (${osModal.logData.id})\nRelato: ${osModal.logData.observations}`}
                  className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-yellow-500 focus:border-yellow-500"
                ></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={() => setOsModal({ isOpen: false, logData: null })} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#1e1e1e] rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-yellow-500 text-yellow-950 font-semibold rounded-md hover:bg-yellow-600">Criar OS</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const ManagementView = ({ machines, maintenances, reports, logs, alerts, onAcknowledgeReport }: any) => {
  const pendingReports = reports.filter((r: any) => r.status === 'Avaliando');
  const totalMachines = machines.length;
  const operationalMachines = machines.filter((m: any) => m.status === 'Disponível' || m.status === 'Em Operação').length;
  
  const completedOS = maintenances.filter((m: any) => m.status === 'Concluída').length;
  const openOS = maintenances.filter((m: any) => m.status !== 'Concluída').length;
  
  const dailyAlerts = logs.filter((l: any) => l.hasAvaria && ['Pendente Oficina', 'Aguardando Gerência'].includes(l.avariaStatus)).length;
  const activeAlerts = alerts || [];

  const handlePrintOS = (report: any) => {
    const machine = machines.find((m: any) => m.id === report.machineId) || {};
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem de Serviço - ${report.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 5px 0 0; color: #666; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; font-size: 12px; color: #666; text-transform: uppercase; }
            .value { font-size: 16px; margin-top: 2px; }
            .photos { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 15px; }
            .photo { width: 200px; height: 200px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            .signature { margin-top: 80px; display: flex; justify-content: space-around; }
            .sig-line { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 5px; font-weight: bold; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
              .photo { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Ordem de Serviço Autorizada</h1>
            <p>Data de Emissão do Documento: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p style="font-size: 18px; margin-top: 10px; color: #16a34a;"><strong>APROVADO PELA GERÊNCIA</strong></p>
          </div>

          <div class="section">
            <div class="section-title">Informações do Veículo / Máquina</div>
            <div class="grid">
              <div class="field"><div class="label">ID da Frota</div><div class="value">${machine.id || '-'}</div></div>
              <div class="field"><div class="label">Tipo / Espécie</div><div class="value">${machine.type || '-'} ${machine.specieType ? `/ ${machine.specieType}` : ''}</div></div>
              <div class="field"><div class="label">Marca / Modelo</div><div class="value">${machine.brand || '-'} / ${machine.model || '-'}</div></div>
              <div class="field"><div class="label">Ano</div><div class="value">${machine.year || '-'}</div></div>
              <div class="field"><div class="label">Placa</div><div class="value">${machine.plate || '-'}</div></div>
              <div class="field"><div class="label">Chassi</div><div class="value">${machine.chassis || '-'}</div></div>
              <div class="field"><div class="label">Renavam</div><div class="value">${machine.renavam || '-'}</div></div>
              <div class="field"><div class="label">Horímetro/KM Atual</div><div class="value">${machine.horimeter || '-'} ${machine.measureUnit || ''}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Detalhes da Solicitação / Orçamento</div>
            <div class="grid">
              <div class="field"><div class="label">Data do Pedido Original</div><div class="value">${new Date(report.date).toLocaleString('pt-BR')}</div></div>
              <div class="field"><div class="label">Tipo de Manutenção</div><div class="value">${report.type}</div></div>
              <div class="field"><div class="label">Nível de Urgência</div><div class="value">${report.urgency}</div></div>
            </div>
            <div class="field" style="margin-top: 20px;">
              <div class="label">Parecer Técnico / Descrição do Problema / Relação de Peças</div>
              <div class="value" style="white-space: pre-wrap; background: #f9f9f9; padding: 15px; border: 1px solid #eee; border-radius: 4px; margin-top: 5px; font-family: monospace; font-size: 14px;">${report.description}</div>
            </div>
          </div>

          ${report.photos && report.photos.length > 0 ? `
            <div class="section">
              <div class="section-title">Evidências Fotográficas</div>
              <div class="photos">
                ${report.photos.map((p: string) => `<img src="${p}" class="photo" />`).join('')}
              </div>
            </div>
          ` : ''}

          <div class="signature">
            <div class="sig-line">Assinatura do Responsável (Oficina)</div>
            <div class="sig-line">Assinatura da Gerência</div>
          </div>

          <div class="footer">
            Documento gerado pelo Sistema de Gestão de Frota - Ordem de Serviço #${report.id.substring(0, 8)}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Briefcase className="mr-2 text-yellow-600" size={28} />
            Administração e Gerência
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visão global da operação, aprovação de orçamentos e peças.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#151515] p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-700 dark:text-gray-200">Disponibilidade Global</h3>
            <PieChart className="text-blue-500" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-4xl font-black text-gray-900 dark:text-gray-50">{operationalMachines}</span>
            <span className="text-gray-500 dark:text-gray-400 mb-1">/ {totalMachines} ativos</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(operationalMachines/totalMachines)*100}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151515] p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-700 dark:text-gray-200">Manutenções e Oficinas</h3>
            <Wrench className="text-orange-500" />
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Em Andamento</p>
              <p className="text-2xl font-black text-orange-600">{openOS}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Concluídas</p>
              <p className="text-2xl font-black text-green-600">{completedOS}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151515] p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-700 dark:text-gray-200">Impactos em Campo</h3>
            <AlertOctagon className="text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Avarias diárias não tratadas</p>
            <p className="text-4xl font-black text-red-600">{dailyAlerts}</p>
          </div>
        </div>
      </div>

      {activeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-8">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="text-red-600" size={24} />
            <h3 className="text-lg font-bold text-red-800">Alertas de Manutenção Preventiva</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAlerts.map((alert: any, idx: number) => (
              <div key={idx} className="bg-white dark:bg-[#151515] p-4 rounded-lg shadow-sm border border-red-100 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-800 dark:text-gray-100">{alert.machineId}</span>
                  <span className="text-xs font-semibold bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    Faltam {alert.remaining}{alert.measureUnit || 'h'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{alert.model}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Revisão de {alert.nextMilestone}{alert.measureUnit || 'h'}</p>
                {alert.suggestion && (
                  <p className="text-[10px] font-bold text-red-600 mt-2 bg-red-50 p-1 rounded border border-red-100 uppercase tracking-tight">
                    {alert.suggestion}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{alert.template.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col mt-8">
        <div className="p-5 border-b border-gray-200 dark:border-white/10 bg-gray-900 text-white flex items-center justify-between">
          <h3 className="font-bold flex items-center text-lg">
            <FileText size={20} className="mr-2 text-yellow-400" /> 
            Caixa de Entrada: Aprovações de Peças e Orçamentos
          </h3>
          {pendingReports.length > 0 && (
            <span className="bg-yellow-500 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
              {pendingReports.length} aguardando aprovação
            </span>
          )}
        </div>
        
        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <table className="hidden md:table w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#101010] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                <th className="p-4 font-medium w-1/6">Data do Pedido</th>
                <th className="p-4 font-medium w-1/6">Máquina</th>
                <th className="p-4 font-medium w-1/2">Parecer Técnico / Fotos</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((report: any) => (
                <tr key={report.id} className={`transition-colors ${report.status === 'Avaliando' ? 'bg-yellow-50/30' : 'hover:bg-gray-50 dark:bg-[#101010]'}`}>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-300 align-top">
                    <div className="font-semibold text-gray-900 dark:text-gray-50">{new Date(report.date).toLocaleDateString('pt-BR')}</div>
                    <div className="text-xs">{new Date(report.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                  </td>
                  <td className="p-4 align-top">
                    <span className="font-bold text-gray-900 dark:text-gray-50 bg-gray-100 dark:bg-[#1e1e1e] px-2 py-1 rounded border border-gray-200 dark:border-white/10">{report.machineId}</span>
                  </td>
                  <td className="p-4 align-top">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">{report.type} {report.urgency === 'Alta' && <span className="text-red-500 text-xs ml-1">(Urgência Máxima)</span>}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{report.description}</div>
                    
                    {report.photos && report.photos.length > 0 && (
                      <div className="mt-3">
                         <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1">Fotos anexadas do problema:</p>
                         <div className="flex gap-2">
                           {report.photos.map((p: string, i: number) => (
                             <a key={i} href={p} target="_blank" rel="noreferrer" title="Clique para ampliar">
                               {/* eslint-disable-next-line @next/next/no-img-element */}
                               <img src={p} alt="Avaria" className="w-12 h-12 object-cover rounded border border-gray-300 hover:opacity-80 transition-opacity" />
                             </a>
                           ))}
                         </div>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center align-middle">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${report.status === 'Avaliando' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="p-4 text-right align-middle">
                    {report.status === 'Avaliando' ? (
                      <button 
                        onClick={() => onAcknowledgeReport(report.id, report.linkedLogId)}
                        className="bg-black hover:bg-neutral-800 text-white text-xs font-semibold py-2 px-3 rounded-md transition-colors"
                      >
                        Aprovar Pedido
                      </button>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-gray-400 flex items-center text-xs font-bold">
                          <CheckCircle size={14} className="mr-1 text-green-500"/> Aprovado
                        </span>
                        <button 
                          onClick={() => handlePrintOS(report)}
                          className="flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                          title="Imprimir Ordem de Serviço em PDF"
                        >
                          <Printer size={14} className="mr-1" />
                          Gerar PDF
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">Não constam comunicações da oficina.</td></tr>
              )}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {reports.sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((report: any) => (
              <div key={report.id} className={`p-4 space-y-3 ${report.status === 'Avaliando' ? 'bg-yellow-50/30' : 'hover:bg-gray-50 dark:bg-[#101010]'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-50">{new Date(report.date).toLocaleDateString('pt-BR')} {new Date(report.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                    <div className="mt-1"><span className="font-bold text-gray-900 dark:text-gray-50 bg-gray-100 dark:bg-[#1e1e1e] px-2 py-1 rounded border border-gray-200 dark:border-white/10 text-xs">{report.machineId}</span></div>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${report.status === 'Avaliando' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                    {report.status}
                  </span>
                </div>
                
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">{report.type} {report.urgency === 'Alta' && <span className="text-red-500 text-xs ml-1">(Urgência Máxima)</span>}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{report.description}</div>
                  
                  {report.photos && report.photos.length > 0 && (
                    <div className="mt-3">
                       <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1">Fotos anexadas do problema:</p>
                       <div className="flex gap-2 overflow-x-auto pb-2">
                         {report.photos.map((p: string, i: number) => (
                           <a key={i} href={p} target="_blank" rel="noreferrer" title="Clique para ampliar" className="flex-shrink-0">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src={p} alt="Avaria" className="w-16 h-16 object-cover rounded border border-gray-300" />
                           </a>
                         ))}
                       </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex justify-end">
                  {report.status === 'Avaliando' ? (
                    <button 
                      onClick={() => onAcknowledgeReport(report.id, report.linkedLogId)}
                      className="bg-black hover:bg-neutral-800 text-white text-xs font-semibold py-2 px-4 rounded-md transition-colors w-full sm:w-auto"
                    >
                      Aprovar Pedido
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 flex items-center text-xs font-bold">
                        <CheckCircle size={14} className="mr-1 text-green-500"/> Aprovado
                      </span>
                      <button
                        onClick={() => handlePrintOS(report)}
                        className="text-blue-600 hover:text-blue-800 flex items-center text-xs font-semibold px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                        title="Gerar PDF da Ordem de Serviço"
                      >
                        <Printer size={14} className="mr-1" />
                        Gerar PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Não constam comunicações da oficina.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReportsView = ({ logs, machines, employees }: any) => {
  const [reportType, setReportType] = useState('machines');
  const [period, setPeriod] = useState('monthly');
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [selectedOperator, setSelectedOperator] = useState('all');

  const getOperatorName = useCallback((id: string) => {
    if (!id) return '-';
    // Se já for um nome (legado), retorna ele mesmo
    if (id.length < 20 && !id.includes('-')) return id; 
    const emp = employees.find((e: any) => e.id === id);
    return emp ? emp.nome : id;
  }, [employees]);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    return logs.filter((log: any) => {
      if (period === 'all') return true;
      
      const logDate = safeParseDate(log.date);
      if (!logDate) return false;
      
      if (period === 'daily') {
        return logDate.getDate() === currentDate && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
      }
      if (period === 'weekly') {
        const diffTime = Math.abs(now.getTime() - logDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays <= 7;
      }
      if (period === 'monthly') {
        return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
      }
      if (period === 'yearly') {
        return logDate.getFullYear() === currentYear;
      }
      return true;
    });
  }, [logs, period]);

  const machineStats = useMemo(() => {
    const stats: Record<string, any> = {};
    filteredLogs.forEach((log: any) => {
      if (!stats[log.machineId]) {
        stats[log.machineId] = { id: log.machineId, totalHours: 0, daysWorked: new Set(), fuel: 0 };
      }
      stats[log.machineId].totalHours += (log.endHorimeter - log.startHorimeter);
      stats[log.machineId].daysWorked.add(log.date);
      stats[log.machineId].fuel += log.fuel;
    });
    return Object.values(stats).map(s => ({ ...s, daysWorked: s.daysWorked.size })).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredLogs]);

  const operatorStats = useMemo(() => {
    const stats: Record<string, any> = {};
    filteredLogs.forEach((log: any) => {
      const empInfo = employees.find((e: any) => e.id === log.operator || e.nome === log.operator);
      const role = empInfo ? empInfo.role : 'Não Definido';
      const displayName = empInfo ? empInfo.nome : log.operator;

      if (!stats[log.operator]) {
        stats[log.operator] = { name: displayName, role: role, totalHours: 0, daysWorked: new Set(), machines: new Set() };
      }
      stats[log.operator].totalHours += (log.endHorimeter - log.startHorimeter);
      stats[log.operator].daysWorked.add(log.date);
      stats[log.operator].machines.add(log.machineId);
    });
    return Object.values(stats).map(s => ({
      ...s, 
      daysWorked: s.daysWorked.size, 
      machines: Array.from(s.machines).join(', ')
    })).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredLogs, employees]);

  const displayedMachineStats = selectedMachine === 'all' ? machineStats : machineStats.filter(s => s.id === selectedMachine);
  const displayedOperatorStats = selectedOperator === 'all' ? operatorStats : operatorStats.filter(s => s.name === selectedOperator);

  const detailedLogs = useMemo(() => {
    if (reportType === 'machines' && selectedMachine !== 'all') {
      return filteredLogs.filter((l: any) => l.machineId === selectedMachine).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    if (reportType === 'operators' && selectedOperator !== 'all') {
      return filteredLogs.filter((l: any) => l.operator === selectedOperator).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return [];
  }, [filteredLogs, reportType, selectedMachine, selectedOperator]);

  const filterableEmployees = employees.filter((e: any) => e.role === 'Operador de Máquinas' || e.role === 'Motorista');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <BarChart3 className="mr-2 text-yellow-600" size={28} />
            Métricas em Campo
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Análise de produtividade de combustível, desgaste e horas.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => generateFieldMetricsPDF(displayedMachineStats, displayedOperatorStats, reportType)}
            className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors border border-red-200"
            title="Baixar relatório em PDF"
          >
            <Download size={18} className="mr-2" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#101010] flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex bg-gray-200 p-1 rounded-lg w-full md:w-auto">
            <button 
              onClick={() => { setReportType('machines'); setSelectedOperator('all'); }}
              className={`flex-1 md:flex-none px-4 py-2 text-sm font-semibold rounded-md transition-all ${reportType === 'machines' ? 'bg-white dark:bg-[#151515] shadow-sm text-gray-900 dark:text-gray-50' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-gray-50'}`}
            >
              Horas / Equipamento
            </button>
            <button 
              onClick={() => { setReportType('operators'); setSelectedMachine('all'); }}
              className={`flex-1 md:flex-none px-4 py-2 text-sm font-semibold rounded-md transition-all ${reportType === 'operators' ? 'bg-white dark:bg-[#151515] shadow-sm text-gray-900 dark:text-gray-50' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-gray-50'}`}
            >
              Equipes (Motoristas)
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
            {reportType === 'machines' ? (
              <select 
                value={selectedMachine} 
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full md:w-auto p-2 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-sm font-medium bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100"
              >
                <option value="all">Ver Tudo</option>
                {machines.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.id} - {m.type}</option>
                ))}
              </select>
            ) : (
              <select 
                value={selectedOperator} 
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full md:w-auto p-2 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-sm font-medium bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100"
              >
                <option value="all">Ver Todos</option>
                {filterableEmployees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.nome} ({emp.role})</option>
                ))}
              </select>
            )}

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <CalendarDays size={18} className="text-gray-400 hidden md:block" />
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full md:w-auto p-2 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-sm font-medium bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100"
              >
                <option value="daily">Diário</option>
                <option value="weekly">Semana Atual</option>
                <option value="monthly">Mês Atual</option>
                <option value="yearly">Neste Ano</option>
                <option value="all">Vitalício</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-gray-100 dark:border-white/5">
          {reportType === 'machines' ? (
            <>
              {/* Desktop Table */}
              <table className="hidden md:table w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white dark:bg-[#151515] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                    <th className="p-4 font-medium">Equipamento</th>
                    <th className="p-4 font-medium text-center">Dias Operados</th>
                    <th className="p-4 font-medium text-center">Consumo Total (L)</th>
                    <th className="p-4 font-medium text-center">Evolução (h/km)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedMachineStats.map(stat => {
                    const machineInfo = machines.find((m: any) => m.id === stat.id);
                    const unit = machineInfo?.measureUnit || 'h';
                    return (
                      <tr key={stat.id} className="hover:bg-gray-50 dark:bg-[#101010]/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-900 dark:text-gray-50">{stat.id}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{machineInfo?.type || 'Equipamento'}</div>
                        </td>
                        <td className="p-4 text-center font-medium text-gray-700 dark:text-gray-200">{stat.daysWorked} dias</td>
                        <td className="p-4 text-center text-sm text-gray-600 dark:text-gray-300">
                          <span className="flex items-center justify-center"><Fuel size={14} className="mr-1 text-green-600"/> {stat.fuel} L</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold text-sm border border-blue-100">
                            {stat.totalHours} {unit}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {displayedMachineStats.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">Sem registros apurados.</td></tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {displayedMachineStats.map(stat => {
                  const machineInfo = machines.find((m: any) => m.id === stat.id);
                  const unit = machineInfo?.measureUnit || 'h';
                  return (
                    <div key={stat.id} className="p-4 hover:bg-gray-50 dark:bg-[#101010]/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-gray-50">{stat.id}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{machineInfo?.type || 'Equipamento'}</div>
                        </div>
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold text-xs border border-blue-100">
                          {stat.daysWorked} dias
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                          <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Consumo Total</div>
                          <div className="font-medium text-gray-700 dark:text-gray-200 flex items-center">
                            <Fuel size={14} className="mr-1 text-green-600"/> {stat.fuel} L
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                          <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Evolução</div>
                          <div className="font-bold text-blue-700">{stat.totalHours} {unit}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {displayedMachineStats.length === 0 && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">Sem registros apurados.</div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Desktop Table */}
              <table className="hidden md:table w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white dark:bg-[#151515] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                    <th className="p-4 font-medium">Nome</th>
                    <th className="p-4 font-medium">Equipamentos Manuseados</th>
                    <th className="p-4 font-medium text-center">Diárias de Trabalho</th>
                    <th className="p-4 font-medium text-center">Impacto (H/KM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedOperatorStats.map(stat => (
                    <tr key={stat.name} className="hover:bg-gray-50 dark:bg-[#101010]/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-900 dark:text-gray-50 flex items-center">
                          <Users size={16} className="mr-2 text-gray-400" />
                          {stat.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.role}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={stat.machines}>
                        {stat.machines}
                      </td>
                      <td className="p-4 text-center font-medium text-gray-700 dark:text-gray-200">
                        {stat.daysWorked}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full font-bold text-sm border border-yellow-200">
                          {stat.totalHours}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {displayedOperatorStats.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">Sem registros apurados.</td></tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {displayedOperatorStats.map(stat => (
                  <div key={stat.name} className="p-4 hover:bg-gray-50 dark:bg-[#101010]/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-gray-50 flex items-center">
                          <Users size={16} className="mr-2 text-gray-400" />
                          {stat.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.role}</div>
                      </div>
                      <span className="bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full font-bold text-xs border border-yellow-200">
                        {stat.daysWorked} dias
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                        <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Equipamentos</div>
                        <div className="font-medium text-gray-700 dark:text-gray-200 truncate" title={stat.machines}>{stat.machines}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                        <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Impacto</div>
                        <div className="font-bold text-yellow-800">{stat.totalHours}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {displayedOperatorStats.length === 0 && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">Sem registros apurados.</div>
                )}
              </div>
            </>
          )}
        </div>

        {(selectedMachine !== 'all' || selectedOperator !== 'all') && detailedLogs.length > 0 && (
          <div className="bg-gray-50 dark:bg-[#101010] p-4 sm:p-6 flex-1">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
              <ClipboardList size={18} className="mr-2 text-yellow-600" />
              Documento Histórico (Extrato)
            </h3>
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-[#151515] rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                    <th className="p-3 font-medium">Data</th>
                    {reportType === 'machines' && <th className="p-3 font-medium">Operador</th>}
                    {reportType === 'operators' && <th className="p-3 font-medium">Máquina</th>}
                    <th className="p-3 font-medium">Obra / Local</th>
                    <th className="p-3 font-medium text-center">Variação de Métricas</th>
                    <th className="p-3 font-medium text-center">Balanço do Dia</th>
                    <th className="p-3 font-medium text-center">Gasto Abast.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailedLogs.map((log: any) => {
                    const mInfo = machines.find((m: any) => m.id === log.machineId);
                    const unit = mInfo?.measureUnit || 'h';
                    return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:bg-[#101010]/50">
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-50 font-medium whitespace-nowrap">
                        {formatDateBR(log.date)}
                      </td>
                      {reportType === 'machines' && <td className="p-3 text-sm text-gray-600 dark:text-gray-300">{getOperatorName(log.operator)}</td>}
                      {reportType === 'operators' && <td className="p-3 text-sm text-gray-600 dark:text-gray-300 font-semibold">{log.machineId}</td>}
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-300">{log.location}</td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-300 text-center font-mono">
                        {log.startHorimeter} - {log.endHorimeter}
                      </td>
                      <td className="p-3 text-sm font-bold text-blue-700 text-center bg-blue-50/30">
                        {log.endHorimeter - log.startHorimeter} {unit}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-300 text-center">{log.fuel}L</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {detailedLogs.map((log: any) => {
                const mInfo = machines.find((m: any) => m.id === log.machineId);
                const unit = mInfo?.measureUnit || 'h';
                return (
                  <div key={log.id} className="bg-white dark:bg-[#151515] p-4 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-900 dark:text-gray-50">
                        {formatDateBR(log.date)}
                      </div>
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                        {log.endHorimeter - log.startHorimeter} {unit}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {reportType === 'machines' ? (
                        <div><span className="font-medium">Operador:</span> {getOperatorName(log.operator)}</div>
                      ) : (
                        <div><span className="font-medium">Máquina:</span> {log.machineId}</div>
                      )}
                      <div><span className="font-medium">Obra:</span> {log.location}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Variação</div>
                        <div className="font-mono">{log.startHorimeter} - {log.endHorimeter}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#101010] p-2 rounded border border-gray-100 dark:border-white/5">
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Abastecimento</div>
                        <div className="font-medium">{log.fuel} L</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
