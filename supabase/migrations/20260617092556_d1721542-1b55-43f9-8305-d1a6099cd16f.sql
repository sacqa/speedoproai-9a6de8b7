
-- 1) food_vendors.commission_percent: column-level grants
REVOKE SELECT ON public.food_vendors FROM authenticated;
GRANT SELECT (
  id, name, slug, cuisine, description, logo_url, cover_url, address, phone,
  delivery_time_min, min_order, rating, is_open, is_active, sort_order,
  created_at, updated_at, opens_at, closes_at, is_featured
) ON public.food_vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_vendors TO service_role;

-- 2) user_locations: friends-only sharing
DROP POLICY IF EXISTS "approved users read shared locations" ON public.user_locations;
CREATE POLICY "friends read shared locations"
ON public.user_locations
FOR SELECT
TO authenticated
USING (
  share_enabled = true
  AND auth.uid() <> user_id
  AND public.are_friends(auth.uid(), user_id)
);

-- 3) realtime.messages: scope by topic
DROP POLICY IF EXISTS "authenticated can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can write realtime" ON realtime.messages;

CREATE POLICY "users read own topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'user:' || auth.uid()::text || '%')
  OR (realtime.topic() LIKE 'public:%')
);

CREATE POLICY "users write own topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
);

-- 4) get_vendor_commission: revoke anon execute
REVOKE EXECUTE ON FUNCTION public.get_vendor_commission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vendor_commission(uuid) TO authenticated;
