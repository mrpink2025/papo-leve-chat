-- Tabela de sessões de chamadas em grupo
-- Signed by Mr_Pink — Nosso Papo (nossopapo.net)
CREATE TABLE group_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  state TEXT NOT NULL DEFAULT 'DIALING' CHECK (state IN ('DIALING', 'ACTIVE', 'COOLDOWN', 'ENDED')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_group_call_sessions_conversation ON group_call_sessions(conversation_id);
CREATE INDEX idx_group_call_sessions_state ON group_call_sessions(state);
CREATE INDEX idx_group_call_sessions_active ON group_call_sessions(state) WHERE state IN ('DIALING', 'ACTIVE', 'COOLDOWN');

-- Tabela de participantes em chamadas em grupo
CREATE TABLE group_call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES group_call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'RINGING', 'JOINED', 'REJECTED', 'TIMEOUT', 'LEFT')),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  is_host BOOLEAN DEFAULT FALSE,
  stream_config JSONB DEFAULT '{"audio": true, "video": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_group_call_participants_session ON group_call_participants(session_id);
CREATE INDEX idx_group_call_participants_user ON group_call_participants(user_id, status);
CREATE INDEX idx_group_call_participants_status ON group_call_participants(session_id, status);

-- Trigger para atualizar estado da sala automaticamente
CREATE OR REPLACE FUNCTION update_group_call_state() 
RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
  pending_count INT;
BEGIN
  -- Contar participantes ativos (JOINED)
  SELECT COUNT(*) INTO active_count
  FROM group_call_participants
  WHERE session_id = NEW.session_id AND status = 'JOINED';
  
  -- Contar pendentes (INVITED ou RINGING)
  SELECT COUNT(*) INTO pending_count
  FROM group_call_participants
  WHERE session_id = NEW.session_id AND status IN ('INVITED', 'RINGING');
  
  -- Atualizar estado da sala
  IF active_count >= 2 THEN
    -- 2+ participantes → ACTIVE
    UPDATE group_call_sessions 
    SET state = 'ACTIVE', updated_at = NOW() 
    WHERE id = NEW.session_id AND state != 'ENDED';
    
  ELSIF active_count = 1 AND pending_count = 0 THEN
    -- 1 participante e ninguém tocando → COOLDOWN
    UPDATE group_call_sessions 
    SET state = 'COOLDOWN', updated_at = NOW() 
    WHERE id = NEW.session_id AND state != 'ENDED';
    
  ELSIF active_count = 0 THEN
    -- 0 participantes → ENDED
    UPDATE group_call_sessions 
    SET state = 'ENDED', ended_at = NOW(), updated_at = NOW()
    WHERE id = NEW.session_id AND state != 'ENDED';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_call_state_update_trigger
AFTER INSERT OR UPDATE OF status ON group_call_participants
FOR EACH ROW EXECUTE FUNCTION update_group_call_state();

-- RLS Policies para group_call_sessions
ALTER TABLE group_call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their group call sessions"
ON group_call_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_call_participants
    WHERE session_id = group_call_sessions.id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Hosts can create group call sessions"
ON group_call_sessions FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Hosts can update their sessions"
ON group_call_sessions FOR UPDATE
USING (created_by = auth.uid());

-- RLS Policies para group_call_participants
ALTER TABLE group_call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their sessions"
ON group_call_participants FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM group_call_participants gcp
    WHERE gcp.session_id = group_call_participants.session_id
    AND gcp.user_id = auth.uid()
  )
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

CREATE POLICY "Users can update their own participant status"
ON group_call_participants FOR UPDATE
USING (user_id = auth.uid());

-- Habilitar Realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE group_call_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE group_call_participants;