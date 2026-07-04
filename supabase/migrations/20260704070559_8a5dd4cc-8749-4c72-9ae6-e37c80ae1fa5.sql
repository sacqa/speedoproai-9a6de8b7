
-- Restrict pricing_rules SELECT to authenticated users (removes public/anon read of auto_approve_users)
DROP POLICY IF EXISTS "pricing public read" ON public.pricing_rules;
CREATE POLICY "pricing authenticated read" ON public.pricing_rules
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.pricing_rules FROM anon;

-- Split notifications policy: users can only SELECT/DELETE their own; INSERT/UPDATE restricted to service_role
DROP POLICY IF EXISTS "own notifications" ON public.notifications;
CREATE POLICY "own notifications select" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notifications delete" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- No INSERT policy for end users; system/service_role and SECURITY DEFINER functions handle inserts.
