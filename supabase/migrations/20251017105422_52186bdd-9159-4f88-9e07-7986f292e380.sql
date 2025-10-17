-- Adicionar campos para pinagem e silenciamento nas conversas
ALTER TABLE public.conversation_participants
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS muted BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance nas queries de conversas fixadas
CREATE INDEX IF NOT EXISTS idx_conversation_participants_pinned 
ON public.conversation_participants(user_id, pinned) 
WHERE pinned = true;