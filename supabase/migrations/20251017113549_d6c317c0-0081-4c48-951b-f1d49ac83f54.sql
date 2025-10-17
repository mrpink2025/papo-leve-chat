-- Corrigir a política RLS para mensagens em grupos
-- A política anterior estava bloqueando mensagens de outros membros

-- Remover política anterior
DROP POLICY IF EXISTS "Users can view messages based on joined_at" ON public.messages;

-- Nova política mais explícita e correta
CREATE POLICY "Users can view messages based on joined_at"
ON public.messages
FOR SELECT
USING (
  -- 1. Suas próprias mensagens sempre visíveis
  sender_id = auth.uid()
  OR
  -- 2. Mensagens em conversas diretas (sem restrição de histórico)
  EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE c.id = messages.conversation_id
    AND c.type = 'direct'
    AND cp.user_id = auth.uid()
  )
  OR
  -- 3. Mensagens em grupos (com restrição de joined_at)
  EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE c.id = messages.conversation_id
    AND c.type = 'group'
    AND cp.user_id = auth.uid()
    AND cp.left_at IS NULL
    AND messages.created_at >= COALESCE(cp.joined_at_history, cp.joined_at)
  )
);