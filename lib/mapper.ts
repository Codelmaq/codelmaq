import { genId } from '@/lib/utils';

const ensureNumber = (val: any) => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

export const ensureUUID = (val: any) => {
  if (!val || typeof val !== 'string') return null;
  const cleanVal = val.trim();
  if (cleanVal === '-' || cleanVal === '') return null;
  
  // Basic UUID regex check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(cleanVal) ? cleanVal : null;
};

export const mapMachineToDB = (m: any) => ({
  id: m.id,
  tipo: m.type || m.tipo,
  marca: m.brand || m.marca,
  modelo: m.model || m.modelo,
  ano: ensureNumber(m.year || m.ano),
  unidade_medida: m.measureUnit || m.unidade_medida,
  horimetro: ensureNumber(m.horimeter || m.horimetro),
  status: m.status,
  localizacao: m.location || m.localizacao,
  ultima_preventiva: ensureNumber(m.lastPreventive || m.ultima_preventiva),
  operador_id: ensureUUID(m.operatorId || m.operador_id || m.operator),
  tipo_especie: m.specieType || m.tipo_especie,
  carroceria: m.bodywork || m.carroceria,
  chassi: m.chassis || m.chassi,
  placa: m.plate || m.placa,
  renavam: m.renavam,
  valor_implemento: ensureNumber(m.implementValue || m.valor_implemento),
  imagem_url: m.image || m.imagem_url || m.image_url
});

export const mapDBToMachine = (db: any) => ({
  id: db.id,
  type: db.tipo,
  brand: db.marca,
  model: db.modelo,
  year: db.ano,
  measureUnit: db.unidade_medida,
  horimeter: db.horimetro,
  status: db.status,
  location: db.localizacao,
  lastPreventive: db.ultima_preventiva,
  operatorId: db.operador_id,
  operator: db.operador_id, // For legacy compatibility
  specieType: db.tipo_especie,
  bodywork: db.carroceria,
  chassis: db.chassi,
  plate: db.placa,
  renavam: db.renavam,
  implementValue: db.valor_implemento,
  image: db.imagem_url
});

export const mapLogToDB = (l: any) => ({
  id: l.id || genId(),
  ativo_id: l.machineId || l.ativo_id,
  operador_id: ensureUUID(l.operatorId || l.operador_id || l.operator),
  frente_servico_id: ensureUUID(l.siteId || l.frente_servico_id || l.location),
  data: l.date || l.data,
  horimetro_inicial: ensureNumber(l.startHorimeter || l.horimetro_inicial),
  horimetro_final: ensureNumber(l.endHorimeter || l.horimetro_final),
  status: l.status,
  combustivel_adicionado: ensureNumber(l.fuelAdded || l.combustivel_adicionado || l.fuel),
  fonte_combustivel: l.fuelSource || l.fonte_combustivel,
  observacoes: l.observations || l.observacoes,
  aberto_em: l.openedAt || l.aberto_em || l.horaInicio,
  fechado_em: l.closedAt || l.fechado_em || l.horaFim || l.fechadoEm,
  fotos: Array.isArray(l.photos) && l.photos.length > 0 ? l.photos : null,
  foto_horimetro_inicial: l.fotoHorimetroInicial || l.foto_horimetro_inicial || null,
  foto_horimetro_final: l.fotoHorimetroFinal || l.foto_horimetro_final || null
});

export const mapDBToLog = (db: any) => ({
  id: db.id,
  machineId: db.ativo_id,
  operatorId: db.operador_id,
  operator: db.operador_id,
  siteId: db.frente_servico_id,
  location: db.frente_servico_id,
  date: db.data,
  startHorimeter: db.horimetro_inicial,
  endHorimeter: db.horimetro_final,
  status: db.status,
  fuelAdded: db.combustivel_adicionado,
  fuel: db.combustivel_adicionado,
  fuelSource: db.fonte_combustivel,
  observations: db.observacoes,
  openedAt: db.aberto_em,
  closedAt: db.fechado_em,
  photos: Array.isArray(db.fotos) ? db.fotos : [],
  fotoHorimetroInicial: db.foto_horimetro_inicial || null,
  fotoHorimetroFinal: db.foto_horimetro_final || null
});

export const mapRefillToDB = (r: any) => ({
  id: r.id,
  data: r.date,
  ativo_id: r.machineId,
  tipo_combustivel: r.fuelType,
  quantidade: ensureNumber(r.amount),
  localizacao: ensureUUID(r.location || r.siteId) || r.location,
  custo_total: ensureNumber(r.totalCost),
  frentista_id: ensureUUID(r.attendantId || r.frentistaId)
});

export const mapDBToRefill = (db: any) => ({
  id: db.id,
  date: db.data,
  machineId: db.ativo_id,
  fuelType: db.tipo_combustivel,
  amount: db.quantidade,
  location: db.localizacao,
  totalCost: db.custo_total,
  attendantId: db.frentista_id
});

export const mapPlanToDB = (p: any) => {
  const tolerances = p.tolerances || { item: p.item, interval: Number(p.interval || 0) };
  const interval = Number(tolerances.interval || p.interval || 0);
  const nextMilestone = Number(p.nextMilestone || (Number(p.lastExchange || 0) + interval));
  
  return {
    id: p.id || genId(),
    ativo_id: p.machineId,
    proximo_marco: nextMilestone,
    ultima_troca: Number(p.lastExchange || 0),
    tolerancias: tolerances,
    status: p.status || 'Agendado'
  };
};

export const mapDBToPlan = (db: any) => {
  const tolerances = typeof db.tolerancias === 'string' 
    ? JSON.parse(db.tolerancias) 
    : (db.tolerancias || {});
  
  const item = tolerances.item || '';
  const interval = Number(tolerances.interval || 0);

  return {
    id: db.id,
    machineId: db.ativo_id,
    nextMilestone: Number(db.proximo_marco || (Number(db.ultima_troca || 0) + interval)),
    lastExchange: Number(db.ultima_troca || 0),
    tolerances: tolerances,
    status: db.status || 'Agendado',
    item: item,
    interval: interval
  };
};

export const mapMaintenancesToDB = (m: any) => ({
  id: m.id,
  data: m.date,
  ativo_id: m.machineId,
  tipo: m.type,
  horimetro: ensureNumber(m.horimeter),
  descricao: m.description,
  pecas_usadas: m.partsUsed || null,
  mecanico_id: ensureUUID(m.mechanicId),
  custo: ensureNumber(m.cost)
});

export const mapDBToMaintenances = (db: any) => ({
  id: db.id,
  date: db.data,
  machineId: db.ativo_id,
  type: db.tipo,
  horimeter: db.horimetro,
  description: db.descricao,
  partsUsed: db.pecas_usadas,
  mechanicId: db.mecanico_id,
  cost: db.custo
});

export const mapEmployeeToDB = (e: any) => ({
  id: ensureUUID(e.id) || genId(),
  nome: e.nome || e.name || 'Sem Nome',
  email: e.email || null,
  funcao: e.funcao || e.role || 'operador',
  status: e.status || 'aprovado'
});

export const mapDBToEmployee = (db: any) => ({
  id: db.id,
  name: db.nome,
  nome: db.nome,
  email: db.email,
  role: db.funcao,
  funcao: db.funcao,
  status: db.status
});

export const mapSiteToDB = (s: any) => ({
  id: ensureUUID(s.id) || genId(),
  nome: s.nome || s.name || (typeof s === 'string' ? s : 'Sem Nome'), 
  status: s.status || 'Ativo',
  localizacao: s.localizacao || s.location || null
});

export const mapDBToSite = (db: any) => ({
  id: db.id,
  name: db.nome,
  nome: db.nome,
  status: db.status,
  location: db.localizacao,
  localizacao: db.localizacao
});

export const mapTemplateToDB = (t: any) => ({
  id: t.id || genId(),
  modelo: t.model,
  intervalo: t.interval,
  tarefas: t.items || null,
  sub_modelo: t.revision_name || null
});

export const mapDBToTemplate = (db: any) => ({
  id: db.id,
  model: db.modelo,
  interval: db.intervalo,
  items: db.tarefas,
  revision_name: db.sub_modelo
});

export const mapChecklistToDB = (chk: any) => ({
  id: chk.id,
  ativo_id: chk.machineId,
  supervisor_id: ensureUUID(chk.supervisorId),
  data: chk.data,
  status: chk.status,
  respostas: chk.answers || null,
  observacoes: chk.observacoes || null,
  fotos: Array.isArray(chk.defectPhotos) && chk.defectPhotos.length > 0 ? chk.defectPhotos : null
});

export const mapDBToChecklist = (db: any) => ({
  id: db.id,
  machineId: db.ativo_id,
  supervisorId: db.supervisor_id,
  data: db.data,
  status: db.status,
  answers: db.respostas,
  observacoes: db.observacoes,
  defectPhotos: Array.isArray(db.fotos) ? db.fotos : [],
  synced: 1
});

export const mapBonusToDB = (b: any) => ({
  id: ensureUUID(b.id) || genId(),
  operador_id: ensureUUID(b.operatorId || b.operador_id),
  operador_nome: b.operatorName || b.operador_nome || null,
  codigo_bonificacao: b.rewardCode || b.codigo_bonificacao,
  descricao: b.rewardLabel || b.descricao || 'Bonificação',
  pontos: ensureNumber(b.points || b.pontos) ?? 0,
  foto_evidencia: b.photoEvidencia || b.foto_evidencia || null,
  observacoes: b.observacoes || null,
  aplicado_por: ensureUUID(b.aplicadoPor || b.aplicado_por),
  aplicado_por_nome: b.aplicadoPorNome || b.aplicado_por_nome || null,
  data_evento: b.dataEvento || b.data_evento || new Date().toISOString()
});

export const mapDBToBonus = (db: any) => ({
  id: db.id,
  operatorId: db.operador_id,
  operatorName: db.operador_nome,
  rewardCode: db.codigo_bonificacao,
  rewardLabel: db.descricao,
  points: db.pontos,
  photoEvidencia: db.foto_evidencia,
  observacoes: db.observacoes,
  aplicadoPor: db.aplicado_por,
  aplicadoPorNome: db.aplicado_por_nome,
  dataEvento: db.data_evento,
  createdAt: db.criado_em,
  synced: 1
});

export const mapPenaltyToDB = (p: any) => ({
  id: ensureUUID(p.id) || genId(),
  operador_id: ensureUUID(p.operatorId || p.operador_id),
  operador_nome: p.operatorName || p.operador_nome || null,
  codigo_infracao: p.infractionCode || p.codigo_infracao,
  descricao: p.infractionLabel || p.descricao || 'Infração',
  pontos: ensureNumber(p.points || p.pontos) ?? 0,
  foto_evidencia: p.photoEvidencia || p.foto_evidencia,
  observacoes: p.observacoes || null,
  aplicado_por: ensureUUID(p.aplicadoPor || p.aplicado_por),
  aplicado_por_nome: p.aplicadoPorNome || p.aplicado_por_nome || null,
  data_evento: p.dataEvento || p.data_evento || new Date().toISOString()
});

export const mapDBToPenalty = (db: any) => ({
  id: db.id,
  operatorId: db.operador_id,
  operatorName: db.operador_nome,
  infractionCode: db.codigo_infracao,
  infractionLabel: db.descricao,
  points: db.pontos,
  photoEvidencia: db.foto_evidencia,
  observacoes: db.observacoes,
  aplicadoPor: db.aplicado_por,
  aplicadoPorNome: db.aplicado_por_nome,
  dataEvento: db.data_evento,
  createdAt: db.criado_em,
  synced: 1
});

