-- Configurar cron jobs para limpeza automática

-- 1. Limpar chamadas expiradas a cada 30 segundos
SELECT cron.schedule(
  'cleanup-expired-calls',
  '*/30 * * * * *', -- A cada 30 segundos
  $$
  SELECT net.http_post(
    url := 'https://valazbmgqazykdzcwfcs.supabase.co/functions/v1/cleanup-expired-calls',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  ) as request_id;
  $$
);

-- 2. Limpar tokens inativos uma vez por dia às 3h da manhã
SELECT cron.schedule(
  'cleanup-inactive-tokens',
  '0 3 * * *', -- Diariamente às 3h
  $$
  SELECT net.http_post(
    url := 'https://valazbmgqazykdzcwfcs.supabase.co/functions/v1/cleanup-inactive-tokens',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  ) as request_id;
  $$
);

-- 3. Criar índice para otimizar query de chamadas expiradas
CREATE INDEX IF NOT EXISTS idx_call_notifications_status_started 
  ON call_notifications(status, started_at) 
  WHERE status = 'ringing';

-- 4. Criar índice para otimizar query de tokens inativos
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_used 
  ON push_subscriptions(last_used_at);

-- Comentário: 
-- Os cron jobs foram configurados para:
-- - Limpar chamadas não atendidas após 30s automaticamente
-- - Remover tokens de push inativos há mais de 30 dias
-- - Ambos executam via HTTP para as edge functions