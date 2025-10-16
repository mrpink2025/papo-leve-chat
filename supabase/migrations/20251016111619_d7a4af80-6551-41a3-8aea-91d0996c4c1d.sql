-- Create stories bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for stories bucket
DROP POLICY IF EXISTS "Stories: anyone can view" ON storage.objects;
CREATE POLICY "Stories: anyone can view"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Stories: users can upload own" ON storage.objects;
CREATE POLICY "Stories: users can upload own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stories'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Stories: users can delete own" ON storage.objects;
CREATE POLICY "Stories: users can delete own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'stories'
  AND (storage.foldername(name))[1] = auth.uid()::text
);