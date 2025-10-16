import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationMetric {
  type: 'sent' | 'delivered' | 'opened' | 'failed' | 'blocked';
  category: string;
  conversationId?: string;
  latencyMs?: number;
  reason?: string;
}

/**
 * Hook para telemetria de notificações
 * - Tracking de envio, entrega e abertura
 * - Métricas de performance (latência)
 * - Análise de falhas
 */
export const useNotificationTelemetry = () => {
  const { user } = useAuth();

  // Registrar métrica
  const trackMetric = useCallback(
    async (metric: NotificationMetric) => {
      if (!user?.id) return;

      try {
        const eventData = {
          metric_type: metric.type,
          category: metric.category,
          conversation_id: metric.conversationId,
          latency_ms: metric.latencyMs,
          reason: metric.reason,
          timestamp: new Date().toISOString(),
        };

        // Inserir no analytics_events
        const { error } = await supabase.from('analytics_events').insert({
          user_id: user.id,
          event_type: `notification_${metric.type}`,
          event_data: eventData,
        });

        if (error) {
          console.error('Erro ao registrar métrica:', error);
        }

        // Log para debug (remover em produção)
        console.log('📊 Telemetria:', metric.type, eventData);
      } catch (error) {
        console.error('Erro ao processar telemetria:', error);
      }
    },
    [user?.id]
  );

  // Tracking de notificação enviada
  const trackSent = useCallback(
    async (category: string, conversationId: string, startTime: number) => {
      const latency = Date.now() - startTime;
      await trackMetric({
        type: 'sent',
        category,
        conversationId,
        latencyMs: latency,
      });
    },
    [trackMetric]
  );

  // Tracking de notificação entregue
  const trackDelivered = useCallback(
    async (category: string, conversationId: string) => {
      await trackMetric({
        type: 'delivered',
        category,
        conversationId,
      });
    },
    [trackMetric]
  );

  // Tracking de notificação aberta
  const trackOpened = useCallback(
    async (category: string, conversationId: string) => {
      await trackMetric({
        type: 'opened',
        category,
        conversationId,
      });
    },
    [trackMetric]
  );

  // Tracking de falha
  const trackFailed = useCallback(
    async (category: string, conversationId: string, reason: string) => {
      await trackMetric({
        type: 'failed',
        category,
        conversationId,
        reason,
      });
    },
    [trackMetric]
  );

  // Tracking de bloqueio
  const trackBlocked = useCallback(
    async (category: string, conversationId: string, reason: string) => {
      await trackMetric({
        type: 'blocked',
        category,
        conversationId,
        reason,
      });
    },
    [trackMetric]
  );

  // Obter estatísticas
  const getStats = useCallback(
    async (days: number = 7) => {
      if (!user?.id) return null;

      try {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data, error } = await supabase
          .from('analytics_events')
          .select('event_type, event_data, created_at')
          .eq('user_id', user.id)
          .like('event_type', 'notification_%')
          .gte('created_at', since.toISOString());

        if (error) throw error;

        // Calcular estatísticas
        const stats = {
          total: data?.length || 0,
          sent: data?.filter((e) => e.event_type === 'notification_sent').length || 0,
          delivered: data?.filter((e) => e.event_type === 'notification_delivered').length || 0,
          opened: data?.filter((e) => e.event_type === 'notification_opened').length || 0,
          failed: data?.filter((e) => e.event_type === 'notification_failed').length || 0,
          blocked: data?.filter((e) => e.event_type === 'notification_blocked').length || 0,
          avgLatencyMs: 0,
          deliveryRate: 0,
          openRate: 0,
        };

        // Calcular latência média
        const sentEvents = data?.filter((e) => e.event_type === 'notification_sent') || [];
        if (sentEvents.length > 0) {
          const totalLatency = sentEvents.reduce((sum, e) => {
            const eventData = e.event_data as any;
            return sum + (eventData?.latency_ms || 0);
          }, 0);
          stats.avgLatencyMs = Math.round(totalLatency / sentEvents.length);
        }

        // Calcular taxas
        if (stats.sent > 0) {
          stats.deliveryRate = Math.round((stats.delivered / stats.sent) * 100);
        }
        if (stats.delivered > 0) {
          stats.openRate = Math.round((stats.opened / stats.delivered) * 100);
        }

        return stats;
      } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        return null;
      }
    },
    [user?.id]
  );

  return {
    trackSent,
    trackDelivered,
    trackOpened,
    trackFailed,
    trackBlocked,
    getStats,
  };
};
