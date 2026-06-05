-- Create machines table
CREATE TABLE machines (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  "measureUnit" TEXT NOT NULL,
  horimeter NUMERIC NOT NULL,
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  "lastPreventive" NUMERIC NOT NULL,
  operator TEXT NOT NULL,
  "specieType" TEXT,
  bodywork TEXT,
  chassis TEXT,
  plate TEXT,
  renavam TEXT
);

-- Create employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL
);

-- Create sites table
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- Create maintenances table
CREATE TABLE maintenances (
  id TEXT PRIMARY KEY,
  "machineId" TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  "type_maintenance" TEXT,
  status TEXT NOT NULL,
  urgency TEXT NOT NULL
);

-- Create maintenance_plans table
CREATE TABLE maintenance_plans (
  id TEXT PRIMARY KEY,
  "machineId" TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  "lastExchange" NUMERIC NOT NULL,
  interval NUMERIC NOT NULL
);

-- Create daily_logs table
CREATE TABLE daily_logs (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  "machineId" TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  operator TEXT NOT NULL,
  location TEXT NOT NULL,
  "startHorimeter" NUMERIC NOT NULL,
  "endHorimeter" NUMERIC NOT NULL,
  fuel NUMERIC NOT NULL,
  observations TEXT,
  "hasAvaria" BOOLEAN NOT NULL DEFAULT false,
  "avariaStatus" TEXT,
  checklist JSONB,
  photos TEXT[]
);

-- Create maintenance_templates table
CREATE TABLE maintenance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  interval NUMERIC NOT NULL,
  "revision_name" TEXT NOT NULL,
  items JSONB NOT NULL
);
CREATE TABLE management_reports (
  id TEXT PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  "machineId" TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  urgency TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  photos TEXT[],
  "linkedLogId" TEXT REFERENCES daily_logs(id) ON DELETE SET NULL
);
