
DROP POLICY IF EXISTS "guest orders public insert" ON public.guest_orders;
CREATE POLICY "guest orders public insert"
  ON public.guest_orders FOR INSERT
  WITH CHECK (
    status = 'submitted'
    AND payment_method IN ('cod','online')
    AND length(customer_name) BETWEEN 1 AND 120
    AND length(phone) BETWEEN 5 AND 30
    AND length(area) BETWEEN 1 AND 120
    AND length(street) BETWEEN 1 AND 200
    AND (details IS NULL OR length(details) <= 500)
    AND (notes IS NULL OR length(notes) <= 1000)
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) BETWEEN 1 AND 200
    AND subtotal >= 0 AND subtotal <= 10000000
    AND delivery_fee >= 0 AND delivery_fee <= 100000
    AND total >= 0 AND total <= 10000000
  );

DROP POLICY IF EXISTS "Public can read order images" ON storage.objects;
CREATE POLICY "Owners and admins read order images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'order-images'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );
