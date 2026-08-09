
-- 1) Remove dead/private tables from the realtime publication
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.friendships; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.notification_replies; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 2) Lock down realtime broadcast/presence channels (best-effort; ignored if not permitted)
DO $$
BEGIN
  EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS "admins only realtime channels" ON realtime.messages';
  EXECUTE 'CREATE POLICY "admins only realtime channels" ON realtime.messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role) OR public.has_role(auth.uid(), ''super_admin''::public.app_role))';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3) Storage: stop bucket-wide listing of avatars (public URLs are unaffected)
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;

-- 4) user_locations: only admins may read other users' shared locations
DROP POLICY IF EXISTS "approved users read shared locations" ON public.user_locations;
CREATE POLICY "admins read shared locations"
  ON public.user_locations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 5) Revoke EXECUTE on internal SECURITY DEFINER helpers not called from the client
REVOKE ALL ON FUNCTION public.admin_check_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_vendor_commission(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_admin_if_none() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.try_auto_approve_self() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_order_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_privileged_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;

-- 6) Defense in depth: commission column stays admin/service_role only
REVOKE SELECT (commission_percent) ON public.food_vendors FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.food_vendors TO service_role;
