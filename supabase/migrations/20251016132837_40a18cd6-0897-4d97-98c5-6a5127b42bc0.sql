-- Adicionar índices para melhorar performance de notificações

-- Índice para busca rápida de usuários em conversas
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_conv 
  ON public.conversation_participants(user_id, conversation_id);

-- Índice para busca rápida de mensagens não lidas
CREATE INDEX IF NOT EXISTS idx_messages_unread 
  ON public.messages(conversation_id, created_at DESC) 
  WHERE deleted = false;

-- Índice para busca rápida de status de mensagens
CREATE INDEX IF NOT EXISTS idx_message_status_user_status 
  ON public.message_status(user_id, status);

-- Índice para telemetria de notificações
CREATE INDEX IF NOT EXISTS idx_analytics_events_notif 
  ON public.analytics_events(user_id, created_at DESC) 
  WHERE event_type LIKE 'notification_%';

-- Índice para histórico de notificações por data
CREATE INDEX IF NOT EXISTS idx_notification_history_user_date 
  ON public.notification_history(user_id, created_at DESC);

-- Índice para rate limiting eficiente
CREATE INDEX IF NOT EXISTS idx_notification_rate_limit_window 
  ON public.notification_rate_limit(user_id, category, window_start DESC);

-- Índice para chamadas ativas
CREATE INDEX IF NOT EXISTS idx_call_notifications_active 
  ON public.call_notifications(user_id, status, started_at DESC) 
  WHERE status IN ('ringing', 'answered');

-- Função para limpar dados antigos de telemetria (> 90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_telemetry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limpar eventos de analytics antigos
  DELETE FROM public.analytics_events
  WHERE created_at < now() - interval '90 days'
    AND event_type LIKE 'notification_%';
  
  -- Limpar histórico de notificações antigas
  DELETE FROM public.notification_history
  WHERE created_at < now() - interval '90 days';
  
  -- Limpar rate limits antigos
  DELETE FROM public.notification_rate_limit
  WHERE window_start < now() - interval '7 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_telemetry IS 'Limpa dados de telemetria e histórico antigos para otimizar performance';

-- Criar view para estatísticas de notificações (opcional, para queries rápidas)
CREATE OR REPLACE VIEW public.notification_stats AS
SELECT 
  user_id,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) FILTER (WHERE event_type = 'notification_sent') as sent_count,
  COUNT(*) FILTER (WHERE event_type = 'notification_delivered') as delivered_count,
  COUNT(*) FILTER (WHERE event_type = 'notification_opened') as opened_count,
  COUNT(*) FILTER (WHERE event_type = 'notification_failed') as failed_count,
  COUNT(*) FILTER (WHERE event_type = 'notification_blocked') as blocked_count,
  AVG((event_data->>'latency_ms')::int) FILTER (WHERE event_type = 'notification_sent' AND event_data ? 'latency_ms') as avg_latency_ms
FROM public.analytics_events
WHERE event_type LIKE 'notification_%'
  AND created_at > now() - interval '30 days'
GROUP BY user_id, DATE_TRUNC('day', created_at);

COMMENT ON VIEW public.notification_stats IS 'View otimizada para estatísticas de notificações dos últimos 30 dias';