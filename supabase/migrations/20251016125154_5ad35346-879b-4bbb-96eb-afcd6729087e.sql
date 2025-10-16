-- Fix 1: Restrict profiles table to contacts only
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policy: users can only view their own profile and profiles of their contacts
CREATE POLICY "Users can view own and contacts profiles" ON public.profiles
FOR SELECT USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.contacts
    WHERE (user_id = auth.uid() AND contact_id = profiles.id)
       OR (contact_id = auth.uid() AND user_id = profiles.id)
  )
);

-- Fix 2: Restrict stories to contacts only
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all stories" ON public.stories;

-- Create new policy: users can only view their own stories and stories from contacts
CREATE POLICY "Users can view own and contacts stories" ON public.stories
FOR SELECT USING (
  expires_at >= now() AND (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE (user_id = stories.user_id AND contact_id = auth.uid())
         OR (contact_id = stories.user_id AND user_id = auth.uid())
    )
  )
);

-- Fix 3: Add storage RLS policies for conversation files
-- Only conversation participants can upload files
CREATE POLICY "Users can upload to their conversations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('chat-media', 'documents', 'videos', 'voice-notes')
  AND auth.uid() IN (
    SELECT user_id FROM public.conversation_participants 
    WHERE conversation_id::text = (storage.foldername(name))[1]
  )
);

-- Only current conversation participants can access files
CREATE POLICY "Users can access conversation files"
ON storage.objects FOR SELECT
USING (
  bucket_id IN ('chat-media', 'documents', 'videos', 'voice-notes')
  AND auth.uid() IN (
    SELECT user_id FROM public.conversation_participants 
    WHERE conversation_id::text = (storage.foldername(name))[1]
  )
);

-- Only file uploader can delete their files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id IN ('chat-media', 'documents', 'videos', 'voice-notes')
  AND owner = auth.uid()
);

-- Public buckets remain accessible (avatars, stories)
CREATE POLICY "Public avatars are readable" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars'
  AND owner = auth.uid()
);

CREATE POLICY "Public stories are readable" ON storage.objects
FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Users can upload own story" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'stories'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own story" ON storage.objects
FOR DELETE USING (
  bucket_id = 'stories'
  AND owner = auth.uid()
);