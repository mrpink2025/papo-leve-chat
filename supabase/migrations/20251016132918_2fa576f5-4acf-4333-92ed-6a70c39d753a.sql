-- Remover view com SECURITY DEFINER e recriar sem isso
DROP VIEW IF EXISTS public.notification_stats;

-- Criar view normal (sem SECURITY DEFINER)
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

-- Habilitar RLS na view
ALTER VIEW public.notification_stats SET (security_invoker = on);

COMMENT ON VIEW public.notification_stats IS 'View otimizada para estatísticas de notificações dos últimos 30 dias com RLS';