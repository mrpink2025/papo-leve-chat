-- Passo 1: Criar o grupo "Bem-vindos" e adicionar participantes
DO $$
DECLARE
  admin_user_id uuid := 'e960d27e-0d7d-4c1d-ad73-0723c03486b3'; -- ID do Mr_Pink
  welcome_group_id uuid;
  user_record RECORD;
BEGIN
  -- Criar o grupo "Bem-vindos"
  INSERT INTO conversations (type, name, created_by)
  VALUES ('group', 'Bem-vindos', admin_user_id)
  RETURNING id INTO welcome_group_id;
  
  -- Adicionar Mr_Pink como admin
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (welcome_group_id, admin_user_id, 'admin');
  
  -- Adicionar todos os outros usuários como membros
  FOR user_record IN 
    SELECT id FROM profiles WHERE id != admin_user_id
  LOOP
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (welcome_group_id, user_record.id, 'member');
  END LOOP;
  
  -- Enviar mensagem inicial de boas-vindas
  INSERT INTO messages (conversation_id, sender_id, content, type)
  VALUES (
    welcome_group_id,
    admin_user_id,
    '👋 Bem-vindo(a) à plataforma! Este é o grupo oficial de boas-vindas. Fique à vontade para tirar dúvidas e conhecer outros membros.',
    'text'
  );
END $$;

-- Passo 2: Atualizar a função handle_new_user() para adicionar novos usuários ao grupo automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  welcome_group_id uuid;
  admin_user_id uuid := 'e960d27e-0d7d-4c1d-ad73-0723c03486b3'; -- ID do Mr_Pink
BEGIN
  -- Inserir perfil do usuário
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  
  -- Atribuir role padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Buscar o grupo "Bem-vindos"
  SELECT id INTO welcome_group_id 
  FROM conversations 
  WHERE name = 'Bem-vindos' AND type = 'group'
  LIMIT 1;
  
  -- Se o grupo existe, adicionar o novo usuário
  IF welcome_group_id IS NOT NULL THEN
    -- Adicionar como membro
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (welcome_group_id, NEW.id, 'member');
    
    -- Enviar mensagem de boas-vindas personalizada
    INSERT INTO messages (conversation_id, sender_id, content, type)
    VALUES (
      welcome_group_id,
      admin_user_id,
      '🎉 Bem-vindo(a) ao grupo, ' || COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)) || '!',
      'text'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Passo 3: Criar proteção contra deleção do grupo
CREATE OR REPLACE FUNCTION prevent_welcome_group_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.name = 'Bem-vindos' AND OLD.type = 'group' THEN
    RAISE EXCEPTION 'O grupo Bem-vindos não pode ser deletado';
  END IF;
  RETURN OLD;
END;
$$;

-- Criar trigger de proteção
DROP TRIGGER IF EXISTS protect_welcome_group ON conversations;
CREATE TRIGGER protect_welcome_group
BEFORE DELETE ON conversations
FOR EACH ROW
EXECUTE FUNCTION prevent_welcome_group_deletion();