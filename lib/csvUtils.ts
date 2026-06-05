// CSV import and export helpers for Codelmaq Frota

export interface MachineCSV {
  id: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  status: string;
  location: string;
  horimeter: number;
  measureUnit: string;
  lastPreventive: number;
  operator: string;
  specieType: string;
  bodywork: string;
  chassis: string;
  plate: string;
  renavam: string;
  implementValue: number;
  image: string;
}

// Portuguese Header to English DB Field mappings
export const CSV_HEADER_MAP: { [key: string]: keyof MachineCSV } = {
  'ID': 'id',
  'Tipo': 'type',
  'Marca': 'brand',
  'Modelo': 'model',
  'Ano': 'year',
  'Status': 'status',
  'Localizacao': 'location',
  'Horimetro_KM_Atual': 'horimeter',
  'Unidade_Medida': 'measureUnit',
  'Ultima_Preventiva': 'lastPreventive',
  'Operador_Responsavel': 'operator',
  'Tipo_Especie': 'specieType',
  'Carroceria': 'bodywork',
  'Chassi': 'chassis',
  'Placa': 'plate',
  'Renavam': 'renavam',
  'Valor_Implemento': 'implementValue',
  'Imagem_URL': 'image'
};

// Inverse map for exporting
export const DB_TO_CSV_HEADER_MAP = Object.entries(CSV_HEADER_MAP).reduce((acc, [ptHeader, engField]) => {
  acc[engField] = ptHeader;
  return acc;
}, {} as { [key in keyof MachineCSV]: string });

/**
 * Exports machine list into structured CSV format carrying UTF-8 with BOM for Excel compatibility.
 */
export function exportMachinesToCSV(machines: MachineCSV[]): string {
  const headers = Object.keys(DB_TO_CSV_HEADER_MAP) as Array<keyof MachineCSV>;
  const headerLabels = headers.map(h => DB_TO_CSV_HEADER_MAP[h]);
  
  const csvRows = [headerLabels.join(';')];
  
  machines.forEach(m => {
    const values = headers.map(h => {
      let val = m[h];
      if (val === undefined || val === null) {
        val = '';
      }
      
      // Escape semicolon etc.
      const strVal = String(val).replace(/"/g, '""');
      if (strVal.includes(';') || strVal.includes('\n') || strVal.includes('"')) {
        return `"${strVal}"`;
      }
      return strVal;
    });
    csvRows.push(values.join(';'));
  });
  
  return '\uFEFF' + csvRows.join('\r\n');
}

/**
 * Parses raw CSV content, auto-detecting comma vs semicolon, and validates headers.
 */
export function parseMachinesCSV(rawContent: string): { data: Partial<MachineCSV>[], errors: string[] } {
  const lines = rawContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { data: [], errors: ['O arquivo CSV está vazio.'] };
  }

  // Remove potential BOM mark
  let firstLine = lines[0];
  if (firstLine.charCodeAt(0) === 0xFEFF) {
    firstLine = firstLine.slice(1);
  }

  // Auto detect separator (; or ,)
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const separator = semiCount >= commaCount ? ';' : ',';

  // Extract raw headers
  const rawHeaders = splitCSVLine(firstLine, separator).map(h => h.trim());
  const headerIndices: { [key: string]: number } = {};
  
  rawHeaders.forEach((h, index) => {
    headerIndices[h] = index;
  });

  // Validate that critical headers exist (e.g. ID, Tipo, Modelo, Marca)
  const missingCritical: string[] = [];
  ['ID', 'Tipo', 'Marca', 'Modelo'].forEach(crit => {
    if (headerIndices[crit] === undefined) {
      missingCritical.push(crit);
    }
  });

  if (missingCritical.length > 0) {
    return {
      data: [],
      errors: [`Cabeçalhos obrigatórios do sistema ausentes no CSV: ${missingCritical.join(', ')}`]
    };
  }

  const parsedRecords: Partial<MachineCSV>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawFields = splitCSVLine(lines[i], separator);
    if (rawFields.length < rawHeaders.length) {
      if (rawFields.join('').trim() === '') continue; // Skip empty row
    }

    const record: any = {};
    let isRowValid = true;

    Object.entries(CSV_HEADER_MAP).forEach(([ptHeader, engField]) => {
      const idx = headerIndices[ptHeader];
      if (idx !== undefined && idx < rawFields.length) {
        const rawVal = rawFields[idx].trim();
        
        // Convert to appropriate type
        if (engField === 'year' || engField === 'horimeter' || engField === 'lastPreventive' || engField === 'implementValue') {
          const numVal = Number(rawVal.replace(',', '.')); // support comma decimal points natively
          record[engField] = isNaN(numVal) ? 0 : numVal;
        } else {
          record[engField] = rawVal;
        }
      } else {
        // Optional headers fallback
        if (engField === 'year' || engField === 'horimeter' || engField === 'lastPreventive' || engField === 'implementValue') {
          record[engField] = 0;
        } else {
          record[engField] = '';
        }
      }
    });

    if (isRowValid) {
      parsedRecords.push(record);
    }
  }

  return { data: parsedRecords, errors };
}

// Helper to split CSV line respect double quotes
function splitCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === separator && !insideQuotes) {
      result.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  result.push(currentField);
  return result;
}
