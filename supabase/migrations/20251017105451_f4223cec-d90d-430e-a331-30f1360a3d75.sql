-- Atualizar função get_user_conversations para incluir campos pinned e muted
DROP FUNCTION IF EXISTS public.get_user_conversations(uuid, boolean);

CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id uuid, p_include_archived boolean DEFAULT false)
RETURNS TABLE(
  conversation_id uuid,
  conversation_type text,
  conversation_name text,
  conversation_avatar_url text,
  conversation_updated_at timestamp with time zone,
  archived boolean,
  pinned boolean,
  muted boolean,
  last_message_content text,
  last_message_created_at timestamp with time zone,
  unread_count bigint,
  member_count bigint,
  other_user_id uuid,
  other_username text,
  other_full_name text,
  other_avatar_url text,
  other_status text,
  other_bio text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_conversations AS (
    SELECT cp.conversation_id, cp.last_read_at, cp.archived, cp.pinned, cp.muted
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
      uc.archived,
      uc.pinned,
      uc.muted
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
      cp.conversation_id,
      COUNT(*) as count
    FROM conversation_participants cp
    WHERE cp.conversation_id IN (SELECT uc.conversation_id FROM user_conversations uc)
    GROUP BY cp.conversation_id
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
    cd.pinned,
    cd.muted,
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
  ORDER BY cd.pinned DESC, cd.updated_at DESC;
END;
$$;