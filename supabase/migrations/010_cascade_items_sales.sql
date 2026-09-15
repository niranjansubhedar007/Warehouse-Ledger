-- Update sale_items table to cascade delete when an item is removed
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_item_id_fkey;
ALTER TABLE sale_items ADD CONSTRAINT sale_items_item_id_fkey
  FOREIGN KEY (item_id)
  REFERENCES items(id)
  ON DELETE CASCADE;
