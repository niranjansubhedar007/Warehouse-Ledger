ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS is_checked BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
