-- ============================================
-- FASE 1-5: MIGRATIONS COMPLETAS
-- ============================================

-- 1. Criar tabela de reações
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- RLS para message_reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can add reactions to messages in their conversations"
ON public.message_reactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view reactions in their conversations"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id 
    AND cp.user_id = auth.uid()
  )
);

-- 2. Criar novos buckets de storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']),
  ('voice-notes', 'voice-notes', false, 5242880, ARRAY['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav']),
  ('videos', 'videos', false, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas RLS para documents bucket
CREATE POLICY "Users can upload documents to their conversations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view documents from their conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
    AND cp.conversation_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Políticas RLS para voice-notes bucket
CREATE POLICY "Users can upload voice notes to their conversations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-notes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view voice notes from their conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-notes'
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
    AND cp.conversation_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete own voice notes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-notes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Políticas RLS para videos bucket
CREATE POLICY "Users can upload videos to their conversations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view videos from their conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
    AND cp.conversation_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Habilitar realtime para message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;