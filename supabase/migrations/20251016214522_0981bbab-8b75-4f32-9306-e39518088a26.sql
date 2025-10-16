-- Signed by Mr_Pink — Nosso Papo (nossopapo.net)
-- Corrigir recursão infinita nas políticas RLS de group_call_participants

-- 1. Remover políticas problemáticas
DROP POLICY IF EXISTS "Users can view participants in their sessions" ON group_call_participants;
DROP POLICY IF EXISTS "Hosts can invite participants" ON group_call_participants;
DROP POLICY IF EXISTS "Users can view their group call sessions" ON group_call_sessions;

-- 2. Criar função SECURITY DEFINER para verificar participação
CREATE OR REPLACE FUNCTION is_participant_of_session(
  _session_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_call_participants
    WHERE session_id = _session_id
      AND user_id = _user_id
  )
$$;

-- 3. Recriar políticas usando a função SECURITY DEFINER
CREATE POLICY "Users can view participants in their sessions"
ON group_call_participants FOR SELECT
USING (
  user_id = auth.uid() OR
  is_participant_of_session(session_id, auth.uid())
);

CREATE POLICY "Hosts can invite participants"
ON group_call_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_call_sessions
    WHERE id = group_call_participants.session_id
    AND created_by = auth.uid()
  ) OR user_id = auth.uid()
);

CREATE POLICY "Users can view their group call sessions"
ON group_call_sessions FOR SELECT
USING (
  is_participant_of_session(id, auth.uid())
);