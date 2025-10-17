-- Adicionar suporte a full-text search para mensagens
-- Criar índice GIN para busca de texto em mensagens
CREATE INDEX IF NOT EXISTS idx_messages_content_gin ON public.messages USING gin(to_tsvector('portuguese', content));

-- Criar índice GIN para busca de texto em perfis (username e full_name)
CREATE INDEX IF NOT EXISTS idx_profiles_search_gin ON public.profiles USING gin(
  to_tsvector('portuguese', coalesce(username, '') || ' ' || coalesce(full_name, ''))
);

-- Criar índice GIN para busca em nomes de grupos
CREATE INDEX IF NOT EXISTS idx_conversations_name_gin ON public.conversations USING gin(to_tsvector('portuguese', coalesce(name, '')));

-- Criar função para buscar conversas com full-text search
CREATE OR REPLACE FUNCTION public.search_conversations(
  p_user_id uuid,
  p_search_text text,
  p_include_archived boolean DEFAULT false
)
RETURNS TABLE(
  conversation_id uuid,
  conversation_type text,
  conversation_name text,
  conversation_avatar_url text,
  conversation_updated_at timestamp with time zone,
  archived boolean,
  pinned boolean,
  muted boolean,
  muted_until timestamp with time zone,
  last_message_content text,
  last_message_created_at timestamp with time zone,
  unread_count bigint,
  member_count bigint,
  other_user_id uuid,
  other_username text,
  other_full_name text,
  other_avatar_url text,
  other_status text,
  other_bio text,
  match_rank real
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
  notification_settings AS (
    SELECT 
      cns.conversation_id,
      cns.mode,
      cns.muted_until
    FROM conversation_notification_settings cns
    WHERE cns.user_id = p_user_id
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
      uc.muted,
      ns.muted_until
    FROM conversations c
    INNER JOIN user_conversations uc ON c.id = uc.conversation_id
    LEFT JOIN notification_settings ns ON c.id = ns.conversation_id
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
  ),
  -- Full-text search nas mensagens
  message_matches AS (
    SELECT DISTINCT
      m.conversation_id,
      ts_rank(to_tsvector('portuguese', m.content), plainto_tsquery('portuguese', p_search_text)) as rank
    FROM messages m
    INNER JOIN user_conversations uc ON m.conversation_id = uc.conversation_id
    WHERE to_tsvector('portuguese', m.content) @@ plainto_tsquery('portuguese', p_search_text)
      AND NOT m.deleted
    ORDER BY rank DESC
    LIMIT 50
  ),
  -- Full-text search nos nomes de perfis
  profile_matches AS (
    SELECT DISTINCT
      op.conversation_id,
      ts_rank(
        to_tsvector('portuguese', coalesce(p.username, '') || ' ' || coalesce(p.full_name, '')),
        plainto_tsquery('portuguese', p_search_text)
      ) as rank
    FROM other_participants op
    INNER JOIN profiles p ON p.id = op.user_id
    WHERE to_tsvector('portuguese', coalesce(p.username, '') || ' ' || coalesce(p.full_name, ''))
          @@ plainto_tsquery('portuguese', p_search_text)
  ),
  -- Full-text search nos nomes de grupos
  group_matches AS (
    SELECT DISTINCT
      cd.id as conversation_id,
      ts_rank(to_tsvector('portuguese', cd.name), plainto_tsquery('portuguese', p_search_text)) as rank
    FROM conv_data cd
    WHERE cd.type = 'group'
      AND to_tsvector('portuguese', cd.name) @@ plainto_tsquery('portuguese', p_search_text)
  ),
  -- Combinar todos os matches
  all_matches AS (
    SELECT conversation_id, rank FROM message_matches
    UNION ALL
    SELECT conversation_id, rank FROM profile_matches
    UNION ALL
    SELECT conversation_id, rank FROM group_matches
  ),
  best_matches AS (
    SELECT conversation_id, MAX(rank) as best_rank
    FROM all_matches
    GROUP BY conversation_id
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
    cd.muted_until,
    lm.content,
    lm.created_at,
    COALESCE(uc.count, 0),
    COALESCE(mc.count, 0),
    op.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.status,
    p.bio,
    bm.best_rank
  FROM conv_data cd
  INNER JOIN best_matches bm ON cd.id = bm.conversation_id
  LEFT JOIN last_messages lm ON cd.id = lm.conversation_id
  LEFT JOIN unread_counts uc ON cd.id = uc.conversation_id
  LEFT JOIN member_counts mc ON cd.id = mc.conversation_id
  LEFT JOIN other_participants op ON cd.id = op.conversation_id
  LEFT JOIN profiles p ON op.user_id = p.id
  ORDER BY bm.best_rank DESC, cd.pinned DESC, cd.updated_at DESC;
END;
$$;