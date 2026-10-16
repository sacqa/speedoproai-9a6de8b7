CREATE OR REPLACE FUNCTION public.my_guest_orders(_phone text)
RETURNS TABLE(
  id uuid,
  order_number text,
  status text,
  service_type text,
  customer_name text,
  area text,
  street text,
  details text,
  notes text,
  items jsonb,
  subtotal numeric,
  delivery_fee numeric,
  total numeric,
  vendor_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, order_number, status, service_type, customer_name, area, street, details, notes,
         items, subtotal, delivery_fee, total, vendor_name, created_at, updated_at
  FROM public.guest_orders
  WHERE regexp_replace(phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
  ORDER BY created_at DESC
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.my_guest_orders(text) FROM public;
GRANT EXECUTE ON FUNCTION public.my_guest_orders(text) TO anon, authenticated;