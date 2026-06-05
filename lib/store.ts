import { mapDBToMachine, mapMachineToDB, mapDBToLog, mapLogToDB, mapDBToRefill, mapRefillToDB, mapDBToPlan, mapPlanToDB, mapDBToMaintenances, mapMaintenancesToDB, mapDBToEmployee, mapEmployeeToDB, mapSiteToDB, mapDBToSite, mapDBToTemplate, mapTemplateToDB } from '@/lib/mapper';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { genId } from '@/lib/utils';
import { 
  initialMachines, initialMaintenances, initialMaintenancePlans, 
  initialDailyLogs, initialEmployees, initialSites, initialManagementReports,
  initialMaintenanceTemplates, initialScoringRules, initialPointsHistory, initialMonthlyRanking
} from '@/lib/data';

// Tipo do registro pendente
export interface RegistroPendente {
  id: string; // Um UUID gerado localmente (ex: crypto.randomUUID())
  dados: any; // Dados validados pelo Zod
  tipo: 'parte_diaria' | 'abastecimento';
}

interface FleetState {
  filaOffline: RegistroPendente[];
  machines: any[];
  maintenances: any[];
  maintenancePlans: any[];
  maintenanceTemplates: any[];
  dailyLogs: any[];
  employees: any[];
  sites: any[];
  managementReports: any[];
  fuelTruckRefills: any[];
  scoringRules: any[];
  pointsHistory: any[];
  monthlyRanking: any[];
  
  setMachines: (machines: any[]) => void;
  setMaintenances: (maintenances: any[]) => void;
  setMaintenancePlans: (plans: any[]) => void;
  setMaintenanceTemplates: (templates: any[]) => void;
  setDailyLogs: (logs: any[]) => void;
  setEmployees: (employees: any[]) => void;
  setSites: (sites: any[]) => void;
  setManagementReports: (reports: any[]) => void;
  setFuelTruckRefills: (refills: any[]) => void;
  setScoringRules: (rules: any[]) => void;
  setPointsHistory: (history: any[]) => void;
  setMonthlyRanking: (ranking: any[]) => void;

  adicionarFilaOffline: (registro: RegistroPendente) => void;
  removerDaFila: (id: string) => void;
  sincronizarComSupabase: () => Promise<void>;
}

export const useFleetStore = create<FleetState>()(
  persist(
    (set, get) => ({
      filaOffline: [],
      machines: [],
      maintenances: [],
      maintenancePlans: [],
      maintenanceTemplates: [],
      dailyLogs: [],
      employees: [],
      sites: [],
      managementReports: [],
      fuelTruckRefills: [],
      scoringRules: [],
      pointsHistory: [],
      monthlyRanking: [],

      setMachines: (machines) => set({ machines }),
      setMaintenances: (maintenances) => set({ maintenances }),
      setMaintenancePlans: (maintenancePlans) => set({ maintenancePlans }),
      setMaintenanceTemplates: (maintenanceTemplates) => set({ maintenanceTemplates }),
      setDailyLogs: (dailyLogs) => set({ dailyLogs }),
      setEmployees: (employees) => set({ employees }),
      setSites: (sites) => set({ sites }),
      setManagementReports: (managementReports) => set({ managementReports }),
      setFuelTruckRefills: (fuelTruckRefills) => set({ fuelTruckRefills }),
      setScoringRules: (scoringRules) => set({ scoringRules }),
      setPointsHistory: (pointsHistory) => set({ pointsHistory }),
      setMonthlyRanking: (monthlyRanking) => set({ monthlyRanking }),
      
      adicionarFilaOffline: (registro) => 
        set((state) => ({ filaOffline: [...state.filaOffline, registro] })),
        
      removerDaFila: (id) => 
        set((state) => ({ filaOffline: state.filaOffline.filter((r) => r.id !== id) })),

      sincronizarComSupabase: async () => {
        const { filaOffline, removerDaFila } = get();
        if (filaOffline.length === 0 || !navigator.onLine) return;

        // Import supabase here to avoid circular dependency or initialization issues if needed,
        // but since it's a singleton we can just import it at the top.
        const { supabase } = await import('@/lib/supabase');

        for (const item of filaOffline) {
          try {
            console.log(`Sincronizando item ${item.id} (${item.tipo})...`);
            
            // Validate UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id);
            const syncPayload = { ...item.dados };
            if (!isUuid) {
               console.warn(`Healing invalid UUID in store sync: ${item.id}`);
               syncPayload.id = genId();
            }

            if (item.tipo === 'parte_diaria') {
              const { error } = await supabase.from('registros_diarios').insert([mapLogToDB(syncPayload)]);
              if (error) {
                // Handle FK violation
                if (error.code === '23503') {
                  console.error(`FK violation in store sync for ${item.id}:`, error.details);
                  // We skip this item as it's unfixable due to missing equipment/operator in DB
                  removerDaFila(item.id);
                  continue;
                }

                // Handle invalid integer/type (22P02)
                if (error.code === '22P02') {
                  console.error(`Invalid data type for ${item.tipo} ${item.id}:`, error.message);
                  removerDaFila(item.id);
                  continue;
                }
                
                // Fallback for missing columns
                if (error.message.includes("column") && 
                   (error.message.includes("openedAt") || error.message.includes("closedAt") || error.message.includes("status") || error.message.includes("fuelSource"))) {
                  const fallbackLog = { ...item.dados };
                  delete fallbackLog.openedAt;
                  delete fallbackLog.closedAt;
                  delete fallbackLog.status;
                  delete fallbackLog.fuelSource;
                  const { error: retryError } = await supabase.from('registros_diarios').insert([fallbackLog]);
                  if (retryError) throw retryError;
                } else {
                  throw error;
                }
              }
            } else if (item.tipo === 'abastecimento') {
              const { error } = await supabase.from('abastecimentos_comboio').insert([mapRefillToDB(syncPayload)]);
              if (error) {
                // Handle FK violation
                if (error.code === '23503') {
                  console.error(`FK violation in store sync for ${item.id}:`, error.details);
                  // Remove orphan record from queue as it can't be fixed without the parent machine
                  removerDaFila(item.id);
                  continue;
                }

                // Handle invalid integer/type (22P02)
                if (error.code === '22P02') {
                  console.error(`Invalid data type for ${item.tipo} ${item.id}:`, error.message);
                  removerDaFila(item.id);
                  continue;
                }

                if (error.message.includes("column") && error.message.includes("machineId")) {
                  const fallbackRefill = { ...item.dados };
                  delete fallbackRefill.machineId;
                  const { error: retryError } = await supabase.from('abastecimentos_comboio').insert([fallbackRefill]);
                  if (retryError) throw retryError;
                } else {
                  throw error;
                }
              }
            }
            
            removerDaFila(item.id); // Remove da fila local após sucesso
          } catch (error) {
            console.error("Erro ao sincronizar, manteremos na fila", error);
          }
        }
      }
    }),
    {
      name: 'codelmaq-offline-storage', // Nome da chave no storage local
      storage: createJSONStorage(() => localStorage), 
    }
  )
);
