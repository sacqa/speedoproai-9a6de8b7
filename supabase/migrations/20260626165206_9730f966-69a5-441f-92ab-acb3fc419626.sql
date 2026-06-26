
-- ============ SLICE B: service_banners table ============
CREATE TABLE IF NOT EXISTS public.service_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  image_url text,
  link text NOT NULL DEFAULT '/',
  gradient_from text DEFAULT '#FFE5B4',
  gradient_to text DEFAULT '#FFF7E6',
  icon_name text DEFAULT 'ShoppingBasket',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_banners TO anon, authenticated;
GRANT ALL    ON public.service_banners TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.service_banners TO authenticated;

ALTER TABLE public.service_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_banners read all" ON public.service_banners;
CREATE POLICY "service_banners read all" ON public.service_banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "service_banners admin write" ON public.service_banners;
CREATE POLICY "service_banners admin write" ON public.service_banners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_service_banners() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_service_banners_touch ON public.service_banners;
CREATE TRIGGER trg_service_banners_touch BEFORE UPDATE ON public.service_banners
  FOR EACH ROW EXECUTE FUNCTION public.touch_service_banners();

INSERT INTO public.service_banners (service_key, title, subtitle, link, icon_name, gradient_from, gradient_to, sort_order) VALUES
  ('speedmart', 'SpeedMart',  'Groceries in minutes',     '/speedmart', 'ShoppingBasket',  '#E9D5FF', '#F5F3FF', 1),
  ('food',      'Food',       'Restaurants & cafés',      '/food',      'UtensilsCrossed', '#FED7AA', '#FFF7ED', 2),
  ('pharmacy',  'Pharmacy',   'Health & wellness',        '/pharmacy',  'Pill',            '#BBF7D0', '#F0FDF4', 3),
  ('speedsend', 'SpeedSend',  'Send a parcel fast',       '/speedsend', 'Package',         '#BAE6FD', '#F0F9FF', 4)
ON CONFLICT (service_key) DO NOTHING;

-- ============ SLICE E: security hardening ============
-- 1) Revoke commission_percent column read from authenticated (only admin/service_role)
REVOKE SELECT (commission_percent) ON public.food_vendors FROM authenticated;
REVOKE SELECT (commission_percent) ON public.food_vendors FROM anon;

-- 2) Lock claim_admin_if_none race + restrict execute
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_none() FROM PUBLIC, anon;
-- Atomic guard against race: only the very first admin claim succeeds
CREATE OR REPLACE FUNCTION public.claim_admin_if_none()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  -- Serialize concurrent calls
  PERFORM pg_advisory_xact_lock(hashtext('claim_admin_if_none'));
  SELECT count(*) INTO existing FROM public.user_roles WHERE role = 'admin';
  IF existing > 0 THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_none() TO authenticated;
