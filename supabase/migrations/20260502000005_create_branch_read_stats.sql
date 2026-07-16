CREATE TABLE IF NOT EXISTS branch_read_stats (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ba         integer     NOT NULL,
  year_be    integer     NOT NULL,
  month      integer     NOT NULL CHECK (month BETWEEN 1 AND 12),
  read_count integer     NOT NULL DEFAULT 0,
  cust_count integer     NOT NULL DEFAULT 0,
  target     integer     NOT NULL DEFAULT 0,
  synced_at  timestamptz DEFAULT now(),
  UNIQUE (ba, year_be, month)
);
