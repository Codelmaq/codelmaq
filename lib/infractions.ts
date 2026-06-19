// Penalty infractions catalog — Programa de Excelência CODELMAQ
// Each infraction has a code, label, default points, and an icon hint.
// Admin can debit the points (valor is always <= 0) from an operator's total.

export interface Infraction {
  code: string;
  label: string;
  points: number;          // baseline (negative)
  description: string;
  category: 'safety' | 'care' | 'operation' | 'discipline';
}

export const INFRACTIONS: Infraction[] = [
  {
    code: 'DAILY_CHECK',
    label: 'Deixar de fazer o Daily Check',
    points: -50,
    description: 'Não realizar o checklist diário no início do turno.',
    category: 'care',
  },
  {
    code: 'NEGLIGENCE_LIGHT',
    label: 'Multa ou avaria por descuido (leve)',
    points: -300,
    description: 'Multa de trânsito ou avaria leve causada por descuido.',
    category: 'safety',
  },
  {
    code: 'NEGLIGENCE_HEAVY',
    label: 'Multa ou avaria por descuido (grave)',
    points: -500,
    description: 'Multa grave, avaria séria ou acidente por negligência.',
    category: 'safety',
  },
  {
    code: 'IDLE_ENGINE',
    label: 'Motor ocioso sem necessidade',
    points: -20,
    description: 'Deixar o motor ligado sem motivo por tempo prolongado.',
    category: 'operation',
  },
  {
    code: 'NO_EPI',
    label: 'Não usar EPI obrigatório',
    points: -100,
    description: 'Operar sem equipamento de proteção individual obrigatório.',
    category: 'safety',
  },
  {
    code: 'UNAUTHORIZED_USE',
    label: 'Uso não autorizado do equipamento',
    points: -200,
    description: 'Uso do equipamento fora do horário/escopo autorizado.',
    category: 'discipline',
  },
  {
    code: 'CUSTOM',
    label: 'Outra (definir manualmente)',
    points: 0,
    description: 'Descreva a infração e defina os pontos a serem debitados.',
    category: 'discipline',
  },
];

export const getInfractionByCode = (code: string): Infraction | undefined =>
  INFRACTIONS.find((i) => i.code === code);
