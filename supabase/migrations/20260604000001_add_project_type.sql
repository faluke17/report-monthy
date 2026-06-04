-- Add project_type to budget_projects for DMA/pipe distinction
ALTER TABLE budget_projects
  ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'pipe'
  CHECK (project_type IN ('pipe', 'dma'));

-- Allow NULL pipe_length_completed so DMA progress updates need no length
ALTER TABLE project_progress_updates
  ALTER COLUMN pipe_length_completed DROP NOT NULL;
