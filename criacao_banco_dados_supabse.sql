-- Script p/ Inicialização do Banco de Dados no Supabase em Português
-- Copie e cole isso na seção "SQL Editor" do Supabase e clique em "Run"

-- Habilitar a extensão para gerar UUIDs automaticamente
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- LIMPEZA (DROP) DAS TABELAS ANTIGAS PARA REFAZER DO ZERO
-- ==========================================
DROP TABLE IF EXISTS public.relatorios_gerenciais CASCADE;
DROP TABLE IF EXISTS public.manutencoes CASCADE;
DROP TABLE IF EXISTS public.planos_manutencao CASCADE;
DROP TABLE IF EXISTS public.modelos_manutencao CASCADE;
DROP TABLE IF EXISTS public.checklists CASCADE;
DROP TABLE IF EXISTS public.abastecimentos_comboio CASCADE;
DROP TABLE IF EXISTS public.registros_diarios CASCADE;
DROP TABLE IF EXISTS public.ativos CASCADE;
DROP TABLE IF EXISTS public.frentes_servico CASCADE;
DROP TABLE IF EXISTS public.perfis CASCADE;
DROP TABLE IF EXISTS public.funcionarios CASCADE;
DROP TABLE IF EXISTS public.machines CASCADE;
DROP TABLE IF EXISTS public.daily_logs CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.fuel_truck_refills CASCADE;
DROP TABLE IF EXISTS public.maintenance_plans CASCADE;
DROP TABLE IF EXISTS public.maintenances CASCADE;
DROP TABLE IF EXISTS public.maintenance_templates CASCADE;
DROP TABLE IF EXISTS public.management_reports CASCADE;
DROP TABLE IF EXISTS public.sites CASCADE;

-- ==========================================
-- 1. FUNCIONÁRIOS (Antes: employees/funcionarios)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT,
  funcao TEXT,
  status TEXT DEFAULT 'Ativo',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. PERFIS (Antes: profiles)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT,
  funcao TEXT,
  avatar_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. FRENTES DE SERVIÇO (Antes: sites)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.frentes_servico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  localizacao TEXT,
  status TEXT DEFAULT 'Ativo',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. ATIVOS / MÁQUINAS (Antes: machines)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ativos (
  id VARCHAR PRIMARY KEY, -- Ex: PAT-01
  tipo TEXT,
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  unidade_medida TEXT,
  horimetro NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Disponível',
  localizacao TEXT,
  ultima_preventiva NUMERIC DEFAULT 0,
  operador_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  tipo_especie TEXT,
  carroceria TEXT,
  chassi TEXT,
  placa TEXT,
  renavam TEXT,
  valor_implemento NUMERIC DEFAULT 0,
  imagem_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. REGISTROS DIÁRIOS (Antes: daily_logs)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.registros_diarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ativo_id VARCHAR REFERENCES public.ativos(id) ON DELETE CASCADE,
  operador_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  frente_servico_id UUID REFERENCES public.frentes_servico(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  horimetro_inicial NUMERIC,
  horimetro_final NUMERIC,
  status TEXT,
  combustivel_adicionado NUMERIC DEFAULT 0,
  fonte_combustivel TEXT,
  observacoes TEXT,
  aberto_em TIMESTAMP WITH TIME ZONE,
  fechado_em TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 6. ABASTECIMENTOS COMBOIO (Antes: fuel_truck_refills)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.abastecimentos_comboio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data TIMESTAMP WITH TIME ZONE NOT NULL,
  ativo_id VARCHAR REFERENCES public.ativos(id) ON DELETE CASCADE,
  tipo_combustivel TEXT,
  quantidade NUMERIC,
  localizacao TEXT,
  custo_total NUMERIC,
  frentista_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 7. CHECKLISTS (Antes esquecido/só no código)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ativo_id VARCHAR REFERENCES public.ativos(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  data TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT, -- Ex: 'OK', 'Aprovado com Ressalva', 'Avariado'
  respostas JSONB, -- JSON contendo { pneu_dianteiro: true, motor: false }
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 8. MODELOS DE MANUTENÇÃO (Antes: maintenance_templates)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.modelos_manutencao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modelo TEXT NOT NULL,
  sub_modelo TEXT,
  intervalo NUMERIC NOT NULL,
  tarefas JSONB,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 9. PLANOS DE MANUTENÇÃO (Antes: maintenance_plans)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.planos_manutencao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ativo_id VARCHAR REFERENCES public.ativos(id) ON DELETE CASCADE,
  proximo_marco NUMERIC,
  ultima_troca NUMERIC,
  tolerancias JSONB,
  status TEXT DEFAULT 'Agendado',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 10. MANUTENÇÕES OCORRIDAS (Antes: maintenances)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.manutencoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data DATE NOT NULL,
  ativo_id VARCHAR REFERENCES public.ativos(id) ON DELETE CASCADE,
  tipo TEXT, -- Preventiva, Corretiva, Preditiva
  horimetro NUMERIC,
  descricao TEXT,
  pecas_usadas JSONB,
  mecanico_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  custo NUMERIC DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 11. RELATÓRIOS GERENCIAIS (Antes: management_reports)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.relatorios_gerenciais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_inicio DATE,
  data_fim DATE,
  gerado_por UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  tipo TEXT,
  url_relatorio TEXT,
  status TEXT DEFAULT 'Gerado',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- HABILITAR RLS (Row Level Security) E PERMISSÕES PÚBLICAS
-- ==========================================
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frentes_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abastecimentos_comboio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_gerenciais ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total (Como está no seu projeto agora 'Allow public access')
CREATE POLICY "Permitir acesso público a funcionarios" ON public.funcionarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso público a perfis" ON public.perfis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso público a frentes_servico" ON public.frentes_servico FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso público a ativos" ON public.ativos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso público a registros_diarios" ON public.registros_diarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso público a abastecimentos_comboio" ON public.abastecimentos_comboio FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso público a checklists" ON public.checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso público a modelos_manutencao" ON public.modelos_manutencao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso público a planos_manutencao" ON public.planos_manutencao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso público a manutencoes" ON public.manutencoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso público a relatorios_gerenciais" ON public.relatorios_gerenciais FOR ALL USING (true) WITH CHECK (true);
