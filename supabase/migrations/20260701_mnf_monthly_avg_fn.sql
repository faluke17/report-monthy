-- Function: get_mnf_monthly_avg(year, month)
-- คืน avg MNF ต่อ logger สำหรับเดือนปัจจุบัน + เดือนก่อนหน้า
-- ใช้ใน AreaReportForm เพื่อ auto-fill mnf_before / mnf_after

CREATE OR REPLACE FUNCTION get_mnf_monthly_avg(p_year int, p_month int)
RETURNS TABLE (
  logger_id   int,
  report_year int,
  report_month int,
  avg_mnf     float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    logger_id,
    report_year,
    report_month,
    ROUND(AVG(mnf_flow)::numeric, 2)::float AS avg_mnf
  FROM mnf_daily
  WHERE mnf_flow IS NOT NULL
    AND (
      -- เดือนปัจจุบัน (after)
      (report_year = p_year AND report_month = p_month)
      OR
      -- เดือนก่อนหน้า (before)
      (report_year  = CASE WHEN p_month = 1 THEN p_year - 1 ELSE p_year  END
       AND report_month = CASE WHEN p_month = 1 THEN 12         ELSE p_month - 1 END)
    )
  GROUP BY logger_id, report_year, report_month
$$;
