-- Corrigir joined_at_history e criar trigger de sincronização
-- O problema: joined_at_history estava sendo inicializado com o timestamp da migration
-- em vez do valor real de joined_at

-- 1. Backfill: copiar joined_at para joined_at_history em todos os registros existentes
UPDATE public.conversation_participants
SET joined_at_history = joined_at
WHERE joined_at IS NOT NULL;

-- 2. Remover o default incorreto que estava colocando now()
ALTER TABLE public.conversation_participants
ALTER COLUMN joined_at_history DROP DEFAULT;

-- 3. Criar função de trigger para manter joined_at_history sincronizado
CREATE OR REPLACE FUNCTION public.sync_joined_at_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Ao inserir, copiar joined_at para joined_at_history
    NEW.joined_at_history := COALESCE(NEW.joined_at, now());
  ELSIF TG_OP = 'UPDATE' THEN
    -- Ao atualizar, só modificar joined_at_history se joined_at mudou
    IF NEW.joined_at IS DISTINCT FROM OLD.joined_at THEN
      NEW.joined_at_history := COALESCE(NEW.joined_at, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Anexar o trigger à tabela
DROP TRIGGER IF EXISTS trg_sync_joined_at_history ON public.conversation_participants;
CREATE TRIGGER trg_sync_joined_at_history
BEFORE INSERT OR UPDATE ON public.conversation_participants
FOR EACH ROW
EXECUTE FUNCTION public.sync_joined_at_history();

-- 5. Criar índices compostos para otimizar as queries RLS
CREATE INDEX IF NOT EXISTS idx_cp_conv_user_active
ON public.conversation_participants (conversation_id, user_id, left_at, joined_at_history, joined_at);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created
ON public.messages (conversation_id, created_at);