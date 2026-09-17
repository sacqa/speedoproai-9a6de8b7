CREATE INDEX IF NOT EXISTS idx_products_active_category_created
  ON public.products (is_active, category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active_created
  ON public.products (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_banners_active
  ON public.banners (is_active);