// Reward catalog — Programa de Excelência CODELMAQ
// Each reward has a code, label, default points (positive), and a description.
// Admin can credit points (valor is always >= 0) to an operator's total.

export interface Reward {
  code: string;
  label: string;
  points: number;          // baseline (positive)
  description: string;
  category: 'excellence' | 'safety' | 'teamwork' | 'care';
}

export const REWARDS: Reward[] = [
  {
    code: 'EXTRA_SHIFT',
    label: 'Turno extra voluntário',
    points: 100,
    description: 'Comparecimento espontâneo em turno adicional para cobrir a operação.',
    category: 'teamwork',
  },
  {
    code: 'BRAVERY',
    label: 'Ato de coragem / decisão rápida',
    points: 200,
    description: 'Tomada de decisão ágil que evitou acidente ou prejuízo maior.',
    category: 'safety',
  },
  {
    code: 'ZERO_ACIDENTE',
    label: 'Zero acidente no mês',
    points: 150,
    description: 'Operou o mês inteiro sem nenhuma ocorrência de segurança.',
    category: 'safety',
  },
  {
    code: 'ECONOMIA_COMBUSTIVEL',
    label: 'Economia de combustível destacada',
    points: 100,
    description: 'Consumo abaixo da média da frota sem perda de produtividade.',
    category: 'excellence',
  },
  {
    code: 'CUIDADO_EQUIPAMENTO',
    label: 'Cuidado exemplar com equipamento',
    points: 80,
    description: 'Equipamento entregue em estado impecável, com checklist impecável.',
    category: 'care',
  },
  {
    code: 'MENTORIA',
    label: 'Mentoria a novo operador',
    points: 120,
    description: 'Acompanhou e treinou operador novato até a autonomia.',
    category: 'teamwork',
  },
  {
    code: 'IDEIA',
    label: 'Ideia implementada (melhoria contínua)',
    points: 250,
    description: 'Sugestão aprovada e implementada que trouxe ganho real de processo.',
    category: 'excellence',
  },
  {
    code: 'CUSTOM',
    label: 'Outro (definir manualmente)',
    points: 0,
    description: 'Descreva a bonificação e defina os pontos a serem creditados.',
    category: 'excellence',
  },
];

export const getRewardByCode = (code: string): Reward | undefined =>
  REWARDS.find((r) => r.code === code);