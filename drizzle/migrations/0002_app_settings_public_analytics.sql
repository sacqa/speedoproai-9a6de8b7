DROP POLICY IF EXISTS "settings public read" ON public.app_settings;
CREATE POLICY "settings public read" ON public.app_settings FOR SELECT
  USING (key IN ('receipt','footer','brand','product_card','grid_columns','analytics'));