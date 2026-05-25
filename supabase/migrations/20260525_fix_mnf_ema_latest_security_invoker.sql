-- Fix: set security_invoker = true on mnf_ema_latest view
-- Supabase flags views without this as "Security Definer View"
-- which bypasses RLS on underlying tables.
-- mnf_ema_daily already has USING(true) policy so no functional change,
-- but this follows Supabase best practice.

CREATE OR REPLACE VIEW public.mnf_ema_latest
  WITH (security_invoker = true)
AS
SELECT DISTINCT ON (dmama_branch_id, logger_id)
  dmama_branch_id,
  logger_id,
  node_label,
  record_date,
  mnf_flow,
  ema_value,
  diff_percent,
  consecutive_count,
  alert_status,
  computed_at
FROM mnf_ema_daily
ORDER BY dmama_branch_id, logger_id, record_date DESC;
