ALTER TABLE public.guest_orders
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'speedmart',
  ADD COLUMN IF NOT EXISTS vendor_id uuid,
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS guest_orders_phone_idx ON public.guest_orders (phone);
CREATE INDEX IF NOT EXISTS guest_orders_order_number_idx ON public.guest_orders (order_number);

DROP FUNCTION IF EXISTS public.place_guest_order(text,text,text,text,jsonb,numeric,numeric,numeric,text,text);

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
  _notes text DEFAULT NULL,
  _service_type text DEFAULT 'speedmart',
  _vendor_id uuid DEFAULT NULL,
  _vendor_name text DEFAULT NULL,
  _attachment_url text DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id uuid;
  new_no text;
  it jsonb;
  pid uuid;
  qty int;
BEGIN
  IF length(coalesce(_customer_name,'')) < 1 OR length(_customer_name) > 120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
  IF length(coalesce(_phone,'')) < 5 OR length(_phone) > 30 THEN RAISE EXCEPTION 'Invalid phone'; END IF;
  IF length(coalesce(_area,'')) < 1 OR length(_area) > 120 THEN RAISE EXCEPTION 'Invalid area'; END IF;
  IF length(coalesce(_street,'')) < 1 OR length(_street) > 200 THEN RAISE EXCEPTION 'Invalid address'; END IF;
  IF _details IS NOT NULL AND length(_details) > 500 THEN RAISE EXCEPTION 'Details too long'; END IF;
  IF _notes IS NOT NULL AND length(_notes) > 1000 THEN RAISE EXCEPTION 'Notes too long'; END IF;
  IF _vendor_name IS NOT NULL AND length(_vendor_name) > 160 THEN RAISE EXCEPTION 'Invalid vendor'; END IF;
  IF _attachment_url IS NOT NULL AND length(_attachment_url) > 1000 THEN RAISE EXCEPTION 'Invalid attachment'; END IF;
  IF _service_type NOT IN ('speedmart','food','pharmacy','speedsend','custom') THEN RAISE EXCEPTION 'Invalid service'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) < 1 OR jsonb_array_length(_items) > 200 THEN RAISE EXCEPTION 'Invalid items'; END IF;
  IF jsonb_typeof(coalesce(_meta,'{}'::jsonb)) <> 'object' OR length(coalesce(_meta,'{}'::jsonb)::text) > 8000 THEN RAISE EXCEPTION 'Invalid details'; END IF;
  IF _subtotal < 0 OR _subtotal > 10000000 OR _delivery_fee < 0 OR _delivery_fee > 100000 OR _total < 0 OR _total > 10000000 THEN RAISE EXCEPTION 'Invalid amounts'; END IF;

  INSERT INTO public.guest_orders (
    customer_name, phone, area, street, details, notes, items,
    subtotal, delivery_fee, total, status, payment_method,
    service_type, vendor_id, vendor_name, attachment_url, meta
  )
  VALUES (
    _customer_name, _phone, _area, _street, _details, _notes, _items,
    _subtotal, _delivery_fee, _total, 'submitted', 'cod',
    _service_type, _vendor_id, _vendor_name, _attachment_url, coalesce(_meta,'{}'::jsonb)
  )
  RETURNING guest_orders.id, guest_orders.order_number INTO new_id, new_no;

  -- Decrement catalog stock for SpeedMart items that reference a real product.
  IF _service_type = 'speedmart' THEN
    FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
      BEGIN
        pid := NULLIF(it->>'product_id','')::uuid;
      EXCEPTION WHEN others THEN pid := NULL;
      END;
      qty := GREATEST(coalesce((it->>'quantity')::int, 0), 0);
      IF pid IS NOT NULL AND qty > 0 THEN
        UPDATE public.products
           SET stock = GREATEST(stock - qty, 0)
         WHERE products.id = pid;
      END IF;
    END LOOP;
  END IF;

  RETURN QUERY SELECT new_id, new_no;
END;
$$;

REVOKE ALL ON FUNCTION public.place_guest_order(text,text,text,text,jsonb,numeric,numeric,numeric,text,text,text,uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_guest_order(text,text,text,text,jsonb,numeric,numeric,numeric,text,text,text,uuid,text,text,jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.lookup_guest_order(_order_number text, _phone text)
RETURNS TABLE(
  id uuid, order_number text, status text, service_type text,
  customer_name text, area text, street text, details text, notes text,
  items jsonb, subtotal numeric, delivery_fee numeric, total numeric,
  vendor_name text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT g.id, g.order_number, g.status, g.service_type,
         g.customer_name, g.area, g.street, g.details, g.notes,
         g.items, g.subtotal, g.delivery_fee, g.total,
         g.vendor_name, g.created_at, g.updated_at
  FROM public.guest_orders g
  WHERE upper(trim(g.order_number)) = upper(trim(coalesce(_order_number,'')))
    AND regexp_replace(g.phone,'\D','','g') = regexp_replace(coalesce(_phone,''),'\D','','g')
    AND length(regexp_replace(coalesce(_phone,''),'\D','','g')) >= 7
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_guest_order(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_guest_order(text,text) TO anon, authenticated, service_role;