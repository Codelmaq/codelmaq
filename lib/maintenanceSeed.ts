// Demo seed for maintenance plans — populates templates and plans so the user
// can see how the maintenance system works.
//
// What it does:
// 1. Inserts sample maintenance templates (preventive) for the most common
//    machine types: Caminhão Basculante, Escavadeira, Trator de Esteira.
// 2. For every existing machine, adds 2-3 custom maintenance plans with
//    realistic intervals (oil change, hydraulic filters, tire rotation).
//    Each plan has its `lastExchange` set to a value that makes the alert
//    fire (Atenção or Vencido).
//
// This is a ONE-SHOT demo seed. It will not duplicate templates or plans
// that already exist (matched by model+interval or machineId+item).

export interface DemoTemplate {
  model: string;
  interval: number;          // hours or km depending on the machine
  revision_name: string;
  items: string[];
}

export const DEMO_TEMPLATES: DemoTemplate[] = [
  {
    model: 'Caminhão Basculante',
    interval: 250,
    revision_name: 'Revisão 250h — Caminhão Basculante',
    items: [
      'Trocar óleo do motor e filtro',
      'Verificar sistema de freios',
      'Inspecionar pneus e calibragem',
      'Verificar nível de fluidos (óleo, água, Arla)',
      'Lubrificar articulações da caçamba',
    ],
  },
  {
    model: 'Caminhão Basculante',
    interval: 10000,
    revision_name: 'Revisão 10.000km — Caminhão Basculante',
    items: [
      'Alinhamento e balanceamento',
      'Troca de filtros de ar e cabine',
      'Inspeção da suspensão',
      'Verificar sistema elétrico',
    ],
  },
  {
    model: 'Escavadeira Hidráulica',
    interval: 500,
    revision_name: 'Revisão 500h — Escavadeira',
    items: [
      'Trocar óleo hidráulico e filtros',
      'Verificar pinos e buchas da lança',
      'Inspecionar mangueiras hidráulicas',
      'Verificar motor diesel',
    ],
  },
  {
    model: 'Trator de Esteira',
    interval: 250,
    revision_name: 'Revisão 250h — Trator',
    items: [
      'Trocar óleo do motor',
      'Verificar sistema de transmissão',
      'Inspecionar lagartas e roletes',
      'Lubrificar pontos de articulação',
    ],
  },
];

export const CUSTOM_PLAN_PRESETS: Array<{
  item: string;
  interval: number;
  overdueBy: number;        // how many hours/km past the lastExchange
  description: string;
}> = [
  {
    item: 'Troca de Óleo do Motor',
    interval: 250,
    overdueBy: 30,
    description: 'Trocar óleo e filtro de óleo do motor.',
  },
  {
    item: 'Filtros Hidráulicos',
    interval: 500,
    overdueBy: 60,
    description: 'Substituir filtros do sistema hidráulico.',
  },
  {
    item: 'Inspeção de Pneus / Lagartas',
    interval: 200,
    overdueBy: 25,
    description: 'Verificar desgaste, calibragem e integridade.',
  },
];

export interface SeedResult {
  templatesAdded: number;
  templatesSkipped: number;
  plansAdded: number;
  plansSkipped: number;
  machinesUpdated: number;
}

export function computeSeedActions(
  existingTemplates: Array<{ model?: string; interval?: number }>,
  existingPlans: Array<{ machineId?: string; item?: string }>,
  machines: Array<{ id: string; measureUnit?: string; horimeter?: number; lastPreventive?: number }>,
): {
  newTemplates: DemoTemplate[];
  newPlans: Array<{ machineId: string; item: string; description: string; interval: number; lastExchange: number; measureUnit: string }>;
  machineUpdates: Array<{ id: string; lastPreventive: number }>;
  templatesSkipped: number;
  plansSkipped: number;
} {
  const templateKeys = new Set(
    existingTemplates.map((t) => `${t.model || ''}::${t.interval}`)
  );
  const newTemplates = DEMO_TEMPLATES.filter(
    (t) => !templateKeys.has(`${t.model}::${t.interval}`)
  );

  const planKeys = new Set(
    existingPlans.map((p) => `${p.machineId || ''}::${p.item}`)
  );

  const newPlans: Array<{
    machineId: string;
    item: string;
    description: string;
    interval: number;
    lastExchange: number;
    measureUnit: string;
  }> = [];
  const machineUpdates: Array<{ id: string; lastPreventive: number }> = [];

  for (const m of machines) {
    const measureUnit = m.measureUnit || 'h';
    const baseHorimeter = typeof m.horimeter === 'number' ? m.horimeter : 1500;
    if (typeof m.lastPreventive !== 'number' || m.lastPreventive === 0) {
      machineUpdates.push({
        id: m.id,
        lastPreventive: Math.max(0, baseHorimeter - 200),
      });
    }

    for (const preset of CUSTOM_PLAN_PRESETS) {
      const key = `${m.id}::${preset.item}`;
      if (planKeys.has(key)) continue;
      const lastExchange = baseHorimeter - (preset.interval - preset.overdueBy);
      newPlans.push({
        machineId: m.id,
        item: preset.item,
        description: preset.description,
        interval: preset.interval,
        lastExchange,
        measureUnit,
      });
    }
  }

  const plansSkipped = machines.length * CUSTOM_PLAN_PRESETS.length - newPlans.length;
  return {
    newTemplates,
    newPlans,
    machineUpdates,
    templatesSkipped: DEMO_TEMPLATES.length - newTemplates.length,
    plansSkipped,
  };
}
