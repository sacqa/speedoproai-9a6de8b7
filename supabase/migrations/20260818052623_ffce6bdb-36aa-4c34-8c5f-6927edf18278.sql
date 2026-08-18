CREATE TABLE public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  area text not null,
  slug text not null,
  delivery_fee numeric not null default 99,
  min_order numeric not null default 0,
  free_delivery_threshold numeric,
  eta_min_minutes integer not null default 30,
  eta_max_minutes integer not null default 60,
  opens_at time,
  closes_at time,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE UNIQUE INDEX delivery_zones_slug_key ON public.delivery_zones (slug);

GRANT SELECT ON public.delivery_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delivery zones are publicly readable"
  ON public.delivery_zones FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage delivery zones"
  ON public.delivery_zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_delivery_zones_updated BEFORE UPDATE ON public.delivery_zones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.delivery_zones (area, slug, delivery_fee, min_order, free_delivery_threshold, eta_min_minutes, eta_max_minutes, opens_at, closes_at, sort_order)
VALUES
 ('Dipalpur','dipalpur',99,300,1500,30,60,'09:00','23:00',1),
 ('Hujra Shah Muqeem','hujra-shah-muqeem',149,500,2500,45,90,'10:00','22:00',2),
 ('Basirpur','basirpur',149,500,2500,45,90,'10:00','22:00',3);