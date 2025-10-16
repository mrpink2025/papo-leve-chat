-- Signed by Mr_Pink — Nosso Papo (nossopapo.net)
-- Corrigir RLS para permitir membros do grupo ver banner de chamada ativa

-- 1. Atualizar política de visualização de sessões
DROP POLICY IF EXISTS "Users can view their group call sessions" ON group_call_sessions;

CREATE POLICY "Users can view their group call sessions"
ON group_call_sessions FOR SELECT
USING (
  is_participant_of_session(id, auth.uid()) 
  OR is_member_of_conversation(conversation_id, auth.uid())
);

-- 2. Atualizar política de visualização de participantes
DROP POLICY IF EXISTS "Users can view participants in their sessions" ON group_call_participants;

CREATE POLICY "Users can view participants in their sessions"
ON group_call_participants FOR SELECT
USING (
  user_id = auth.uid() 
  OR is_participant_of_session(session_id, auth.uid())
  OR is_member_of_conversation(
    (SELECT conversation_id FROM group_call_sessions WHERE id = group_call_participants.session_id),
    auth.uid()
  )
);