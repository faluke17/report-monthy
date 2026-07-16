-- Add PDCA reference period to meeting_pre_agenda
-- Allows region admin to specify which month's PDCA data should be shown in preview
-- and automatically creates a requirement notification for branches

ALTER TABLE meeting_pre_agenda
  ADD COLUMN IF NOT EXISTS pdca_ref_month int,
  ADD COLUMN IF NOT EXISTS pdca_ref_year  int,
  ADD COLUMN IF NOT EXISTS pdca_deadline  date;

-- Extend meeting_requirements to support pdca_monthly type
ALTER TABLE meeting_requirements
  DROP CONSTRAINT IF EXISTS meeting_requirements_requirement_type_check;

ALTER TABLE meeting_requirements
  ADD CONSTRAINT meeting_requirements_requirement_type_check
  CHECK (requirement_type IN ('monthly_report', 'five_topics', 'km_case', 'custom', 'pdca_monthly'));
