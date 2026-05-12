-- Create public bucket for WhatsApp media (audio, images, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to read files (bucket is public)
CREATE POLICY "WhatsApp media public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Allow authenticated users to upload to this bucket
CREATE POLICY "WhatsApp media authenticated upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

-- Allow authenticated users to update their uploads
CREATE POLICY "WhatsApp media authenticated update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'whatsapp-media');

-- Allow authenticated users to delete files in the bucket
CREATE POLICY "WhatsApp media authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'whatsapp-media');