-- =====================================================
-- PHASE 1: Adicionar campos para controle de visibilidade de histórico
-- =====================================================

-- Adicionar campos joined_at e left_at em conversation_participants se não existirem
DO $$ 
BEGIN
  -- Adicionar joined_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_participants' 
    AND column_name = 'joined_at_history'
  ) THEN
    ALTER TABLE public.conversation_participants 
    ADD COLUMN joined_at_history TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Atualizar registros existentes com a data de criação
    UPDATE public.conversation_participants 
    SET joined_at_history = joined_at 
    WHERE joined_at_history IS NULL;
  END IF;

  -- Adicionar left_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_participants' 
    AND column_name = 'left_at'
  ) THEN
    ALTER TABLE public.conversation_participants 
    ADD COLUMN left_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;
END $$;

-- =====================================================
-- PHASE 2: Função para verificar visibilidade de mensagem
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_see_group_message(
  _message_id UUID,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_created_at TIMESTAMP WITH TIME ZONE;
  v_conversation_id UUID;
  v_conversation_type TEXT;
  v_user_joined_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar informações da mensagem
  SELECT created_at, conversation_id 
  INTO v_message_created_at, v_conversation_id
  FROM messages
  WHERE id = _message_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Verificar tipo da conversa
  SELECT type INTO v_conversation_type
  FROM conversations
  WHERE id = v_conversation_id;

  -- Se for conversa direta, permitir (não tem restrição de histórico)
  IF v_conversation_type = 'direct' THEN
    RETURN EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = v_conversation_id
      AND user_id = _user_id
    );
  END IF;

  -- Para grupos, verificar joined_at
  SELECT COALESCE(joined_at_history, joined_at)
  INTO v_user_joined_at
  FROM conversation_participants
  WHERE conversation_id = v_conversation_id
  AND user_id = _user_id
  AND (left_at IS NULL OR left_at > v_message_created_at);

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Mensagem só é visível se foi criada depois do joined_at
  RETURN v_message_created_at >= v_user_joined_at;
END;
$$;

-- =====================================================
-- PHASE 3: Atualizar políticas RLS de mensagens
-- =====================================================

-- Remover política antiga de visualização
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

-- Nova política que considera joined_at para grupos
CREATE POLICY "Users can view messages based on joined_at"
ON public.messages
FOR SELECT
USING (
  -- Mensagem do próprio usuário sempre visível
  sender_id = auth.uid()
  OR
  -- Ou verificar com a função de visibilidade
  public.can_see_group_message(id, auth.uid())
);

-- =====================================================
-- PHASE 4: Função para buscar joined_at de um usuário em um grupo
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_joined_at(
  _conversation_id UUID,
  _user_id UUID
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(joined_at_history, joined_at)
  FROM conversation_participants
  WHERE conversation_id = _conversation_id
  AND user_id = _user_id
  AND left_at IS NULL
  LIMIT 1;
$$;

-- =====================================================
-- PHASE 5: Criar índices para performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversation_participants_joined_at 
ON public.conversation_participants(conversation_id, user_id, joined_at_history);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

-- =====================================================
-- PHASE 6: Comentários e documentação
-- =====================================================

COMMENT ON COLUMN public.conversation_participants.joined_at_history IS 
'Data/hora da última entrada do usuário no grupo. Determina a partir de quando ele pode ver mensagens.';

COMMENT ON COLUMN public.conversation_participants.left_at IS 
'Data/hora em que o usuário saiu do grupo. NULL se ainda é membro.';

COMMENT ON FUNCTION public.can_see_group_message IS 
'Verifica se um usuário pode ver uma mensagem específica baseado no joined_at. Para grupos, mensagens só são visíveis se created_at >= joined_at.';

COMMENT ON FUNCTION public.get_user_joined_at IS 
'Retorna a data de entrada do usuário em um grupo (joined_at_history ou joined_at).';