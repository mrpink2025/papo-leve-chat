-- Fase 1: Habilitar Realtime para call_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE call_notifications;

-- Garantir que REPLICA IDENTITY está configurada
ALTER TABLE call_notifications REPLICA IDENTITY FULL;

-- Limpar chamadas antigas em status "ringing" (opcional, mas recomendado)
UPDATE call_notifications 
SET status = 'missed', ended_at = NOW() 
WHERE status = 'ringing' AND created_at < NOW() - INTERVAL '5 minutes';

-- Fase 5: Adicionar/verificar políticas RLS corretas
-- Política para SELECT (ver minhas chamadas recebidas E chamadas que fiz)
DROP POLICY IF EXISTS "Users can view own call notifications" ON call_notifications;
DROP POLICY IF EXISTS "Users can insert own call notifications" ON call_notifications;
DROP POLICY IF EXISTS "Users can update own call notifications" ON call_notifications;
DROP POLICY IF EXISTS "Users can delete own call notifications" ON call_notifications;

CREATE POLICY "Users can view their incoming and outgoing calls"
ON call_notifications FOR SELECT
USING (user_id = auth.uid() OR caller_id = auth.uid());

-- Política para INSERT (qualquer um pode iniciar chamada)
CREATE POLICY "Users can create call notifications"
ON call_notifications FOR INSERT
WITH CHECK (caller_id = auth.uid());

-- Política para UPDATE (só posso atualizar minhas chamadas)
CREATE POLICY "Users can update their call notifications"
ON call_notifications FOR UPDATE
USING (user_id = auth.uid() OR caller_id = auth.uid());

-- Política para DELETE
CREATE POLICY "Users can delete their call notifications"
ON call_notifications FOR DELETE
USING (user_id = auth.uid() OR caller_id = auth.uid());