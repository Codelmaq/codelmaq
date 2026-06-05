-- 1. CRIAR TABELAS SE NÃO EXISTIREM

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
END $$;
