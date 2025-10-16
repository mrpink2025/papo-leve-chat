-- Enum para categorias de notificações
CREATE TYPE notification_category AS ENUM (
  'messages',      -- Mensagens normais
  'mentions',      -- Menções (@você, @todos)
  'calls',         -- Chamadas de voz/vídeo
  'reactions',     -- Reações às suas mensagens
  'system'         -- Avisos do sistema (admin, grupo, etc)
);

-- Enum para prioridade
CREATE TYPE notification_priority AS ENUM (
  'low',           -- Baixa (reações, sistema)
  'normal',        -- Normal (mensagens)
  'high',          -- Alta (menções)
  'urgent'         -- Urgente (chamadas)
);

-- Tabela para preferências de categorias
CREATE TABLE IF NOT EXISTS notification_category_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category notification_category NOT NULL,
  enabled boolean DEFAULT true,
  priority notification_priority DEFAULT 'normal',
  sound_enabled boolean DEFAULT true,
  group_similar boolean DEFAULT true, -- Agrupar notificações similares
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Tabela para rate limiting
CREATE TABLE IF NOT EXISTS notification_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  category notification_category NOT NULL,
  count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, conversation_id, category, window_start)
);

-- Tabela para histórico de notificações (para agrupamento)
CREATE TABLE IF NOT EXISTS notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  category notification_category NOT NULL,
  priority notification_priority NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  grouped_count integer DEFAULT 1, -- Quantas notificações foram agrupadas
  sent_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '12 hours'),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_category_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para category_preferences
CREATE POLICY "Users can view own category preferences" 
  ON notification_category_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category preferences" 
  ON notification_category_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category preferences" 
  ON notification_category_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

-- Políticas RLS para rate_limit (somente sistema/backend pode escrever)
CREATE POLICY "Users can view own rate limits" 
  ON notification_rate_limit FOR SELECT 
  USING (auth.uid() = user_id);

-- Políticas RLS para history
CREATE POLICY "Users can view own notification history" 
  ON notification_history FOR SELECT 
  USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_notification_category_preferences_updated_at
  BEFORE UPDATE ON notification_category_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance (sem predicado dinâmico)
CREATE INDEX idx_notification_category_preferences_user_id 
  ON notification_category_preferences(user_id);

CREATE INDEX idx_notification_rate_limit_user_conversation 
  ON notification_rate_limit(user_id, conversation_id, window_start);

CREATE INDEX idx_notification_history_user_conversation 
  ON notification_history(user_id, conversation_id, sent_at DESC);

CREATE INDEX idx_notification_history_expires 
  ON notification_history(expires_at);

-- Função para limpar notificações expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notification_history
  WHERE expires_at < now();
  
  DELETE FROM notification_rate_limit
  WHERE window_start < now() - interval '1 hour';
END;
$$;