import React from 'react';

export const StatusBadge = ({ status }: { status: string }) => {
  let color = 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-100 border-gray-200 dark:border-white/10';
  if (status === 'Disponível') color = 'bg-green-100 text-green-800 border-green-200';
  if (status === 'Em Operação') color = 'bg-blue-100 text-blue-800 border-blue-200';
  if (status === 'Em Manutenção') color = 'bg-red-100 text-red-800 border-red-200';

  return (
    <span className={`px-2.5 py-1 text-xs font-medium border rounded-full ${color}`}>
      {status}
    </span>
  );
};

export const UrgencyBadge = ({ urgency }: { urgency: string }) => {
  let color = 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-100';
  if (urgency === 'Alta') color = 'bg-red-100 text-red-800';
  if (urgency === 'Média') color = 'bg-yellow-100 text-yellow-800';
  if (urgency === 'Baixa') color = 'bg-green-100 text-green-800';

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md ${color}`}>
      {urgency}
    </span>
  );
};
