-- Scope admin policies to authenticated so anon never evaluates has_role()
DROP POLICY IF EXISTS "admin read guest orders" ON public.guest_orders;
DROP POLICY IF EXISTS "admin manage guest orders" ON public.guest_orders;
DROP POLICY IF EXISTS "admin delete guest orders" ON public.guest_orders;

CREATE POLICY "admin read guest orders" ON public.guest_orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage guest orders" ON public.guest_orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete guest orders" ON public.guest_orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Secure RPC so guests can place an order and get back the id/order_number
CREATE OR REPLACE FUNCTION public.place_guest_order(
  _customer_name text,
  _phone text,
  _area text,
  _street text,
  _items jsonb,
  _subtotal numeric,
  _delivery_fee numeric,
  _total numeric,
  _details text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS TABLE (id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(coalesce(_customer_name,'')) < 1 OR length(_customer_name) > 120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
  IF length(coalesce(_phone,'')) < 5 OR length(_phone) > 30 THEN RAISE EXCEPTION 'Invalid phone'; END IF;
  IF length(coalesce(_area,'')) < 1 OR length(_area) > 120 THEN RAISE EXCEPTION 'Invalid area'; END IF;
  IF length(coalesce(_street,'')) < 1 OR length(_street) > 200 THEN RAISE EXCEPTION 'Invalid address'; END IF;
  IF _details IS NOT NULL AND length(_details) > 500 THEN RAISE EXCEPTION 'Details too long'; END IF;
  IF _notes IS NOT NULL AND length(_notes) > 1000 THEN RAISE EXCEPTION 'Notes too long'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) < 1 OR jsonb_array_length(_items) > 200 THEN RAISE EXCEPTION 'Invalid items'; END IF;
  IF _subtotal < 0 OR _subtotal > 10000000 OR _delivery_fee < 0 OR _delivery_fee > 100000 OR _total < 0 OR _total > 10000000 THEN RAISE EXCEPTION 'Invalid amounts'; END IF;

  RETURN QUERY
  INSERT INTO public.guest_orders (customer_name, phone, area, street, details, notes, items, subtotal, delivery_fee, total, status, payment_method)
  VALUES (_customer_name, _phone, _area, _street, _details, _notes, _items, _subtotal, _delivery_fee, _total, 'submitted', 'cod')
  RETURNING guest_orders.id, guest_orders.order_number;
END;
$$;

REVOKE ALL ON FUNCTION public.place_guest_order(text,text,text,text,jsonb,numeric,numeric,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_guest_order(text,text,text,text,jsonb,numeric,numeric,numeric,text,text) TO anon, authenticated;