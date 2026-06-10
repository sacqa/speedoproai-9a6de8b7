
-- 1) Announcements: restrict SELECT to authenticated
DROP POLICY IF EXISTS "anyone reads active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.announcements;
DROP POLICY IF EXISTS "active announcements readable" ON public.announcements;
DROP POLICY IF EXISTS "read active announcements" ON public.announcements;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='announcements' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON public.announcements', r.policyname);
  END LOOP;
END$$;
CREATE POLICY "authenticated read active announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (is_active = true);
REVOKE SELECT ON public.announcements FROM anon;

-- 2) notification_replies: restrict INSERT to authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='notification_replies' AND cmd='INSERT' LOOP
    EXECUTE format('DROP POLICY %I ON public.notification_replies', r.policyname);
  END LOOP;
END$$;
CREATE POLICY "users insert own replies"
  ON public.notification_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) food_vendors: hide commission_percent from non-admin users via column-level revoke
REVOKE SELECT (commission_percent) ON public.food_vendors FROM authenticated, anon;
-- Admins query via service role / edge functions, which bypass column grants.
-- Provide a SECURITY DEFINER helper so admin UIs can fetch commissions explicitly.
CREATE OR REPLACE FUNCTION public.get_vendor_commission(_vendor_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT commission_percent
  FROM public.food_vendors
  WHERE id = _vendor_id
    AND public.has_role(auth.uid(), 'admin');
$$;
REVOKE ALL ON FUNCTION public.get_vendor_commission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vendor_commission(uuid) TO authenticated;
