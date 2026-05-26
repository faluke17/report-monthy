-- Budget Groups: ชื่องบประมาณ (layer กลางระหว่าง budget_years และ budget_projects)
CREATE TABLE IF NOT EXISTS budget_groups (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_year_id UUID        NOT NULL REFERENCES budget_years(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,    -- ชื่องบประมาณ เช่น "งบลงทุน", "งบอุดหนุน"
  created_by     TEXT        NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_groups_year ON budget_groups(budget_year_id);

CREATE OR REPLACE FUNCTION trg_fn_budget_groups_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_budget_groups_updated_at
  BEFORE UPDATE ON budget_groups
  FOR EACH ROW EXECUTE FUNCTION trg_fn_budget_groups_updated_at();

-- Budget Projects: โครงการต่างๆ ภายใต้ชื่องบประมาณ
CREATE TABLE IF NOT EXISTS budget_projects (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                      VARCHAR(60) UNIQUE,
  budget_year_id            UUID        NOT NULL REFERENCES budget_years(id) ON DELETE CASCADE,
  budget_group_id           UUID        NOT NULL REFERENCES budget_groups(id) ON DELETE CASCADE,
  branch_id                 UUID        NOT NULL REFERENCES branches(id),
  project_name              TEXT        NOT NULL,

  -- งบประมาณ
  budget_excl_vat           NUMERIC(15,2),
  contract_incl_vat         NUMERIC(15,2),

  -- Phase 1: ราคากลาง
  phase1_completed_at       DATE,
  phase1_notes              TEXT,

  -- Phase 2: TOR
  phase2_completed_at       DATE,
  phase2_notes              TEXT,

  -- Phase 3: พิจารณาผล
  phase3_completed_at       DATE,
  phase3_notes              TEXT,

  -- End Phase: งานแล้วเสร็จ
  completion_submission_date DATE,
  completion_inspection_date DATE,
  completion_notes           TEXT,

  current_phase             INT         NOT NULL DEFAULT 0 CHECK (current_phase BETWEEN 0 AND 6),

  created_by                TEXT        NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 4: รายละเอียดสัญญา
CREATE TABLE IF NOT EXISTS project_contracts (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id            UUID        NOT NULL UNIQUE REFERENCES budget_projects(id) ON DELETE CASCADE,
  estimated_pipe_length NUMERIC(10,2),
  contractor_name       TEXT,
  contract_number       TEXT,
  contract_date         DATE,
  construction_days     INT,
  contract_start_date   DATE,
  contract_end_date     DATE,
  created_by            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 5: อัปเดตความก้าวหน้าก่อสร้าง
CREATE TABLE IF NOT EXISTS project_progress_updates (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id            UUID        NOT NULL REFERENCES budget_projects(id) ON DELETE CASCADE,
  reported_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  pipe_length_completed NUMERIC(10,2) NOT NULL,
  notes                 TEXT,
  created_by            TEXT        NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_projects_year   ON budget_projects(budget_year_id);
CREATE INDEX IF NOT EXISTS idx_budget_projects_group  ON budget_projects(budget_group_id);
CREATE INDEX IF NOT EXISTS idx_budget_projects_branch ON budget_projects(branch_id);
CREATE INDEX IF NOT EXISTS idx_progress_updates_proj  ON project_progress_updates(project_id);

-- Triggers
CREATE OR REPLACE FUNCTION trg_fn_budget_projects_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_budget_projects_updated_at
  BEFORE UPDATE ON budget_projects
  FOR EACH ROW EXECUTE FUNCTION trg_fn_budget_projects_updated_at();

CREATE OR REPLACE FUNCTION trg_fn_project_contracts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_project_contracts_updated_at
  BEFORE UPDATE ON project_contracts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_project_contracts_updated_at();
