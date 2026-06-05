import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateDailyLogsPDF = (logs: any[], machines: any[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Relatório de Registros Diários', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

  const tableColumn = ["Data", "Equipamento", "Operador", "Local", "Horímetro", "Combustível", "Status"];
  const tableRows: any[] = [];

  logs.forEach(log => {
    const machine = machines.find(m => m.id === log.machineId);
    const machineName = machine ? `${machine.id} (${machine.plate})` : log.machineId;
    const horimeter = `${log.startHorimeter} - ${log.endHorimeter || '...'}`;
    const fuel = log.fuel ? `${log.fuel}L (${log.fuelSource})` : '-';
    
    const logData = [
      new Date(log.date).toLocaleDateString('pt-BR'),
      machineName,
      log.operator,
      log.location,
      horimeter,
      fuel,
      log.status || 'Concluído'
    ];
    tableRows.push(logData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save(`registros_diarios_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateFuelTruckPDF = (refills: any[], machines: any[], currentStock: number) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Relatório de Abastecimento - Caminhão Comboio', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
  doc.text(`Estoque Atual: ${currentStock} Litros`, 14, 36);

  const tableColumn = ["Data", "Tipo", "Quantidade (L)", "Equipamento/Fornecedor", "Observações"];
  const tableRows: any[] = [];

  refills.forEach(refill => {
    let target = '-';
    if (refill.type === 'Débito' && refill.machineId) {
      const machine = machines.find(m => m.id === refill.machineId);
      target = machine ? `${machine.id} (${machine.plate})` : refill.machineId;
    } else if (refill.type === 'Crédito' && refill.supplier) {
      target = refill.supplier;
    }

    const rowData = [
      new Date(refill.date).toLocaleString('pt-BR'),
      refill.type,
      refill.amount,
      target,
      refill.observations || '-'
    ];
    tableRows.push(rowData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 42,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save(`abastecimentos_comboio_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generatePerformancePDF = (ranking: any[], pointsHistory: any[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Relatório de Métricas em Campo', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

  // Ranking Table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Ranking de Operadores', 14, 45);

  const rankingColumn = ["Posição", "Operador", "Pontos", "Nível"];
  const rankingRows: any[] = [];

  ranking.forEach((rank, index) => {
    rankingRows.push([
      `${index + 1}º`,
      rank.operator,
      rank.points,
      rank.level
    ]);
  });

  autoTable(doc, {
    head: [rankingColumn],
    body: rankingRows,
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  // History Table
  const finalY = (doc as any).lastAutoTable.finalY || 50;
  
  doc.setFontSize(14);
  doc.text('Histórico de Pontuações', 14, finalY + 15);

  const historyColumn = ["Data", "Operador", "Ação", "Pontos"];
  const historyRows: any[] = [];

  pointsHistory.forEach(history => {
    historyRows.push([
      new Date(history.date).toLocaleDateString('pt-BR'),
      history.operator,
      history.action,
      history.points > 0 ? `+${history.points}` : history.points
    ]);
  });

  autoTable(doc, {
    head: [historyColumn],
    body: historyRows,
    startY: finalY + 25,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save(`metricas_campo_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateFieldMetricsPDF = (machineStats: any[], operatorStats: any[], reportType: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Relatório de Métricas em Campo', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

  if (reportType === 'machines') {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Horas / Equipamento', 14, 45);

    const tableColumn = ["Equipamento", "Dias Trabalhados", "Combustível", "Total Horas"];
    const tableRows: any[] = [];

    machineStats.forEach(stat => {
      tableRows.push([
        stat.id,
        `${stat.daysWorked} dias`,
        `${stat.fuel} L`,
        stat.totalHours
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });
  } else {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Horas / Operador', 14, 45);

    const tableColumn = ["Operador", "Função", "Dias Trabalhados", "Total Horas", "Máquinas"];
    const tableRows: any[] = [];

    operatorStats.forEach(stat => {
      tableRows.push([
        stat.name,
        stat.role,
        `${stat.daysWorked} dias`,
        stat.totalHours,
        stat.machines
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });
  }

  doc.save(`metricas_campo_detalhado_${new Date().toISOString().split('T')[0]}.pdf`);
};
