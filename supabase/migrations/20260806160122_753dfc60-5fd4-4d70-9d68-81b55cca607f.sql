DROP POLICY IF EXISTS "request uploads guest insert" ON storage.objects;
CREATE POLICY "request uploads guest insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'request-uploads');

DROP POLICY IF EXISTS "request uploads admin read" ON storage.objects;
CREATE POLICY "request uploads admin read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'request-uploads' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "request uploads admin update" ON storage.objects;
CREATE POLICY "request uploads admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'request-uploads' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'request-uploads' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "request uploads admin delete" ON storage.objects;
CREATE POLICY "request uploads admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'request-uploads' AND public.has_role(auth.uid(), 'admin'));