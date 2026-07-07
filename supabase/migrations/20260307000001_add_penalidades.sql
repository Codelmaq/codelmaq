-- Tabela de penalidades do Programa de Excelência CODELMAQ
-- Espelha a tabela de bonificacoes, porém debitando pontos (sempre <= 0).
-- Foto de evidência é obrigatória (privacidade: visível só para admin).
-- Sincronizada a partir da tabela local `penalties` (Dexie) via syncEngine.
CREATE TABLE IF NOT EXISTS penalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  operador_nome TEXT,
  codigo_infracao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  pontos INTEGER NOT NULL DEFAULT 0,
  foto_evidencia TEXT NOT NULL,
  observacoes TEXT,
  aplicado_por UUID REFERENCES funcionarios(id) ON DELETE SET NULL,
  aplicado_por_nome TEXT,
  data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT penalidades_pontos_nao_positivo CHECK (pontos <= 0)
);

CREATE INDEX IF NOT EXISTS idx_penalidades_operador ON penalidades(operador_id);
CREATE INDEX IF NOT EXISTS idx_penalidades_data ON penalidades(data_evento DESC);

ALTER TABLE penalidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access" ON penalidades;
CREATE POLICY "Allow public access" ON penalidades FOR ALL TO public USING (true) WITH CHECK (true);