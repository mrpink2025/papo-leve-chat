-- Tabela para preferências de notificações do usuário
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Preferências gerais
  enabled boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  badge_enabled boolean DEFAULT true,
  show_preview boolean DEFAULT true, -- Preview na tela bloqueada
  
  -- Quiet Hours (Não Perturbe)
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00:00', -- 10 PM
  quiet_hours_end time DEFAULT '08:00:00', -- 8 AM
  quiet_hours_days integer[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=domingo, 6=sábado
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own notification preferences" 
  ON notification_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" 
  ON notification_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" 
  ON notification_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences" 
  ON notification_preferences FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índice para performance
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);