-- Tabela de bonificações do Programa de Excelência CODELMAQ
-- Espelha a tabela de penalidades, porém creditando pontos positivos ao operador.
-- Sincronizada a partir da tabela local `bonuses` (Dexie) via syncEngine.
CREATE TABLE IF NOT EXISTS bonificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  operador_nome TEXT,
  codigo_bonificacao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  pontos INTEGER NOT NULL DEFAULT 0,
  foto_evidencia TEXT,
  observacoes TEXT,
  aplicado_por UUID REFERENCES funcionarios(id) ON DELETE SET NULL,
  aplicado_por_nome TEXT,
  data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bonificacoes_operador ON bonificacoes(operador_id);
CREATE INDEX IF NOT EXISTS idx_bonificacoes_data ON bonificacoes(data_evento DESC);

ALTER TABLE bonificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access" ON bonificacoes;
CREATE POLICY "Allow public access" ON bonificacoes FOR ALL TO public USING (true) WITH CHECK (true);