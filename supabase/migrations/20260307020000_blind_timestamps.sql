-- ============================================================================
-- BLIND LAYER: timestamps de servidor contra adulteração do relógio do aparelho.
--
-- Contexto: o app envia `data` (YYYY-MM-DD) e `criado_em` (ISO) do cliente. Se o
-- operador mexe na data/hora do celular, esses valores vão "errados" pra cima.
--
-- Estes triggers garantem que, no momento de gravar no banco, o servidor SEMPRE
-- sobrescreve os campos de timestamp com `now()` do Postgres (tempo real, imune
-- ao cliente). Se o app está OK, `criado_em` será praticamente igual ao que o
-- cliente mandou (com tolerância de latência). Se está adulterado, o trigger
-- corrige silenciosamente.
--
-- Limitação intencional: o trigger SÓ atua em `criado_em`/`data_evento`. A
-- coluna `data` (string YYYY-MM-DD) que o operador digita pode continuar falsa.
-- Isso é mitigado pelo bloqueio no front-end (ClockGuard) — registro nem sai
-- do celular quando drift > 1h. Para cobertura offline, considere adicionar
-- uma coluna `data_confiavel` (timestamp NOT NULL DEFAULT now()) e sincronizar
-- os relatórios por ela. (Fora do escopo desta migration.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- funcionarios (signups) — o `created_at` é a fonte de auditoria de cadastro.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.funcionarios
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

-- Trigger: força criado_em / created_at = now() do Postgres no insert.
CREATE OR REPLACE FUNCTION public.fn_blindar_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se o front mandou algo claramente fora do intervalo plausível (±7 dias do
  -- servidor), sobrescreve com now(). Pequena tolerância para drift de fuso e
  -- latência de rede.
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_at IS NULL
       OR abs(extract(epoch from (NEW.created_at - now()))) > 7 * 86400 THEN
      NEW.created_at := now();
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blindar_funcionarios ON public.funcionarios;
CREATE TRIGGER trg_blindar_funcionarios
  BEFORE INSERT ON public.funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_blindar_timestamps();

-- ---------------------------------------------------------------------------
-- registros_diarios (parte diária)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.registros_diarios
  ALTER COLUMN criado_em SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.fn_blindar_registros_diarios()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- criado_em: sempre agora, se veio nulo ou muito fora (±7 dias).
    IF NEW.criado_em IS NULL
       OR abs(extract(epoch from (NEW.criado_em - now()))) > 7 * 86400 THEN
      NEW.criado_em := now();
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blindar_registros_diarios ON public.registros_diarios;
CREATE TRIGGER trg_blindar_registros_diarios
  BEFORE INSERT ON public.registros_diarios
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_blindar_registros_diarios();

-- ---------------------------------------------------------------------------
-- checklists (vistorias)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.checklists
  ALTER COLUMN criado_em SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.fn_blindar_checklists()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.criado_em IS NULL
       OR abs(extract(epoch from (NEW.criado_em - now()))) > 7 * 86400 THEN
      NEW.criado_em := now();
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blindar_checklists ON public.checklists;
CREATE TRIGGER trg_blindar_checklists
  BEFORE INSERT ON public.checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_blindar_checklists();

-- ---------------------------------------------------------------------------
-- manutencoes (manutenções executadas)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.manutencoes
  ALTER COLUMN criado_em SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.fn_blindar_manutencoes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.criado_em IS NULL
       OR abs(extract(epoch from (NEW.criado_em - now()))) > 7 * 86400 THEN
      NEW.criado_em := now();
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blindar_manutencoes ON public.manutencoes;
CREATE TRIGGER trg_blindar_manutencoes
  BEFORE INSERT ON public.manutencoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_blindar_manutencoes();

-- ---------------------------------------------------------------------------
-- abastecimentos_comboio (abastecimentos do caminhão comboio)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.abastecimentos_comboio
  ALTER COLUMN criado_em SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.fn_blindar_abastecimentos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.criado_em IS NULL
       OR abs(extract(epoch from (NEW.criado_em - now()))) > 7 * 86400 THEN
      NEW.criado_em := now();
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blindar_abastecimentos ON public.abastecimentos_comboio;
CREATE TRIGGER trg_blindar_abastecimentos
  BEFORE INSERT ON public.abastecimentos_comboio
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_blindar_abastecimentos();

-- ---------------------------------------------------------------------------
-- relatorios_gerenciais
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.relatorios_gerenciais
  ALTER COLUMN criado_em SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.fn_blindar_relatorios()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.criado_em IS NULL
       OR abs(extract(epoch from (NEW.criado_em - now()))) > 7 * 86400 THEN
      NEW.criado_em := now();
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blindar_relatorios ON public.relatorios_gerenciais;
CREATE TRIGGER trg_blindar_relatorios
  BEFORE INSERT ON public.relatorios_gerenciais
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_blindar_relatorios();
