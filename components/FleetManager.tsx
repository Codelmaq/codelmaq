"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, Truck, Wrench, ShieldCheck, X,
  ClipboardList, Cog, Gauge, BarChart3, Briefcase, MoreVertical,
  FileText, Fuel, Droplets, Trophy, AlertTriangle,
  Users, ChevronRight, ChevronLeft, Smartphone, LogOut, Sparkles
} from 'lucide-react';
import { 
  initialMachines, initialMaintenances, initialMaintenancePlans, 
  initialDailyLogs, initialEmployees, initialSites, initialManagementReports,
  initialMaintenanceTemplates, initialScoringRules, initialPointsHistory, initialMonthlyRanking
} from '@/lib/data';
import { DashboardView, MachinesView, AdminView } from './FleetViews1';
import { MaintenanceView, DailyLogView, MaintenancePlanView } from './FleetViews2';
import { WorkshopView, ManagementView, ReportsView, FuelTruckView, PerformanceView } from './FleetViews3';
import { MaintenancePlansView } from './MaintenancePlansView';
import MobileApkHub from './MobileApkHub';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  mapDBToMachine, mapMachineToDB, 
  mapDBToMaintenances, mapMaintenancesToDB,
  mapDBToPlan, mapPlanToDB, 
  mapDBToLog, mapLogToDB, 
  mapDBToEmployee, mapEmployeeToDB, 
  mapDBToSite, mapSiteToDB,
  mapDBToTemplate, mapTemplateToDB,
  mapDBToRefill, mapRefillToDB
} from '@/lib/mapper';
import { useFleetStore } from '@/lib/store';
import { useRouter } from '@/hooks/useRouter';

import { useAuthStore } from '@/store/authStore';
import { SyncIndicator } from './SyncIndicator';
import { OfflineFormPanel } from './OfflineFormPanel';
import { genId } from '@/lib/utils';

export default function FleetManager({ initialView = 'dashboard' }: { initialView?: string }) {
  const router = useRouter();
  const { usuario: userProfile, setUsuario } = useAuthStore();
  const { 
    filaOffline = [], adicionarFilaOffline, removerDaFila, sincronizarComSupabase,
    machines = [], setMachines,
    maintenances = [], setMaintenances,
    maintenancePlans = [], setMaintenancePlans,
    maintenanceTemplates = [], setMaintenanceTemplates,
    dailyLogs = [], setDailyLogs,
    employees = [], setEmployees,
    sites = [], setSites,
    managementReports = [], setManagementReports,
    fuelTruckRefills = [], setFuelTruckRefills,
    scoringRules = [], setScoringRules,
    pointsHistory = [], setPointsHistory,
    monthlyRanking = [], setMonthlyRanking
  } = useFleetStore();

  useEffect(() => {
    // Preserva o usuário conectado e redireciona para login se não estiver autenticado
    if (!userProfile) {
      router.push('/login');
    }
  }, [userProfile, router]);

  const [isDbOffline, setIsDbOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Conexão restabelecida. Sincronizando fila offline...');
      setIsDbOffline(false);
      sincronizarComSupabase();
    };

    const handleOffline = () => {
      console.log('Conexão perdida. Operando em modo offline.');
      setIsDbOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Tenta sincronizar ao carregar se estiver online
    if (navigator.onLine) {
      sincronizarComSupabase();
    } else {
      setIsDbOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sincronizarComSupabase]);
  const [currentView, setCurrentView] = useState(initialView);

  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);
  const [showRLSModal, setShowRLSModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const handleSupabaseError = useCallback((error: any, silent = false, customMessage?: string) => {
    if (!error) return false;
    
    const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
    console.error("Erro detalhado do Supabase:", errorDetails);
    
    // Intercept network/fetch/CORS failures gracefully
    const errStr = String(error.message || error.stack || (typeof error === 'object' ? JSON.stringify(error) : error)).toLowerCase();
    const isNetworkError = errStr.includes('failed to fetch') ||
                           errStr.includes('network error') ||
                           errStr.includes('load failed') ||
                           errStr.includes('unreachable') ||
                           errStr.includes('cors') ||
                           error.name === 'TypeError' ||
                           error.name === 'NetworkError';
    
    if (isNetworkError) {
      setIsDbOffline(true);
      console.warn("Conexão indisponível com o banco Supabase (Failed to fetch). Operando no modo offline.");
      return true; // Gracefully handled
    }
    
    let userFriendlyMessage = customMessage || 'Ocorreu um erro na operação!';
    
    // Handle specific error codes
    if (error.code === '42501' || error.message?.includes("row-level security")) {
      setShowRLSModal(true);
      return true;
    } else if (error.code === '23503') {
      userFriendlyMessage = "Não é possível excluir este registro pois existem outros dados vinculados a ele (ex: manutenções, abastecimentos ou logs).";
    } else if (error.code === '23505') {
      userFriendlyMessage = "Este registro já existe no banco de dados (chave duplicada).";
    } else if (error.code === '42P01' || error.message?.includes("relation") || error.message?.includes("not found")) {
      userFriendlyMessage = "Uma tabela necessária não foi encontrada no banco de dados. Verifique se as migrações foram aplicadas.";
    } else if (error.code === '42703' || error.message?.includes("column")) {
      userFriendlyMessage = "Uma coluna necessária não foi encontrada. O esquema do banco de dados pode estar desatualizado.";
    } else if (error.message) {
      userFriendlyMessage = `${userFriendlyMessage}\n\nDetalhes: ${error.message}`;
    } else {
      userFriendlyMessage = `${userFriendlyMessage}\n\nDetalhes: ${errorDetails}`;
    }
    
    if (!silent) {
      alert(userFriendlyMessage);
    }
    return true;
  }, []);

  const [previousMachinesState, setPreviousMachinesState] = useState<any[] | null>(null);

  const currentFuelTruckStock = useMemo(() => {
    return fuelTruckRefills.reduce((acc, curr) => {
      if (curr.type === 'Entrada') return acc + (curr.amount || 0);
      if (curr.type === 'Débito') return acc - (curr.amount || 0);
      return acc;
    }, 0);
  }, [fuelTruckRefills]);

  const handleRefillTruck = async (refill: any) => {
    if (isSupabaseConfigured) {
      if (!navigator.onLine) {
        adicionarFilaOffline({
          id: refill.id,
          dados: refill,
          tipo: 'abastecimento'
        });
        console.log("Offline: Abastecimento adicionado à fila para sincronização futura.");
      } else {
        try {
          let { error } = await supabase.from('abastecimentos_comboio').insert([mapRefillToDB(refill)]);
          
          // Fallback if machineId column is missing in Supabase
          if (error && error.message.includes("column") && error.message.includes("machineId")) {
            const fallbackRefill = mapRefillToDB({ ...refill });
            delete (fallbackRefill as any).ativo_id;
            const { error: retryError } = await supabase.from('abastecimentos_comboio').insert([fallbackRefill]);
            error = retryError;
            if (!error) {
              console.warn("Truck refill saved with fallback (missing machineId column). Please update your Supabase schema.");
              alert("Aviso: Registro salvo com sucesso, mas a coluna 'machineId' não foi encontrada no seu Supabase. Adicione-a para vincular abastecimentos a equipamentos específicos.");
            }
          }

          if (error) {
            handleSupabaseError(error, false, "Erro ao salvar recebimento no banco!");
            return;
          }
        } catch (err: any) {
          const errStr = String(err?.message || err?.stack || err).toLowerCase();
          const isNetworkError = errStr.includes('failed to fetch') || 
                                 errStr.includes('network error') || 
                                 errStr.includes('unreachable') || 
                                 err?.name === 'TypeError';
          
          if (isNetworkError) {
            setIsDbOffline(true);
            adicionarFilaOffline({
              id: refill.id,
              dados: refill,
              tipo: 'abastecimento'
            });
            console.log("Erro de rede: Abastecimento adicionado à fila para sincronização futura.");
          } else {
            handleSupabaseError(err, false, "Erro inesperado ao conectar com o banco de dados.");
            return;
          }
        }
      }
    }
    setFuelTruckRefills([...fuelTruckRefills, refill]);
  };

  const handleEditRefillTruck = async (updatedRefill: any) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('abastecimentos_comboio').update(mapRefillToDB(updatedRefill)).eq('id', updatedRefill.id);
      if (error) {
        handleSupabaseError(error, false, "Erro ao atualizar registro no banco!");
        return;
      }
    }
    setFuelTruckRefills(fuelTruckRefills.map(r => r.id === updatedRefill.id ? updatedRefill : r));
  };

  const handleDeleteRefillTruck = async (refillId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Confirmar Exclusão de Registro",
      message: `Você tem certeza que deseja excluir o registro de comboio ${refillId}? SIM/NÃO`,
      onConfirm: async () => {
        if (isSupabaseConfigured) {
          const { error } = await supabase.from('abastecimentos_comboio').delete().eq('id', refillId);
          if (error) {
            handleSupabaseError(error, false, "Erro ao excluir registro no banco!");
            return;
          }
        }
        setFuelTruckRefills(fuelTruckRefills.filter(r => r.id !== refillId));
      }
    });
  };

  const handleMachineRefillTruck = async (debit: any) => {
    // 1. Add to fuel truck history (debit)
    await handleRefillTruck(debit);

    // 2. Create a daily log entry for this machine to sync with Site Control and Equipment Sheet
    const machine = machines.find(m => m.id === debit.machineId);
    const newLog = {
      id: `LOG-${genId().split('-')[0]}`,
      date: debit.date.split('T')[0],
      machineId: debit.machineId,
      operator: 'Abastecimento Comboio',
      location: 'Campo (Comboio)',
      startHorimeter: machine?.horimeter || 0,
      endHorimeter: 0,
      fuel: debit.amount,
      fuelSource: 'Comboio',
      checklist: {},
      hasAvaria: false,
      avariaStatus: 'OK',
      observations: `Abastecimento realizado via Caminhão Comboio. Volume: ${debit.amount}L`,
      photos: []
    };

    await handleAddDailyLog(newLog);
    alert(`Abastecimento do equipamento ${debit.machineId} registrado com sucesso!`);
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dailyLogMode, setDailyLogMode] = useState<'offline-forms' | 'online-logs'>('offline-forms');
  const isAuthenticated = !!userProfile;
  
  

  const isAdmin = useMemo(() => 
    userProfile?.role === 'administrador' || 
    userProfile?.email === 'ale.codelmaq1986@gmail.com', 
  [userProfile]);

  const isMecanico = useMemo(() => {
    const roleNorm = (userProfile?.role || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return roleNorm === 'mecanico' || userProfile?.role === 'Mecânico';
  }, [userProfile]);

  const maintenanceAlerts = useMemo(() => {
    const alerts: any[] = [];
    machines.forEach(machine => {
      // 1. Check templates (preventive maintenance)
      let templates = maintenanceTemplates.filter(t => t.model === machine.model);
      let isFallback = false;
      let isMissingPlan = false;

      if (templates.length === 0) {
        templates = maintenanceTemplates.filter(t => t.model === 'GERAL');
        if (templates.length > 0) {
          isFallback = true;
        } else {
          isMissingPlan = true;
          // Create a virtual default template if none exists
          const defaultInterval = machine.measureUnit === 'km' ? 10000 : 250;
          templates = [{
            model: machine.model,
            interval: defaultInterval,
            revision_name: `REVISÃO PADRÃO (${defaultInterval}${machine.measureUnit})`,
            items: ['Plano de manutenção não cadastrado para este modelo.']
          }];
        }
      }
      
      const threshold = machine.measureUnit === 'km' ? 500 : 50;

      if (templates.length > 0) {
        const minInterval = Math.min(...templates.map(t => t.interval));
        const nextMilestone = (machine.lastPreventive || 0) + minInterval;
        const remaining = nextMilestone - machine.horimeter;
        
        if (remaining <= threshold) {
          let applicableTemplate = templates.sort((a, b) => b.interval - a.interval).find(t => nextMilestone % t.interval === 0);
          if (!applicableTemplate) applicableTemplate = templates.find(t => t.interval === minInterval);
          
          if (applicableTemplate) {
            let suggestion = "";
            if (isMissingPlan) {
              suggestion = `⚠️ ATENÇÃO: Plano de manutenção não encontrado para o modelo ${machine.model}. Por favor, adicione um plano específico para este equipamento.`;
            } else if (isFallback) {
              suggestion = `ℹ️ NOTA: Usando plano GERAL. Sugerimos adicionar um plano de manutenção dedicado para o modelo ${machine.model}.`;
            }

            alerts.push({
              machineId: machine.id,
              machineType: machine.type,
              model: machine.model,
              measureUnit: machine.measureUnit,
              horimeter: machine.horimeter,
              nextMilestone: nextMilestone,
              remaining,
              template: applicableTemplate,
              isCustom: false,
              isFallback,
              isMissingPlan,
              suggestion
            });
          }
        }
      }

      // 2. Check custom plans
      const mPlans = maintenancePlans.filter(p => p.machineId === machine.id);
      const duePlans = mPlans.map(p => {
        const nextMilestone = p.lastExchange + p.interval;
        const remaining = nextMilestone - machine.horimeter;
        return { ...p, nextMilestone, remaining };
      }).filter(p => p.remaining <= threshold);

      if (duePlans.length > 0) {
        const minRemaining = Math.min(...duePlans.map(p => p.remaining));
        const nextMilestone = Math.min(...duePlans.map(p => p.nextMilestone));
        
        alerts.push({
          machineId: machine.id,
          machineType: machine.type,
          model: machine.model,
          measureUnit: machine.measureUnit,
          horimeter: machine.horimeter,
          nextMilestone: nextMilestone,
          remaining: minRemaining,
          template: { 
            description: `Itens avulsos: ${duePlans.map(p => p.item).join(', ')}`, 
            interval: 'Variável', 
            items: duePlans.map(p => `${p.item} (Última: ${p.lastExchange}${machine.measureUnit} / Intervalo: ${p.interval}${machine.measureUnit})`) 
          },
          isCustom: true
        });
      }

    });
    return alerts;
  }, [machines, maintenanceTemplates, maintenancePlans]);

  const handleImportInitialMachines = useCallback(async (silent = false, force = false) => {
    if (isSupabaseConfigured) {
      
      if (force && !silent) {
        // Apagar todas as máquinas antes de importar
        const { error: deleteError } = await supabase.from('ativos').delete().neq('id', 'placeholder-non-existent');
        if (deleteError) {
          handleSupabaseError(deleteError, silent, "Erro ao limpar banco de dados!");
          return;
        }
      }

      // Garantir que estamos enviando todos os campos necessários
      const machinesToImport = initialMachines.map((m: any) => ({
        id: m.id,
        type: m.type,
        brand: m.brand,
        model: m.model,
        year: m.year,
        horimeter: m.horimeter,
        measureUnit: m.measureUnit,
        status: m.status,
        location: m.location,
        lastPreventive: m.lastPreventive,
        operator: m.operator,
        specieType: m.specieType,
        bodywork: m.bodywork,
        chassis: m.chassis,
        plate: m.plate,
        renavam: m.renavam,
        implementValue: m.implementValue,
        image: m.image
      }));

      const { error } = await supabase.from('ativos').upsert(machinesToImport.map(mapMachineToDB), { onConflict: 'id' });
      
      if (error) {
        console.error("Error importing machines:", error);
        handleSupabaseError(error, silent, "Erro ao importar veículos!");
      } else {
        const { data: newData } = await supabase.from('ativos').select('*');
        if (newData) setMachines(newData.map(mapDBToMachine));
        if (!silent) alert("Frota importada com sucesso!");
      }
    } else {
      setMachines(initialMachines);
      if (!silent) alert("Frota carregada localmente com sucesso!");
    }
  }, [handleSupabaseError]);

  const handleImportInitialTemplates = useCallback(async (silent = false) => {
    if (!silent) console.log("Iniciando importação de templates...");
    
    // Remove duplicates from initialMaintenanceTemplates based on model and interval
    const uniqueTemplates = initialMaintenanceTemplates.reduce((acc: any[], t) => {
      const exists = acc.find(item => item.model === t.model && item.interval === t.interval);
      if (!exists) {
        acc.push(t);
      }
      return acc;
    }, []);

    const templatesToImport = uniqueTemplates.map(t => ({
      model: t.model,
      interval: t.interval,
      revision_name: t.revision_name,
      items: t.items
    }));

    const templatesWithIds = uniqueTemplates.map(t => ({
      ...t,
      id: Math.random().toString(36).substr(2, 9)
    }));

    if (isSupabaseConfigured) {
      try {
        if (!silent) console.log("Importando planos padrão no Supabase...");
        
        // Obter os planos existentes no banco para não duplicar por modelo_intervalo
        const { data: existing, error: fetchErr } = await supabase.from('modelos_manutencao').select('*');
        if (fetchErr) {
          handleSupabaseError(fetchErr, silent, "Erro ao buscar planos de manutenção existentes!");
          return;
        }
        
        const existingKeys = new Set((existing || []).map(e => `${e.modelo?.toUpperCase()}_${e.intervalo}`));
        
        const newTemplates = templatesToImport.filter(t => {
          const key = `${t.model?.toUpperCase()}_${t.interval}`;
          return !existingKeys.has(key);
        });

        if (newTemplates.length > 0) {
          const mappedToInsert = newTemplates.map(t => mapTemplateToDB({ ...t, id: genId() }));
          const { error: insertErr } = await supabase.from('modelos_manutencao').insert(mappedToInsert);
          if (insertErr) {
            handleSupabaseError(insertErr, silent, "Erro ao salvar novos planos padrão!");
            return;
          }
        }
        
        // Recarregar do banco para garantir sincronia e mapear para camelCase
        const { data: newData } = await supabase.from('modelos_manutencao').select('*');
        if (newData) {
          setMaintenanceTemplates(newData.map(mapDBToTemplate));
          if (!silent) alert("Planos padrão importados e sincronizados com sucesso!");
        }
      } catch (err) {
        handleSupabaseError(err, silent, "Erro inesperado na importação!");
        return;
      }
    } else {
      // Update local state only
      setMaintenanceTemplates([...maintenanceTemplates, ...templatesWithIds]);
      if (!silent) alert("Simulação: Planos carregados localmente.");
    }
  }, [handleSupabaseError]);

  useEffect(() => {
    const fetchData = async () => {
      // Se o Supabase não estiver configurado, não fazemos nada (inicia vazio)
      if (!isSupabaseConfigured) {
        return;
      }
      
      try {
        const [
          { data: machinesData },
          { data: maintenancesData },
          { data: plansData },
          { data: logsData },
          { data: employeesData },
          { data: sitesData },
          { data: reportsData },
          { data: templatesData },
          { data: refillsData }
        ] = await Promise.all([
          supabase.from('ativos').select('*'),
          supabase.from('manutencoes').select('*'),
          supabase.from('planos_manutencao').select('*'),
          supabase.from('registros_diarios').select('*'),
          supabase.from('funcionarios').select('*'),
          supabase.from('frentes_servico').select('*'),
          supabase.from('relatorios_gerenciais').select('*'),
          supabase.from('modelos_manutencao').select('*'),
          supabase.from('abastecimentos_comboio').select('*')
        ]);

        if (machinesData) setMachines(machinesData.map(mapDBToMachine));
        if (maintenancesData) setMaintenances(maintenancesData.map(mapDBToMaintenances));
        if (plansData) setMaintenancePlans(plansData.map(mapDBToPlan));
        if (logsData) setDailyLogs(logsData.map(mapDBToLog));
        if (employeesData) setEmployees(employeesData.map(mapDBToEmployee));
        if (sitesData) setSites(sitesData.map(mapDBToSite));
        if (reportsData) setManagementReports(reportsData);
        if (templatesData) setMaintenanceTemplates(templatesData.map(mapDBToTemplate));
        if (refillsData) setFuelTruckRefills(refillsData.map(mapDBToRefill));
      } catch (error) {
        console.warn("Supabase fetch failed during initialization.");
      }
    };

    fetchData();
  }, [setMachines, setMaintenances, setMaintenancePlans, setDailyLogs, setEmployees, setSites, setManagementReports, setMaintenanceTemplates, setFuelTruckRefills]);

  const handleExportFleet = () => {
    const dataStr = JSON.stringify(machines, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `frota_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportFleetJSON = async (jsonData: any) => {
    let machinesToProcess = [];
    
    if (Array.isArray(jsonData)) {
      machinesToProcess = jsonData;
    } else if (jsonData && typeof jsonData === 'object') {
      // If it's a single machine object or an object containing an array
      if (jsonData.machines && Array.isArray(jsonData.machines)) {
        machinesToProcess = jsonData.machines;
      } else if (jsonData.id) {
        machinesToProcess = [jsonData];
      }
    }

    if (machinesToProcess.length === 0) {
      alert("Erro: O arquivo JSON não contém veículos válidos ou está em formato desconhecido.");
      return;
    }

    console.log(`Iniciando importação de ${machinesToProcess.length} veículos...`);

    // Filter valid machines only (must have an id or identifier like plate)
    const validDataWithIds = machinesToProcess
      .filter(m => m && typeof m === 'object' && (m.id || m.placa || m.plate))
      .map(m => ({
        ...m,
        id: m.id || m.placa || m.plate // Ensure an ID exists for mapping
      }));
    
    if (validDataWithIds.length === 0) {
      alert("Erro: Nenhum veículo com ID ou Placa encontrado no JSON.");
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const mappedMachines = validDataWithIds.map(mapMachineToDB);
        console.log("Dados mapeados para o Supabase:", mappedMachines);
        
        const { error } = await supabase.from('ativos').upsert(mappedMachines, { onConflict: 'id' });
        
        if (error) {
          handleSupabaseError(error, false, "Erro ao importar veículos do JSON!");
          return;
        }
        
        console.log("Importação no Supabase concluída com sucesso. Recarregando frota...");
        const { data: newData, error: fetchError } = await supabase.from('ativos').select('*');
        if (fetchError) throw fetchError;
        
        if (newData) {
          const mappedNewData = newData.map(mapDBToMachine);
          setMachines(mappedNewData);
          console.log("Estado local atualizado com", mappedNewData.length, "veículos.");
        }
        alert(`${validDataWithIds.length} veículos importados/atualizados com sucesso!`);
      } catch (err: any) {
        handleSupabaseError(err, false, "Erro inesperado ao processar JSON!");
      }
    } else {
      // Local mode
      const newMachines = [...machines];
      let added = 0;
      validDataWithIds.forEach(m => {
        const id = m.id;
        const idx = newMachines.findIndex(exist => exist.id === id);
        if (idx >= 0) {
          newMachines[idx] = { ...newMachines[idx], ...m };
        } else {
          newMachines.push({ ...m, id });
          added++;
        }
      });
      setMachines(newMachines);
      alert(`${validDataWithIds.length} veículos processados (${added} novos) localmente.`);
    }
  };

  const handleAddMachine = async (newMachine: any) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('ativos').insert([mapMachineToDB(newMachine)]);
      if (error) {
        handleSupabaseError(error, false, "Erro ao adicionar veículo no banco!");
        return;
      }
    }
    setMachines([...machines, newMachine]);
  };

  const handleEditMachine = async (updatedMachine: any) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('ativos').update(mapMachineToDB(updatedMachine)).eq('id', updatedMachine.id);
      if (error) {
        handleSupabaseError(error, false, "Erro ao atualizar veículo no banco!");
        return;
      }
    }
    setMachines(machines.map(m => m.id === updatedMachine.id ? updatedMachine : m));
  };

  const handleCleanupLocalData = async () => {
    if (!isSupabaseConfigured) {
      alert("Configuração de banco de dados não encontrada.");
      return;
    }

    if (confirm("ATENÇÃO: Você deseja apagar TODOS os dados locais offline (Incluindo rascunhos não sincronizados) e recarregar exclusivamente do Supabase?")) {
      try {
        // 1. Limpar as tabelas do IndexedDB (Offline)
        const { localDb } = await import('@/lib/localDb');
        await Promise.all([
          localDb.checklists.clear(),
          localDb.registrosDiarios.clear(),
          localDb.users.clear()
        ]);
        
        // 2. Limpar a fila do Zustand (Offline Store) e Estados
        const { useFleetStore } = await import('@/lib/store');
        
        // Reset local state completely
        useFleetStore.setState({ 
          filaOffline: [],
          machines: [],
          dailyLogs: [],
          maintenances: [],
          maintenancePlans: [],
          maintenanceTemplates: [],
          employees: [],
          sites: []
        });

        console.log("Databases e fila offline limpos com sucesso.");

        // 3. Buscar dados frescos do Supabase
        const [
          { data: machinesData },
          { data: maintenancesData },
          { data: plansData },
          { data: logsData }
        ] = await Promise.all([
          supabase.from('ativos').select('*'),
          supabase.from('manutencoes').select('*'),
          supabase.from('planos_manutencao').select('*'),
          supabase.from('registros_diarios').select('*')
        ]);

        // Atualiza estado local apenas com dados do banco
        if (machinesData) setMachines(machinesData.map(mapDBToMachine));
        if (maintenancesData) setMaintenances(maintenancesData.map(mapDBToMaintenances));
        if (plansData) setMaintenancePlans(plansData.map(mapDBToPlan));
        if (logsData) setDailyLogs(logsData.map(mapDBToLog));
        
        // 3. Notificar o motor de sincronização para atualizar contadores
        const { syncEngine } = await import('@/lib/syncEngine');
        await syncEngine.countPendingRecords();

        alert("Limpeza profunda concluída. Dados locais offline removidos e banco recarregado.");
      } catch (err: any) {
        handleSupabaseError(err, false, "Erro ao limpar dados locais!");
      }
    }
  };

  const handleRemoveMachine = async (machineId: string) => {
    console.log("Solicitação de exclusão para máquina:", machineId);
    
    // Verificar se a máquina existe localmente antes de tentar deletar
    const machineExists = machines.find(m => m.id === machineId);
    if (!machineExists) {
      console.warn("Máquina não encontrada no estado local:", machineId);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Excluir veículo?",
      message: `Você tem certeza que deseja excluir o veículo ${machineId}? Esta ação não pode ser desfeita se houver dados vinculados. SIM/NÃO`,
      onConfirm: async () => {
        if (isSupabaseConfigured) {
          console.log("Supabase ativo. Tentando deletar no banco...");
          try {
            const { error } = await supabase.from('ativos').delete().eq('id', machineId);
            
            if (error) {
              console.error("Erro retornado pelo Supabase ao deletar:", error);
              
              if (error.code === '23503') {
                alert(`Não foi possível excluir o veículo ${machineId} porque ele possui registros vinculados (manutenções, logs ou abastecimentos). Você deve excluir esses registros primeiro.`);
              } else {
                handleSupabaseError(error, false, "Erro ao remover veículo no banco!");
              }
              return;
            }
            
            console.log("Deleção confirmada no Supabase.");
          } catch (err) {
            console.error("Exceção ao tentar deletar:", err);
            alert("Ocorreu um erro inesperado ao tentar excluir o veículo.");
            return;
          }
        }
        
        // Atualiza estado local apenas se deletou com sucesso ou se não tiver Supabase
        setMachines(machines.filter(m => m.id !== machineId));
        console.log("Remoção de máquina concluída com sucesso.");
      }
    });
  };

  const handleResetCounters = async () => {
    const msg = "ATENÇÃO: Você está prestes a ZERAR os horímetros, quilometragens e últimas preventivas de TODOS os veículos.\n\nIsso afetará o controle de manutenção de toda a frota.\n\nDeseja realmente continuar?";
    if (confirm(msg)) {
      setPreviousMachinesState([...machines]);
      if (isSupabaseConfigured) {
        try {
          // Update all machines
          const { error } = await supabase.from('ativos').update({ horimetro: 0, ultima_preventiva: 0 }).not('id', 'is', null);
          if (error) throw error;
          
          setMachines(machines.map(m => ({ ...m, horimeter: 0, lastPreventive: 0 })));
          alert("Contadores zerados com sucesso! Você pode desfazer esta ação se necessário.");
        } catch (err: any) {
          handleSupabaseError(err, false, "Erro ao zerar contadores!");
        }
      } else {
        setMachines(machines.map(m => ({ ...m, horimeter: 0, lastPreventive: 0 })));
        alert("Contadores zerados localmente! Você pode desfazer esta ação se necessário.");
      }
    }
  };

  const handleUndoReset = async () => {
    if (!previousMachinesState) return;
    if (confirm("Deseja desfazer o reset e restaurar os horímetros e KMs anteriores?")) {
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('ativos').upsert(previousMachinesState.map(mapMachineToDB), { onConflict: 'id' });
          if (error) throw error;
          setMachines(previousMachinesState);
          setPreviousMachinesState(null);
          alert("Ação desfeita com sucesso. Valores restaurados.");
        } catch (err: any) {
          handleSupabaseError(err, false, "Erro ao desfazer!");
        }
      } else {
        setMachines(previousMachinesState);
        setPreviousMachinesState(null);
        alert("Ação desfeita localmente. Valores restaurados.");
      }
    }
  };
  
  const handleAddEmployee = async (newEmployee: any) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('funcionarios').insert([mapEmployeeToDB(newEmployee)]);
      if (error) {
        handleSupabaseError(error, false, "Erro ao adicionar colaborador!");
        return;
      }
    }
    setEmployees([...employees, newEmployee]);
  };
  
  const handleRemoveEmployee = async (employeeId: string) => {
    const empName = employees.find(e => e.id === employeeId)?.name || employeeId;
    setConfirmModal({
      isOpen: true,
      title: "Excluir colaborador?",
      message: `Você tem certeza que deseja excluir o colaborador ${empName}? SIM/NÃO`,
      onConfirm: async () => {
        if (isSupabaseConfigured) {
          const { error } = await supabase.from('funcionarios').delete().eq('id', employeeId);
          if (error) {
            handleSupabaseError(error, false, "Erro ao remover colaborador!");
            return;
          }
        }
        setEmployees(employees.filter(emp => emp.id !== employeeId));
      }
    });
  };

  const handleUpdateEmployeeStatus = async (employeeId: string, status: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('funcionarios').update({ status }).eq('id', employeeId);
      if (error) {
        handleSupabaseError(error, false, "Erro ao atualizar status do colaborador!");
        return;
      }
    }
    setEmployees(employees.map(emp => emp.id === employeeId ? { ...emp, status } : emp));
  };

  const handleAddSite = async (newSiteName: string) => {
    const siteObj = {
      id: genId(),
      nome: newSiteName,
      status: 'Ativo'
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('frentes_servico').insert([mapSiteToDB(siteObj)]);
      if (error) {
        handleSupabaseError(error, false, "Erro ao adicionar obra!");
        return;
      }
    }
    setSites([...sites, mapDBToSite(mapSiteToDB(siteObj))]);
  };

  const handleRemoveSite = async (siteName: string) => {
    // Find the site object by name since some parts of the code might still use strings
    const siteToDelete = sites.find(s => (s.nome === siteName || s.name === siteName || s === siteName));
    if (!siteToDelete) return;

    setConfirmModal({
      isOpen: true,
      title: "Excluir obra?",
      message: `Você tem certeza que deseja excluir a obra ${siteName}? SIM/NÃO`,
      onConfirm: async () => {
        if (isSupabaseConfigured) {
          const { error } = await supabase.from('frentes_servico').delete().eq('nome', siteToDelete.nome || siteToDelete.name || siteToDelete);
          if (error) {
            handleSupabaseError(error, false, "Erro ao remover obra!");
            return;
          }
        }
        setSites(sites.filter(s => (s.id ? s.id !== siteToDelete.id : s !== siteName)));
      }
    });
  };

  const handleAddDailyLog = async (newLog: any) => {
    const isCompleted = newLog.endHorimeter && newLog.endHorimeter > 0;
    const now = new Date().toISOString();
    const logWithStatus = { 
      ...newLog, 
      status: isCompleted ? 'Concluído' : 'Em Andamento',
      openedAt: now,
      closedAt: isCompleted ? now : null
    };

    // Clean data: ensure no NaN or undefined values are sent to Supabase
    const cleanLog = { ...logWithStatus };
    Object.keys(cleanLog).forEach(key => {
      if (typeof cleanLog[key] === 'number' && isNaN(cleanLog[key])) {
        cleanLog[key] = 0;
      }
      if (cleanLog[key] === undefined) {
        delete cleanLog[key];
      }
    });

    if (isSupabaseConfigured) {
      if (!navigator.onLine) {
        adicionarFilaOffline({
          id: cleanLog.id,
          dados: cleanLog,
          tipo: 'parte_diaria'
        });
        console.log("Offline: Registro adicionado à fila para sincronização futura.");
      } else {
        try {
          const { error: insertError } = await supabase.from('registros_diarios').insert([mapLogToDB(cleanLog)]);
          
          if (insertError) {
            handleSupabaseError(insertError, false, "Erro ao salvar parte diária no banco!");
            return;
          }
        } catch (err: any) {
          const errStr = String(err?.message || err?.stack || err).toLowerCase();
          const isNetworkError = errStr.includes('failed to fetch') || 
                                 errStr.includes('network error') || 
                                 errStr.includes('unreachable') || 
                                 err?.name === 'TypeError';
          
          if (isNetworkError) {
            setIsDbOffline(true);
            adicionarFilaOffline({
              id: cleanLog.id,
              dados: cleanLog,
              tipo: 'parte_diaria'
            });
            console.log("Erro de rede: Registro adicionado à fila para sincronização futura.");
          } else {
            handleSupabaseError(err, false, "Erro inesperado ao conectar com o banco de dados.");
            return;
          }
        }
      }

      // Debit fuel truck if source is Comboio
      if (newLog.fuel && newLog.fuel > 0 && newLog.fuelSource === 'Comboio') {
        const debit = {
           id: `DEB-AUTO-${genId().split('-')[0]}`,
          date: newLog.date + 'T' + new Date().toLocaleTimeString('pt-BR', { hour12: false }),
          amount: newLog.fuel,
          machineId: newLog.machineId,
          type: 'Débito'
        };
        handleRefillTruck(debit);
      }
      
      if (isCompleted) {
        const machine = machines.find(m => m.id === newLog.machineId);
        if (machine && newLog.endHorimeter > machine.horimeter) {
          if (navigator.onLine) {
            const { error: updateError } = await supabase.from('ativos').update({ horimetro: newLog.endHorimeter }).eq('id', newLog.machineId);
            if (updateError) console.error("Error updating machine horimeter:", updateError.message, updateError);
          }
        }
      }
    }
    
    setDailyLogs([logWithStatus, ...dailyLogs]);
    if (isCompleted) {
      setMachines(machines.map(m => 
        m.id === newLog.machineId 
          ? { ...m, horimeter: newLog.endHorimeter > m.horimeter ? newLog.endHorimeter : m.horimeter } 
          : m
      ));
    }
  };

  const handleEditDailyLog = async (updatedLog: any) => {
    const oldLog = dailyLogs.find(l => l.id === updatedLog.id);
    const isCompleted = updatedLog.endHorimeter && updatedLog.endHorimeter > 0;
    const now = new Date().toISOString();
    
    const logWithStatus = { 
      ...updatedLog, 
      status: isCompleted ? 'Concluído' : 'Em Andamento',
      openedAt: updatedLog.openedAt || now,
      closedAt: (isCompleted && !updatedLog.closedAt) ? now : updatedLog.closedAt
    };

    // Clean data
    const cleanLog = { ...logWithStatus };
    Object.keys(cleanLog).forEach(key => {
      if (typeof cleanLog[key] === 'number' && isNaN(cleanLog[key])) {
        cleanLog[key] = 0;
      }
      if (cleanLog[key] === undefined) {
        delete cleanLog[key];
      }
    });

    if (isSupabaseConfigured) {
      try {
        let { error: updateError } = await supabase.from('registros_diarios').update(mapLogToDB(cleanLog)).eq('id', updatedLog.id);
        
        // Fallback if columns are missing in Supabase (status, openedAt, closedAt, fuelSource)
        if (updateError && updateError.message.includes("column") && 
           (updateError.message.includes("openedAt") || updateError.message.includes("closedAt") || updateError.message.includes("status") || updateError.message.includes("fuelSource"))) {
          const fallbackLog = mapLogToDB({ ...cleanLog });
          delete (fallbackLog as any).aberto_em;
          delete (fallbackLog as any).fechado_em;
          delete (fallbackLog as any).status;
          delete (fallbackLog as any).fonte_combustivel;
          const { error: retryError } = await supabase.from('registros_diarios').update(fallbackLog).eq('id', updatedLog.id);
          updateError = retryError;
          if (!updateError) {
            console.warn("Daily log updated with fallback (missing columns). Please update your Supabase schema.");
          }
        }

        if (updateError) {
          handleSupabaseError(updateError, false, "Erro ao atualizar parte diária no banco!");
          return;
        }

        // Handle fuel truck debit changes
        if (oldLog) {
          const oldFuel = ((oldLog as any).fuelSource === 'Comboio') ? (Number((oldLog as any).fuel) || 0) : 0;
          const newFuel = (updatedLog.fuelSource === 'Comboio') ? (Number(updatedLog.fuel) || 0) : 0;
          const diff = newFuel - oldFuel;

          if (diff !== 0) {
            const adjustment = {
               id: `ADJ-AUTO-${genId().split('-')[0]}`,
              date: updatedLog.date + 'T' + new Date().toLocaleTimeString('pt-BR', { hour12: false }),
              amount: Math.abs(diff),
              machineId: updatedLog.machineId,
              type: diff > 0 ? 'Débito' : 'Entrada'
            };
            handleRefillTruck(adjustment);
          }
        }
        
        if (isCompleted) {
          const machine = machines.find(m => m.id === updatedLog.machineId);
          if (machine && updatedLog.endHorimeter > machine.horimeter) {
            const { error: machineUpdateError } = await supabase.from('ativos').update({ horimetro: updatedLog.endHorimeter }).eq('id', updatedLog.machineId);
            if (machineUpdateError) console.error("Error updating machine horimeter:", machineUpdateError.message, machineUpdateError);
          }
        }
      } catch (err) {
        handleSupabaseError(err, false, "Erro inesperado ao conectar com o banco de dados.");
        return;
      }
    }
    
    setDailyLogs(dailyLogs.map(l => l.id === updatedLog.id ? logWithStatus : l));
    if (isCompleted) {
      setMachines(machines.map(m => 
        m.id === updatedLog.machineId 
          ? { ...m, horimeter: updatedLog.endHorimeter > m.horimeter ? updatedLog.endHorimeter : m.horimeter } 
          : m
      ));
    }
  };

  const handleDeleteDailyLog = async (logId: string) => {
    const logToDelete = dailyLogs.find(l => l.id === logId);
    setConfirmModal({
      isOpen: true,
      title: "Excluir registro diário?",
      message: `Você tem certeza que deseja excluir o registro diário ${logId}? SIM/NÃO`,
      onConfirm: async () => {
        if (isSupabaseConfigured) {
          const { error } = await supabase.from('registros_diarios').delete().eq('id', logId);
          if (error) {
            handleSupabaseError(error, false, "Erro ao excluir parte diária no banco!");
            return;
          }
        }

        // Return fuel to truck if it was sourced from Comboio
        if (logToDelete && (logToDelete as any).fuelSource === 'Comboio' && (logToDelete as any).fuel > 0) {
          const refund = {
             id: `REF-AUTO-${genId().split('-')[0]}`,
            date: new Date().toISOString(),
            amount: Number((logToDelete as any).fuel),
            machineId: (logToDelete as any).machineId,
            type: 'Entrada'
          };
          handleRefillTruck(refund);
        }

        setDailyLogs(dailyLogs.filter(l => l.id !== logId));
      }
    });
  };

  const handleDeleteMaintenance = async (maintenanceId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir manutenção/OS?",
      message: `Você tem certeza que deseja excluir a manutenção ${maintenanceId}? SIM/NÃO`,
      onConfirm: async () => {
        if (isSupabaseConfigured) {
          const { error } = await supabase.from('manutencoes').delete().eq('id', maintenanceId);
          if (error) {
            handleSupabaseError(error, false, "Erro ao excluir manutenção!");
            return;
          }
        }
        setMaintenances(maintenances.filter(m => m.id !== maintenanceId));
      }
    });
  };

  const handleUpdateLogStatus = async (logId: string, status: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('registros_diarios').update({ status: status }).eq('id', logId);
      if (error) {
        handleSupabaseError(error, false, "Erro ao atualizar status da avaria!");
        return;
      }
    }
    setDailyLogs(dailyLogs.map(l => l.id === logId ? { ...l, avariaStatus: status } : l));
  };

  const handleAddMaintenance = async (newMaintenance: any) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('manutencoes').insert([mapMaintenancesToDB(newMaintenance)]);
      if (error) {
        handleSupabaseError(error, false, "Erro ao adicionar manutenção!");
        return;
      }
    }
    setMaintenances([newMaintenance, ...maintenances]);
  };

  const handleAddMaintenancePlan = async (newPlan: any) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('planos_manutencao').insert([mapPlanToDB(newPlan)]);
      if (error) {
        handleSupabaseError(error, false, "Erro ao adicionar plano de manutenção!");
        return;
      }
    }
    setMaintenancePlans([...maintenancePlans, newPlan]);
  };

  const handleAddTemplate = async (newTemplate: any) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('modelos_manutencao').insert([mapTemplateToDB(newTemplate)]).select();
      if (error) {
        handleSupabaseError(error, false, "Erro ao adicionar template!");
        return;
      }
      if (data) setMaintenanceTemplates([...maintenanceTemplates, data[0]]);
    } else {
      setMaintenanceTemplates([...maintenanceTemplates, { ...newTemplate, id: genId() }]);
    }
  };

  const handleEditTemplate = async (updatedTemplate: any) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('modelos_manutencao').update(mapTemplateToDB(updatedTemplate)).eq('id', updatedTemplate.id);
      if (error) {
        handleSupabaseError(error, false, "Erro ao atualizar template!");
        return;
      }
    }
    setMaintenanceTemplates(maintenanceTemplates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
  };

  const handleRemoveTemplate = async (templateId: string) => {
    const template = maintenanceTemplates.find(t => t.id === templateId);
    const templateName = template ? `${template.model} (${template.interval})` : templateId;
    
    setConfirmModal({
      isOpen: true,
      title: "Excluir plano de prevenção?",
      message: `Você tem certeza que deseja excluir o plano/template ${templateName}? SIM/NÃO`,
      onConfirm: async () => {
        if (isSupabaseConfigured) {
          const { error } = await supabase.from('modelos_manutencao').delete().eq('id', templateId);
          if (error) {
            handleSupabaseError(error, false, "Erro ao remover template!");
            return;
          }
        }
        setMaintenanceTemplates(maintenanceTemplates.filter(t => t.id !== templateId));
      }
    });
  };

  const handleUpdateMaintenancePlan = async (updatedPlan: any) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('planos_manutencao').update(mapPlanToDB(updatedPlan)).eq('id', updatedPlan.id);
      if (error) {
        handleSupabaseError(error, false, "Erro ao atualizar plano!");
        return;
      }
    }
    setMaintenancePlans(maintenancePlans.map(p => p.id === updatedPlan.id ? updatedPlan : p));
  };

  const handlePerformPreventive = async (machineId: string, nextMilestoneDone: number) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('ativos').update({ ultima_preventiva: nextMilestoneDone }).eq('id', machineId);
      if (error) {
        handleSupabaseError(error, false, "Erro ao atualizar última preventiva!");
        return;
      }
    }
    setMachines(machines.map(m => 
      m.id === machineId 
        ? { ...m, lastPreventive: nextMilestoneDone } 
        : m
    ));
  };

  const handlePerformCustomPreventive = async (machineId: string, duePlans: any[]) => {
    if (isSupabaseConfigured) {
      for (const plan of duePlans) {
        const { error } = await supabase.from('planos_manutencao').update({ ultima_troca: plan.nextMilestone }).eq('id', plan.id);
        if (error) {
          handleSupabaseError(error, false, "Erro ao atualizar plano customizado!");
          return;
        }
      }
    }
    setMaintenancePlans(maintenancePlans.map(p => {
      const duePlan = duePlans.find(dp => dp.id === p.id);
      if (duePlan) {
        return { ...p, lastExchange: duePlan.nextMilestone };
      }
      return p;
    }));
  };

  const handleSendToManagement = async (reportData: any) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('relatorios_gerenciais').insert([reportData]);
      if (error) {
        handleSupabaseError(error, false, "Erro ao enviar relatório para gerência!");
        return;
      }
    }
    setManagementReports([reportData, ...managementReports]);
  };

  const handleAcknowledgeReport = async (reportId: string, linkedLogId: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('relatorios_gerenciais').update({ status: 'Aprovado' }).eq('id', reportId);
      if (error) {
        handleSupabaseError(error, false, "Erro ao aprovar relatório!");
        return;
      }
    }
    setManagementReports(managementReports.map(r => r.id === reportId ? { ...r, status: 'Aprovado' } : r));
    if (linkedLogId) {
       handleUpdateLogStatus(linkedLogId, 'Aprovado Gerência');
    }
  };

  const menuItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { id: 'daily-logs', label: 'Registro Diário', icon: ClipboardList, path: '/parte-diaria' },
      { id: 'performance', label: 'Meu Desempenho', icon: Trophy, path: '/performance' },
      { id: 'fuel-truck', label: 'Caminhão Comboio', icon: Droplets, path: '/abastecimento' },
      { id: 'workshop', label: 'Oficina / Triagem', icon: Cog, path: '/oficina' },
      { id: 'preventive-plans', label: 'Planos de Manutenção', icon: FileText, path: '/manutencao' },
      { id: 'maintenance-plans', label: 'Controle Avulso', icon: Gauge, path: '/planos' },
      { id: 'machines', label: 'Frota e Caminhões', icon: Truck, path: '/frota' },
      { id: 'maintenance', label: 'Ordens de Serviço', icon: Wrench, path: '/ordens-servico' },
      { id: 'reports', label: 'Métricas em Campo', icon: BarChart3, path: '/relatorios' },
      { id: 'admin', label: 'Painel Administrativo', icon: ShieldCheck, path: '/configuracoes' },
      { id: 'mobile-hub', label: 'Centro Mobile APK', icon: Smartphone, path: '/mobile-hub' },
    ];
    
    if (isAdmin) {
      return items;
    }
    
    const roleNormalized = (userProfile?.role || 'colaborador').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (roleNormalized === 'mecanico') {
      return items.filter(item => 
        item.id === 'daily-logs' || 
        item.id === 'performance' || 
        item.id === 'fuel-truck' || 
        item.id === 'workshop' || 
        item.id === 'mobile-hub'
      );
    }
    
    return items.filter(item => 
      item.id === 'daily-logs' || 
      item.id === 'performance' || 
      item.id === 'mobile-hub'
    );
  }, [isAdmin, userProfile]);

  // Efeito de segurança para forçar a view correta de acordo com regras de negócio
  useEffect(() => {
    if (isAuthenticated && userProfile && !isAdmin) {
      const roleNormalized = (userProfile.role || 'colaborador').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const allowedViews = roleNormalized === 'mecanico'
        ? ['daily-logs', 'performance', 'fuel-truck', 'workshop', 'mobile-hub']
        : ['daily-logs', 'performance', 'mobile-hub'];
        
      if (!allowedViews.includes(currentView)) {
        console.log("Security redirect: user role", userProfile.role, "attempted to access", currentView);
        setCurrentView('daily-logs');
      }
    }
  }, [isAuthenticated, userProfile, isAdmin, currentView]);

  const hasTopBanner = !isSupabaseConfigured || (isDbOffline && isSupabaseConfigured);

  return (
    <div className="min-h-screen bg-white dark:bg-[#101010] flex flex-col md:flex-row font-sans">
      
      {!isSupabaseConfigured && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-3 text-center text-sm font-medium shadow-md">
          ⚠️ Banco de dados em nuvem não configurado. As alterações feitas agora serão perdidas ao recarregar a página. <br className="md:hidden" />
          <span className="hidden md:inline"> </span>
          Siga as instruções no chat para conectar o Supabase.
        </div>
      )}

      {isDbOffline && isSupabaseConfigured && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#eab308] text-white p-3 text-center text-sm font-medium shadow-md flex justify-center items-center gap-2">
          <span>📶</span>
          <div>
            <strong>Modo Portátil Ativo:</strong> Conexão offline ou protegida com o Supabase. Suas alterações estão seguras no localStorage e serão sincronizadas automaticamente ao restabelecer a rede.
          </div>
        </div>
      )}

      <div className={`md:hidden bg-white dark:bg-[#101010] border-b border-gray-200 dark:border-white/5 text-gray-800 dark:text-white p-4 flex justify-between items-center ${hasTopBanner ? 'mt-16' : ''}`}>
        <div className="flex items-center">
          <div className="font-bold text-xl tracking-wider text-yellow-500">CODELMAQ</div>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-800 dark:text-gray-100 dark:text-gray-300 hover:text-yellow-500">
          <MoreVertical size={24} />
        </button>
      </div>

      <nav className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-white dark:bg-[#101010] border-r border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300 flex-shrink-0 flex flex-col ${hasTopBanner ? 'md:mt-12' : ''}`}>
        <div className="hidden md:flex justify-center p-6 mb-4">
          <div className="font-bold text-3xl tracking-wider text-yellow-500">CODELMAQ</div>
        </div>

        <div className="flex-1 px-4 space-y-2 py-4 md:py-0 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.path) {
                    router.push(item.path);
                  } else {
                    setCurrentView(item.id);
                  }
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-yellow-500 text-yellow-950 font-semibold shadow-md' 
                    : 'hover:bg-gray-100 dark:bg-[#1e1e1e] hover:text-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-yellow-950' : 'text-gray-400'} />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2 mt-auto">
          <SyncIndicator />
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-yellow-950 font-bold text-sm">
                {userProfile?.nome ? userProfile.nome.charAt(0).toUpperCase() : (isAdmin ? 'AD' : 'OP')}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white truncate max-w-[100px]">
                  {userProfile?.nome || (isAdmin ? 'Administrador' : 'Operador')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                  {isAdmin ? 'Administrador' : (userProfile?.role || 'Colaborador')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setUsuario(null);
                localStorage.removeItem('auth-storage');
                router.push('/login');
              }}
              className="p-2 text-gray-400 hover:text-red-400 bg-gray-900 border border-gray-800 rounded-xl hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer flex items-center justify-center"
              title="Sair do Sistema"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </nav>

      <main className={`flex-1 p-4 md:p-8 overflow-y-auto ${!isSupabaseConfigured ? 'md:mt-12' : ''}`}>
        <div className="max-w-7xl mx-auto">
          {currentView === 'dashboard' && isAdmin && (
            <DashboardView machines={machines} maintenances={maintenances} logs={dailyLogs} alerts={maintenanceAlerts} />
          )}
          {currentView === 'daily-logs' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#101010]/30 border border-[#7c4ff0]/20 dark:border-[#a17af0]/15 shadow-sm rounded-2xl p-4">
                <div>
                  <h3 className="text-sm font-bold text-[#7c4ff0] dark:text-[#a17af0] font-heading uppercase flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#7c4ff0] dark:text-[#a17af0] animate-pulse" />
                    Canal de Entrada de Dados de Frota
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Selecione o método operacional de apontamento de checklist e horários.</p>
                </div>
                <div className="flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl text-xs gap-1">
                  <button 
                    type="button"
                    onClick={() => setDailyLogMode('offline-forms')}
                    className={`px-3 py-1.5 rounded-lg font-bold font-heading uppercase transition-all flex items-center gap-1 cursor-pointer ${dailyLogMode === 'offline-forms' ? 'bg-[#ca8a04] dark:bg-[#eab308] text-white shadow-md shadow-yellow-500/20 font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
                  >
                    🚀 Formulários Offline
                  </button>
                  <button 
                    type="button"
                    onClick={() => setDailyLogMode('online-logs')}
                    className={`px-3 py-1.5 rounded-lg font-bold font-heading uppercase transition-all flex items-center gap-1 cursor-pointer ${dailyLogMode === 'online-logs' ? 'bg-[#ca8a04] dark:bg-[#eab308] text-white shadow-md shadow-yellow-500/20 font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
                  >
                    ☁️ Tabela Online
                  </button>
                </div>
              </div>
              
              {dailyLogMode === 'offline-forms' ? (
                <OfflineFormPanel 
                  machines={machines} 
                  sites={sites} 
                  employees={employees} 
                  currentUserProfile={userProfile} 
                />
              ) : (
                <DailyLogView logs={dailyLogs} machines={machines} employees={employees} sites={sites} onAddLog={handleAddDailyLog} onEditLog={handleEditDailyLog} onDeleteLog={handleDeleteDailyLog} isAdminAuthenticated={isAdmin} />
              )}
            </div>
          )}
          {currentView === 'performance' && (
            <PerformanceView 
              scoringRules={scoringRules} 
              pointsHistory={pointsHistory} 
              monthlyRanking={monthlyRanking} 
              employees={employees}
              userProfile={userProfile}
              logs={dailyLogs}
            />
          )}
          {currentView === 'fuel-truck' && (isAdmin || isMecanico) && (
            <FuelTruckView 
              stock={currentFuelTruckStock} 
              refills={fuelTruckRefills} 
              onRefill={handleRefillTruck} 
              onEditRefill={handleEditRefillTruck}
              onDeleteRefill={handleDeleteRefillTruck}
              onMachineRefill={handleMachineRefillTruck}
              machines={machines}
              logs={dailyLogs} 
              isAdmin={isAdmin || isMecanico}
            />
          )}
          {currentView === 'preventive-plans' && isAdmin && (
            <MaintenancePlansView templates={maintenanceTemplates} onAddTemplate={handleAddTemplate} onEditTemplate={handleEditTemplate} onRemoveTemplate={handleRemoveTemplate} onImportInitialTemplates={handleImportInitialTemplates} />
          )}
          {currentView === 'maintenance-plans' && isAdmin && (
            <MaintenancePlanView machines={machines} plans={maintenancePlans} onAddPlan={handleAddMaintenancePlan} onUpdatePlan={handleUpdateMaintenancePlan} />
          )}
          {currentView === 'workshop' && (isAdmin || isMecanico) && (
            <WorkshopView logs={dailyLogs} machines={machines} employees={employees} plans={maintenancePlans} alerts={maintenanceAlerts} onAddMaintenance={handleAddMaintenance} onUpdateLogStatus={handleUpdateLogStatus} onPerformPreventive={handlePerformPreventive} onPerformCustomPreventive={handlePerformCustomPreventive} onSendToManagement={handleSendToManagement} />
          )}
          {currentView === 'machines' && isAdmin && (
            <MachinesView machines={machines} onEditMachine={handleEditMachine} onRemoveMachine={handleRemoveMachine} />
          )}
          {currentView === 'maintenance' && isAdmin && (
            <MaintenanceView 
              maintenances={maintenances} 
              machines={machines}
              onDeleteMaintenance={handleDeleteMaintenance} 
              onAddMaintenance={handleAddMaintenance}
              isAdminAuthenticated={isAdmin} 
            />
          )}
          {currentView === 'reports' && isAdmin && (
            <ReportsView logs={dailyLogs} machines={machines} employees={employees} />
          )}
          {currentView === 'admin' && isAdmin && (
            <AdminView 
              machines={machines} onAddMachine={handleAddMachine} onEditMachine={handleEditMachine} onRemoveMachine={handleRemoveMachine} onImportInitialMachines={handleImportInitialMachines}
              onExportFleet={handleExportFleet} onImportFleetJSON={handleImportFleetJSON}
              employees={employees} onAddEmployee={handleAddEmployee} onRemoveEmployee={handleRemoveEmployee} onUpdateEmployeeStatus={handleUpdateEmployeeStatus}
              sites={sites} onAddSite={handleAddSite} onRemoveSite={handleRemoveSite}
              onResetCounters={handleResetCounters}
              onUndoReset={handleUndoReset}
              canUndoReset={!!previousMachinesState}
              onShowRLSModal={() => setShowRLSModal(true)}
              onCleanupLocalData={handleCleanupLocalData}
            />
          )}
          {currentView === 'mobile-hub' && (
            <MobileApkHub />
          )}
        </div>
      </main>

      {showRLSModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#151515] rounded-2xl shadow-2xl w-full max-w-2xl max-w-[90vw] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-red-600 p-6 text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <ShieldCheck size={32} />
                <div>
                  <h3 className="text-xl font-bold">Correção de Permissões (RLS)</h3>
                  <p className="text-red-100 text-sm">O Supabase bloqueou a gravação de dados.</p>
                </div>
              </div>
              <button onClick={() => setShowRLSModal(false)} className="hover:bg-red-700 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 text-amber-800 text-sm">
                <p className="font-bold mb-1">Por que isso acontece?</p>
                <p>Por padrão, o Supabase protege suas tabelas. Você precisa autorizar explicitamente o acesso público para que o aplicativo funcione corretamente.</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Siga estes passos:</p>
                <ol className="text-sm text-gray-600 dark:text-gray-300 list-decimal ml-5 space-y-1">
                  <li>Abra o seu <strong>Painel do Supabase</strong>.</li>
                  <li>Vá em <strong>SQL Editor</strong> no menu lateral.</li>
                  <li>Clique em <strong>New Query</strong>.</li>
                  <li>Cole o código abaixo e clique em <strong>Run</strong>.</li>
                </ol>
              </div>

              <div className="relative group">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed max-h-64">
                  {FIX_RLS_SQL}
                </pre>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(FIX_RLS_SQL);
                    alert("SQL copiado para a área de transferência!");
                  }}
                  className="absolute top-3 right-3 bg-white dark:bg-[#151515]/10 hover:bg-white dark:bg-[#151515]/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all backdrop-blur-sm border border-white/10"
                >
                  Copiar SQL
                </button>
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-[#101010] border-t flex justify-end">
              <button 
                onClick={() => setShowRLSModal(false)}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition-all"
              >
                Entendi, vou executar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#151515] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 dark:border-white/5">
            <div className="bg-[#a17af0] p-6 text-white flex items-center gap-3">
              <AlertTriangle className="text-white shrink-0" size={28} />
              <h3 className="text-xl font-semibold font-sans tracking-tight">{confirmModal.title || "Confirmar Exclusão"}</h3>
            </div>
            
            <div className="p-6 text-gray-700 dark:text-gray-200">
              <p className="text-sm font-medium leading-relaxed font-sans">{confirmModal.message}</p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#101010] border-t border-gray-100 dark:border-white/5 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-zinc-700 transition-all font-sans text-sm"
              >
                NÃO
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const onConfirmAction = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await onConfirmAction();
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-red-900/20 font-sans text-sm"
              >
                SIM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FIX_RLS_SQL = `-- 1. CRIAR TABELAS SE NÃO EXISTIREM

CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  type TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  status TEXT,
  location TEXT,
  horimeter NUMERIC DEFAULT 0,
  "measureUnit" TEXT DEFAULT 'h',
  "lastPreventive" NUMERIC DEFAULT 0,
  operator TEXT DEFAULT '-',
  "specieType" TEXT,
  chassis TEXT,
  plate TEXT,
  renavam TEXT,
  "implementValue" NUMERIC DEFAULT 0,
  bodywork TEXT
);

CREATE TABLE IF NOT EXISTS employees (
  name TEXT PRIMARY KEY,
  role TEXT
);

CREATE TABLE IF NOT EXISTS sites (
  name TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  role TEXT DEFAULT 'colaborador',
  status TEXT DEFAULT 'pendente',
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  interval INTEGER NOT NULL,
  revision_name TEXT NOT NULL,
  items JSONB NOT NULL,
  UNIQUE(model, interval)
);

CREATE TABLE IF NOT EXISTS maintenances (
  id TEXT PRIMARY KEY,
  "machineId" TEXT REFERENCES machines(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL,
  horimeter NUMERIC NOT NULL,
  items JSONB NOT NULL,
  cost NUMERIC DEFAULT 0,
  "nextMilestone" NUMERIC
);

CREATE TABLE IF NOT EXISTS maintenance_plans (
  id TEXT PRIMARY KEY,
  "machineId" TEXT REFERENCES machines(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  "lastExchange" NUMERIC NOT NULL,
  interval NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_logs (
  id TEXT PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  "machineId" TEXT REFERENCES machines(id) ON DELETE CASCADE,
  "operatorName" TEXT,
  "startHorimeter" NUMERIC NOT NULL,
  "endHorimeter" NUMERIC NOT NULL,
  "fuelAmount" NUMERIC DEFAULT 0,
  site TEXT,
  checklist JSONB,
  observations TEXT,
  "avariaStatus" TEXT DEFAULT 'Normal'
);

CREATE TABLE IF NOT EXISTS management_reports (
  id TEXT PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT DEFAULT 'Pendente'
);

CREATE TABLE IF NOT EXISTS fuel_truck_refills (
  id TEXT PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount NUMERIC NOT NULL,
  "machineId" TEXT REFERENCES machines(id) ON DELETE SET NULL,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scoring_rules (
  id_regra TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor_pontos INTEGER NOT NULL,
  tipo_calculo TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS points_history (
  id_log TEXT PRIMARY KEY,
  id_motorista TEXT NOT NULL,
  id_regra TEXT REFERENCES scoring_rules(id_regra),
  data_evento TIMESTAMP WITH TIME ZONE NOT NULL,
  valor_aplicado INTEGER NOT NULL,
  referencia_id TEXT
);

CREATE TABLE IF NOT EXISTS monthly_ranking (
  id_motorista TEXT PRIMARY KEY,
  pontos_acumulados INTEGER DEFAULT 0,
  posicao_anterior INTEGER
);

-- 2. HABILITAR RLS E CRIAR POLÍTICAS DE ACESSO PÚBLICO (PARA DESENVOLVIMENTO)

DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name IN ('machines', 'employees', 'sites', 'funcionarios', 'maintenance_templates', 'maintenances', 'maintenance_plans', 'daily_logs', 'management_reports', 'fuel_truck_refills', 'scoring_rules', 'points_history', 'monthly_ranking')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow public access" ON %I FOR ALL TO public USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;`;
