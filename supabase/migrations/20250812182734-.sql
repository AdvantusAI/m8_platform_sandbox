-- Add optional fields for customizable title and icon on menu items
ALTER TABLE IF EXISTS public.menu_items
  ADD COLUMN IF NOT EXISTS custom_title text,
  ADD COLUMN IF NOT EXISTS icon_name text;