-- Add missing RLS policies for voice-notes bucket

-- Check if policies already exist before creating
DO $$
BEGIN
  -- Allow authenticated users to upload their own voice notes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload own voice notes'
  ) THEN
    CREATE POLICY "Users can upload own voice notes"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'voice-notes' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Allow authenticated users to read their own voice notes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can read own voice notes'
  ) THEN
    CREATE POLICY "Users can read own voice notes"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'voice-notes'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Allow conversation members to read voice notes shared in conversations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Conversation members can read voice notes'
  ) THEN
    CREATE POLICY "Conversation members can read voice notes"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'voice-notes'
      AND EXISTS (
        SELECT 1 FROM conversation_participants cp
        INNER JOIN messages m ON m.conversation_id = cp.conversation_id
        WHERE cp.user_id = auth.uid()
        AND m.metadata->>'url' LIKE '%' || name || '%'
      )
    );
  END IF;
END $$;