
-- 1) Extend order_type enum with 'food'
ALTER TYPE public.order_type ADD VALUE IF NOT EXISTS 'food';

-- 2) Food vendors table
CREATE TABLE IF NOT EXISTS public.food_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  cuisine text,
  description text,
  logo_url text,
  cover_url text,
  address text,
  phone text,
  delivery_time_min integer NOT NULL DEFAULT 30,
  min_order numeric NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 4.5,
  is_open boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.food_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors public read"
ON public.food_vendors FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin manage vendors"
ON public.food_vendors FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3) Menu categories (per vendor)
CREATE TABLE IF NOT EXISTS public.food_menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.food_vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_menu_categories_vendor ON public.food_menu_categories(vendor_id);

ALTER TABLE public.food_menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu cats public read"
ON public.food_menu_categories FOR SELECT USING (true);

CREATE POLICY "admin manage menu cats"
ON public.food_menu_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4) Menu items
CREATE TABLE IF NOT EXISTS public.food_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.food_vendors(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.food_menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_menu_items_vendor ON public.food_menu_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_food_menu_items_cat ON public.food_menu_items(category_id);

ALTER TABLE public.food_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu items public read"
ON public.food_menu_items FOR SELECT
USING (is_available = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin manage menu items"
ON public.food_menu_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5) Add vendor_id to orders for food orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.food_vendors(id) ON DELETE SET NULL;

-- 6) Storage bucket for food images
INSERT INTO storage.buckets (id, name, public)
VALUES ('food', 'food', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "food images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'food');

CREATE POLICY "admin insert food images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'food' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin update food images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'food' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin delete food images"
ON storage.objects FOR DELETE
USING (bucket_id = 'food' AND has_role(auth.uid(), 'admin'::app_role));
