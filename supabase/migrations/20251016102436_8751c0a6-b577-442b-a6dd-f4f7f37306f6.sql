-- Create storage buckets for avatars and chat media
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view media in their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload media to their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete media from their conversations" ON storage.objects;

-- Storage policies for avatars (public)
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for chat media (private)
CREATE POLICY "Users can view media in their conversations"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-media' AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
      AND (storage.foldername(name))[1] = cp.conversation_id::text
    )
  );

CREATE POLICY "Users can upload media to their conversations"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media' AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
      AND (storage.foldername(name))[1] = cp.conversation_id::text
    )
  );

CREATE POLICY "Users can delete media from their conversations"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-media' AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
      AND (storage.foldername(name))[1] = cp.conversation_id::text
    )
  );

-- Create typing_indicators table
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_typing BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view typing in their conversations" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update their own typing status" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update typing status" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can delete typing status" ON public.typing_indicators;

-- RLS Policies for typing_indicators
CREATE POLICY "Users can view typing in their conversations"
  ON public.typing_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = typing_indicators.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own typing status"
  ON public.typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update typing status"
  ON public.typing_indicators FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete typing status"
  ON public.typing_indicators FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for typing indicators
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

-- Create function to auto-delete old typing indicators
CREATE OR REPLACE FUNCTION public.cleanup_typing_indicators()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$;