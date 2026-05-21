-- meeting_requirements: สิ่งที่ประชุมต้องการให้สาขาส่ง/ดำเนินการ
CREATE TABLE IF NOT EXISTS meeting_requirements (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    uuid        NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  requirement_type text     NOT NULL CHECK (
    requirement_type IN ('monthly_report', 'five_topics', 'km_case', 'custom')
  ),
  title         text        NOT NULL,
  description   text,
  target_year   int,
  target_month  int,
  due_date      date,
  sort_order    int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- meeting_requirement_fulfillments: สำหรับ type='custom' ที่ต้องให้สาขากดยืนยัน
-- (monthly_report / five_topics / km_case ตรวจจากตารางต้นทางอัตโนมัติ)
CREATE TABLE IF NOT EXISTS meeting_requirement_fulfillments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id      uuid        NOT NULL REFERENCES meeting_requirements(id) ON DELETE CASCADE,
  branch_costcenter   text        NOT NULL,
  fulfilled_by        text        NOT NULL,
  fulfilled_name      text,
  fulfilled_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requirement_id, branch_costcenter)
);

CREATE INDEX IF NOT EXISTS idx_meeting_requirements_meeting_id
  ON meeting_requirements(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_req_fulfillments_req_id
  ON meeting_requirement_fulfillments(requirement_id);
