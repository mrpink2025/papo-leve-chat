-- Create privacy_settings table
CREATE TABLE privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Quem pode me adicionar
  who_can_add_me TEXT DEFAULT 'everyone' 
    CHECK (who_can_add_me IN ('everyone', 'contacts_only', 'nobody')),
  
  -- Quem pode ver meu status online
  who_can_see_status TEXT DEFAULT 'everyone'
    CHECK (who_can_see_status IN ('everyone', 'contacts', 'nobody')),
  
  -- Quem pode ver minha foto
  who_can_see_avatar TEXT DEFAULT 'everyone'
    CHECK (who_can_see_avatar IN ('everyone', 'contacts', 'nobody')),
  
  -- Quem pode ver minha bio
  who_can_see_bio TEXT DEFAULT 'everyone'
    CHECK (who_can_see_bio IN ('everyone', 'contacts', 'nobody')),
  
  -- Quem pode me ligar
  who_can_call_me TEXT DEFAULT 'contacts'
    CHECK (who_can_call_me IN ('everyone', 'contacts', 'nobody')),
  
  -- Exibir "Visto por último"
  show_last_seen BOOLEAN DEFAULT true,
  
  -- Confirmação de leitura
  read_receipts BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own privacy settings"
  ON privacy_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON privacy_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON privacy_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create validation function
CREATE OR REPLACE FUNCTION can_interact_with_user(
  target_user_id UUID,
  interaction_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privacy_setting TEXT;
  is_contact BOOLEAN;
BEGIN
  -- Verificar se está bloqueado
  IF EXISTS (
    SELECT 1 FROM contacts
    WHERE user_id = target_user_id
      AND contact_id = auth.uid()
      AND blocked = true
  ) THEN
    RETURN false;
  END IF;
  
  -- Buscar configuração de privacidade
  IF interaction_type = 'add' THEN
    SELECT who_can_add_me INTO privacy_setting
    FROM privacy_settings
    WHERE user_id = target_user_id;
  ELSIF interaction_type = 'call' THEN
    SELECT who_can_call_me INTO privacy_setting
    FROM privacy_settings
    WHERE user_id = target_user_id;
  ELSE
    RETURN true;
  END IF;
  
  -- Se não tem configuração, padrão é 'everyone'
  privacy_setting := COALESCE(privacy_setting, 'everyone');
  
  IF privacy_setting = 'everyone' THEN
    RETURN true;
  ELSIF privacy_setting = 'nobody' THEN
    RETURN false;
  ELSIF privacy_setting = 'contacts' OR privacy_setting = 'contacts_only' THEN
    -- Verificar se são contatos
    SELECT EXISTS (
      SELECT 1 FROM contacts
      WHERE (
        (user_id = target_user_id AND contact_id = auth.uid())
        OR
        (user_id = auth.uid() AND contact_id = target_user_id)
      )
      AND blocked = false
    ) INTO is_contact;
    
    RETURN is_contact;
  END IF;
  
  RETURN false;
END;
$$;