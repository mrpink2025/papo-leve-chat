-- Storage RLS policies for group avatars
-- Allow only conversation admins to upload/update

-- Clean up any previous policies with the same names
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload group avatars'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can upload group avatars" ON storage.objects';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update group avatars'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can update group avatars" ON storage.objects';
  END IF;
END $$;

-- INSERT policy: only admins of the conversation can upload avatars
CREATE POLICY "Admins can upload group avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
      AND cp.role = 'admin'
      AND cp.conversation_id::text = split_part(name, '.', 1)
  )
);

-- UPDATE policy: same restriction for upserts/overwrites
CREATE POLICY "Admins can update group avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
      AND cp.role = 'admin'
      AND cp.conversation_id::text = split_part(name, '.', 1)
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
      AND cp.role = 'admin'
      AND cp.conversation_id::text = split_part(name, '.', 1)
  )
);