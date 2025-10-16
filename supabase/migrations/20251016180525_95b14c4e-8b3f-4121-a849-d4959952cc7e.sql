-- ====================================
-- RLS para notification_history
-- ====================================
-- Permitir usuários inserirem/lerem/atualizarem suas próprias notificações
CREATE POLICY "Users can insert own notification history"
ON notification_history
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification history"
ON notification_history
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ====================================
-- RLS para notification_rate_limit
-- ====================================
-- Permitir usuários inserirem/lerem/atualizarem seus próprios rate limits
CREATE POLICY "Users can insert own rate limit"
ON notification_rate_limit
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own rate limit"
ON notification_rate_limit
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ====================================
-- Realtime para call_notifications (garantir REPLICA IDENTITY)
-- ====================================
ALTER TABLE call_notifications REPLICA IDENTITY FULL;