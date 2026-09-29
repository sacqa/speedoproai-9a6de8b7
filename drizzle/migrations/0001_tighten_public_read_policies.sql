DROP POLICY IF EXISTS "pricing authenticated read" ON public.pricing_rules;

DROP POLICY IF EXISTS "products public read" ON public.products;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "categories public read" ON public.categories;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "banners public read" ON public.banners;
CREATE POLICY "banners public read" ON public.banners FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "service_banners read all" ON public.service_banners;
CREATE POLICY "service_banners read all" ON public.service_banners FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Variants are viewable by everyone" ON public.product_variants;
CREATE POLICY "Variants are viewable by everyone" ON public.product_variants FOR SELECT
  USING (is_active = true AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active));

DROP POLICY IF EXISTS "Product images viewable by everyone" ON public.product_images;
CREATE POLICY "Product images viewable by everyone" ON public.product_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active));

DROP POLICY IF EXISTS "menu cats public read" ON public.food_menu_categories;
CREATE POLICY "menu cats public read" ON public.food_menu_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.food_vendors v WHERE v.id = vendor_id AND v.is_active));

DROP POLICY IF EXISTS "settings public read" ON public.app_settings;
CREATE POLICY "settings public read" ON public.app_settings FOR SELECT
  USING (key IN ('receipt','footer','brand','product_card','grid_columns'));