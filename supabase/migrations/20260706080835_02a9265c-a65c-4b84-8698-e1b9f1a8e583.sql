
CREATE TABLE public.guest_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL DEFAULT ('SPD-' || nextval('order_number_seq')::text),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  area TEXT NOT NULL,
  street TEXT NOT NULL,
  details TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  payment_method TEXT NOT NULL DEFAULT 'cod',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_orders TO authenticated;
GRANT SELECT, INSERT ON public.guest_orders TO anon;
GRANT ALL ON public.guest_orders TO service_role;

ALTER TABLE public.guest_orders ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can place a guest order
CREATE POLICY "guest orders public insert"
  ON public.guest_orders FOR INSERT
  WITH CHECK (true);

-- Only admins can view all guest orders
CREATE POLICY "admin read guest orders"
  ON public.guest_orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update guest orders (status, notes)
CREATE POLICY "admin manage guest orders"
  ON public.guest_orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete guest orders"
  ON public.guest_orders FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER guest_orders_updated_at
  BEFORE UPDATE ON public.guest_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Allow a just-placed guest to view THEIR order via order_number lookup on the confirm page.
-- Confirm page uses order_number returned client-side, so no anon SELECT policy is added.
-- Admin-only read stays the rule; the confirm page reads back the row it just inserted (RLS on INSERT returning is allowed by the INSERT policy).
