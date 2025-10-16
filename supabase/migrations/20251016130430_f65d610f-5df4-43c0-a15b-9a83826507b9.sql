-- Tabela para preferências de notificação por conversa
CREATE TABLE IF NOT EXISTS conversation_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Configurações
  mode text NOT NULL DEFAULT 'all' CHECK (mode IN ('all', 'mentions_only', 'muted')),
  muted_until timestamptz, -- NULL = não silenciado, ou timestamp quando o silêncio expira
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Garantir uma configuração por usuário por conversa
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS
ALTER TABLE conversation_notification_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own conversation notification settings" 
  ON conversation_notification_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation notification settings" 
  ON conversation_notification_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation notification settings" 
  ON conversation_notification_settings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversation notification settings" 
  ON conversation_notification_settings FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_conversation_notification_settings_updated_at
  BEFORE UPDATE ON conversation_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_conversation_notification_settings_user_id 
  ON conversation_notification_settings(user_id);
  
CREATE INDEX idx_conversation_notification_settings_conversation_id 
  ON conversation_notification_settings(conversation_id);
  
CREATE INDEX idx_conversation_notification_settings_muted_until 
  ON conversation_notification_settings(muted_until) 
  WHERE muted_until IS NOT NULL;