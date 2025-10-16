-- ============================================
-- FASE 1: RPC Functions e Índices para Otimização
-- ============================================

-- 1. RPC Function para buscar conversas do usuário (elimina N+1)
CREATE OR REPLACE FUNCTION get_user_conversations(
  p_user_id UUID,
  p_include_archived BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  conversation_id UUID,
  conversation_type TEXT,
  conversation_name TEXT,
  conversation_avatar_url TEXT,
  conversation_updated_at TIMESTAMPTZ,
  archived BOOLEAN,
  last_message_content TEXT,
  last_message_created_at TIMESTAMPTZ,
  unread_count BIGINT,
  member_count BIGINT,
  other_user_id UUID,
  other_username TEXT,
  other_full_name TEXT,
  other_avatar_url TEXT,
  other_status TEXT,
  other_bio TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_conversations AS (
    SELECT cp.conversation_id, cp.last_read_at, cp.archived
    FROM conversation_participants cp
    WHERE cp.user_id = p_user_id
      AND (p_include_archived OR NOT cp.archived)
  ),
  conv_data AS (
    SELECT 
      c.id,
      c.type,
      c.name,
      c.avatar_url,
      c.updated_at,
      uc.archived
    FROM conversations c
    INNER JOIN user_conversations uc ON c.id = uc.conversation_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.created_at
    FROM messages m
    INNER JOIN user_conversations uc ON m.conversation_id = uc.conversation_id
    WHERE NOT m.deleted
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.conversation_id,
      COUNT(*) as count
    FROM messages m
    INNER JOIN user_conversations uc ON m.conversation_id = uc.conversation_id
    WHERE m.created_at > COALESCE(uc.last_read_at, '1970-01-01'::timestamptz)
      AND m.sender_id != p_user_id
      AND NOT m.deleted
    GROUP BY m.conversation_id
  ),
  member_counts AS (
    SELECT 
      conversation_id,
      COUNT(*) as count
    FROM conversation_participants
    WHERE conversation_id IN (SELECT conversation_id FROM user_conversations)
    GROUP BY conversation_id
  ),
  other_participants AS (
    SELECT DISTINCT ON (cp.conversation_id)
      cp.conversation_id,
      cp.user_id
    FROM conversation_participants cp
    INNER JOIN user_conversations uc ON cp.conversation_id = uc.conversation_id
    INNER JOIN conversations c ON c.id = cp.conversation_id
    WHERE cp.user_id != p_user_id
      AND c.type = 'direct'
  )
  SELECT 
    cd.id,
    cd.type,
    cd.name,
    cd.avatar_url,
    cd.updated_at,
    cd.archived,
    lm.content,
    lm.created_at,
    COALESCE(uc.count, 0),
    COALESCE(mc.count, 0),
    op.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.status,
    p.bio
  FROM conv_data cd
  LEFT JOIN last_messages lm ON cd.id = lm.conversation_id
  LEFT JOIN unread_counts uc ON cd.id = uc.conversation_id
  LEFT JOIN member_counts mc ON cd.id = mc.conversation_id
  LEFT JOIN other_participants op ON cd.id = op.conversation_id
  LEFT JOIN profiles p ON op.user_id = p.id
  ORDER BY cd.updated_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. RPC Function para contagem total de não lidas (elimina N+1)
CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID)
RETURNS BIGINT
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)
  FROM messages m
  INNER JOIN conversation_participants cp 
    ON m.conversation_id = cp.conversation_id
  WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
    AND NOT m.deleted
$$ LANGUAGE sql STABLE;

-- 3. Índices para otimização de queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender_created 
ON messages(conversation_id, sender_id, created_at DESC) 
WHERE NOT deleted;

CREATE INDEX IF NOT EXISTS idx_conv_participants_user_archived
ON conversation_participants(user_id, archived, conversation_id);

CREATE INDEX IF NOT EXISTS idx_message_status_user_message
ON message_status(user_id, message_id, status);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
ON messages(created_at DESC)
WHERE NOT deleted;