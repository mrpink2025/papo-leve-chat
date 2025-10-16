-- Adicionar política para admins removerem participantes
CREATE POLICY "Admins can remove participants"
ON conversation_participants
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'admin'
  )
);