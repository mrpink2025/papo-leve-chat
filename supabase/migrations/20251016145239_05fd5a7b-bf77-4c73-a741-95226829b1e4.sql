-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can view own and contacts profiles'
  ) THEN
    DROP POLICY "Users can view own and contacts profiles" ON public.profiles;
  END IF;
END $$;

-- Create improved policy allowing viewing profiles of users who share conversations, while keeping contacts and self
CREATE POLICY "Users can view profiles in shared conversations"
ON public.profiles
FOR SELECT
USING (
  profiles.id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.contacts
    WHERE (
      (contacts.user_id = auth.uid() AND contacts.contact_id = profiles.id)
      OR
      (contacts.contact_id = auth.uid() AND contacts.user_id = profiles.id)
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2
      ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = profiles.id
  )
);
