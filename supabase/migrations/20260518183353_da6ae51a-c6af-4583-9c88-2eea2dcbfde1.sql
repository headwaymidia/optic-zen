UPDATE storage.buckets SET public = true WHERE id = 'whatsapp-media';

DROP POLICY IF EXISTS "Public read whatsapp-media" ON storage.objects;
CREATE POLICY "Public read whatsapp-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'whatsapp-media');