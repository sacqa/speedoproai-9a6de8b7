DROP POLICY IF EXISTS "vendors public read" ON public.food_vendors;
CREATE POLICY "vendors authenticated read"
ON public.food_vendors
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
REVOKE SELECT ON public.food_vendors FROM anon;
GRANT SELECT ON public.food_vendors TO authenticated;