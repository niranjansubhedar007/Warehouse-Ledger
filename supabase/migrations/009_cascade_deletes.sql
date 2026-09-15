-- Update sales table to cascade delete when a quotation is removed
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_quotation_id_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_quotation_id_fkey
  FOREIGN KEY (quotation_id)
  REFERENCES quotations(id)
  ON DELETE CASCADE;
