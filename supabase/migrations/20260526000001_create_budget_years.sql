-- Budget Years: ปีงบประมาณ (top-level container for budget projects)
CREATE TABLE IF NOT EXISTS budget_years (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) NOT NULL UNIQUE,   -- e.g. "ปีงบประมาณ 2568"
  fiscal_year INT         NOT NULL UNIQUE,   -- พ.ศ. e.g. 2568
  is_active   BOOLEAN     DEFAULT true,
  created_by  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trg_fn_budget_years_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_budget_years_updated_at
  BEFORE UPDATE ON budget_years
  FOR EACH ROW EXECUTE FUNCTION trg_fn_budget_years_updated_at();
