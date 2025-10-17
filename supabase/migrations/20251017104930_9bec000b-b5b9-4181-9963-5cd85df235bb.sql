-- Criar tabela de reações aos stories
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id, emoji)
);

-- Habilitar RLS
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can add reactions to stories"
  ON public.story_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON public.story_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view reactions on accessible stories"
  ON public.story_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE stories.id = story_reactions.story_id
      AND (
        stories.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.contacts
          WHERE (
            (contacts.user_id = stories.user_id AND contacts.contact_id = auth.uid())
            OR (contacts.contact_id = stories.user_id AND contacts.user_id = auth.uid())
          )
        )
      )
    )
  );

-- Índices para performance
CREATE INDEX idx_story_reactions_story_id ON public.story_reactions(story_id);
CREATE INDEX idx_story_reactions_user_id ON public.story_reactions(user_id);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;