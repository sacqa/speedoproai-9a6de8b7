
CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Public can read order images"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-images');
