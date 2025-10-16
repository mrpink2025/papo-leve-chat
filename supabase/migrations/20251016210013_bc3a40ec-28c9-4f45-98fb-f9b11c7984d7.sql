-- Política 1: Permitir que o criador visualize a conversa recém-criada
-- Remove a política antiga restritiva e cria uma nova que permite o criador ver imediatamente
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view own or participating conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR is_member_of_conversation(id, auth.uid())
);

-- Política 2: Permitir que administradores adicionem participantes
-- Mantém a política existente e adiciona uma nova para admins
CREATE POLICY "Admins can add participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'admin'
  )
);