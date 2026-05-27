
-- 1) Lock down claim_admin_if_none: revoke EXECUTE from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_none() FROM anon, authenticated, PUBLIC;

-- 2) Restrict orders UPDATE policy to 'submitted' status and prevent self-escalation of financial fields
DROP POLICY IF EXISTS "update own awaiting" ON public.orders;
CREATE POLICY "update own submitted" ON public.orders
FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'submitted')
WITH CHECK (
  auth.uid() = user_id
  AND status = 'submitted'
  AND payment_status = (SELECT payment_status FROM public.orders o WHERE o.id = orders.id)
  AND total = (SELECT total FROM public.orders o WHERE o.id = orders.id)
  AND delivery_fee = (SELECT delivery_fee FROM public.orders o WHERE o.id = orders.id)
  AND service_charge = (SELECT service_charge FROM public.orders o WHERE o.id = orders.id)
  AND subtotal = (SELECT subtotal FROM public.orders o WHERE o.id = orders.id)
  AND rider_id IS NOT DISTINCT FROM (SELECT rider_id FROM public.orders o WHERE o.id = orders.id)
);

-- 3) Remove broad SELECT policies on public storage buckets (files are still
--    accessible via the public CDN; we just stop allowing arbitrary listing).
DROP POLICY IF EXISTS "public read public buckets" ON storage.objects;
DROP POLICY IF EXISTS "food images public read" ON storage.objects;

-- 4) order-images: enforce path-based ownership for INSERT and add UPDATE/DELETE
DROP POLICY IF EXISTS "auth upload public buckets" ON storage.objects;

-- avatars: user owns folder by uid
CREATE POLICY "users upload own avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
CREATE POLICY "users update own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- order-images: user owns folder by uid
CREATE POLICY "users upload own order images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
CREATE POLICY "users update own order images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'order-images' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own order images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'order-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5) DELETE/UPDATE policies for payment-proofs & prescriptions, scoped to owner
CREATE POLICY "own payment proofs delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'payment-proofs' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "own payment proofs update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'payment-proofs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "own prescriptions delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'prescriptions' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "own prescriptions update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'prescriptions' AND (auth.uid())::text = (storage.foldername(name))[1]);
