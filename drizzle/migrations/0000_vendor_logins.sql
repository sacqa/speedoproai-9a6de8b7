CREATE TABLE public.vendor_users (
  user_id uuid PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.food_vendors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendor_users TO authenticated;
GRANT ALL ON public.vendor_users TO service_role;
ALTER TABLE public.vendor_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendor reads own link" ON public.vendor_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.my_vendor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT vendor_id FROM public.vendor_users WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.my_vendor_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_vendor_id() TO authenticated;

CREATE POLICY "vendor reads own guest orders" ON public.guest_orders FOR SELECT TO authenticated
  USING (vendor_id IS NOT NULL AND vendor_id = public.my_vendor_id());

CREATE POLICY "request uploads vendor read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'request-uploads' AND EXISTS (
    SELECT 1 FROM public.guest_orders g
    WHERE g.attachment_url = storage.objects.name AND g.vendor_id = public.my_vendor_id()));