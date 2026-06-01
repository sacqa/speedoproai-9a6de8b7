
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_price numeric;
ALTER TABLE public.food_vendors
  ADD COLUMN IF NOT EXISTS opens_at time,
  ADD COLUMN IF NOT EXISTS closes_at time,
  ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_categories_popular ON public.categories(is_popular) WHERE is_popular = true;
CREATE INDEX IF NOT EXISTS idx_products_sale ON public.products(compare_price) WHERE compare_price IS NOT NULL;
