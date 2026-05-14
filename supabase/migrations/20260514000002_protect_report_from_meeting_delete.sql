-- Decouple meeting report tables from meetings FK.
-- meeting_id is kept as a plain UUID reference (no FK constraint)
-- so deleting a meeting never wipes the report data.

-- Drop CASCADE FKs on agenda (report) tables
ALTER TABLE meeting_agenda_headers
  DROP CONSTRAINT IF EXISTS meeting_agenda_headers_meeting_id_fkey;

ALTER TABLE meeting_agenda_subitems
  DROP CONSTRAINT IF EXISTS meeting_agenda_subitems_meeting_id_fkey;

-- meeting_pre_agenda stays linked (it's planning data, not the final report)
-- meeting_resolutions, meeting_acknowledgments keep their own constraints
