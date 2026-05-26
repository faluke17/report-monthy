-- fiscal_year มี UNIQUE อยู่แล้ว ไม่จำเป็นต้องมี UNIQUE บน name ด้วย
ALTER TABLE budget_years DROP CONSTRAINT IF EXISTS budget_years_name_key;
