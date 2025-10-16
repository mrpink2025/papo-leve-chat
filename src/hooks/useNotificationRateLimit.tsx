import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationCategory } from './useNotificationCategories';

interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
}

// Limites por categoria (notificações por minuto)
const RATE_LIMITS: Record<NotificationCategory, number> = {
  messages: 30,    // Máximo 30 mensagens/minuto por conversa
  mentions: 10,    // Máximo 10 menções/minuto
  calls: 5,        // Máximo 5 chamadas/minuto
  reactions: 20,   // Máximo 20 reações/minuto (podem agrupar)
  system: 10,      // Máximo 10 notificações sistema/minuto
};

// Tempo da janela de rate limiting (em ms)
const WINDOW_DURATION = 60 * 1000; // 1 minuto

export const useNotificationRateLimit = () => {
  // Verificar se pode enviar notificação (rate limiting)
  const checkRateLimit = useCallback(async (
    userId: string,
    conversationId: string,
    category: NotificationCategory
  ): Promise<RateLimitCheck> => {
    try {
      const windowStart = new Date(Date.now() - WINDOW_DURATION);

      // Buscar registros recentes
      const { data, error } = await supabase
        .from('notification_rate_limit')
        .select('count')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .eq('category', category)
        .gte('window_start', windowStart.toISOString())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar rate limit:', error);
        // Em caso de erro, permitir (fail open)
        return { allowed: true };
      }

      const currentCount = data?.count || 0;
      const limit = RATE_LIMITS[category];

      if (currentCount >= limit) {
        return {
          allowed: false,
          reason: `Rate limit excedido para ${category}`,
          currentCount,
          limit,
        };
      }

      return { allowed: true, currentCount, limit };
    } catch (error) {
      console.error('Erro ao verificar rate limit:', error);
      // Em caso de erro, permitir (fail open)
      return { allowed: true };
    }
  }, []);

  // Incrementar contador de rate limit
  const incrementRateLimit = useCallback(async (
    userId: string,
    conversationId: string,
    category: NotificationCategory
  ) => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - (now.getTime() % WINDOW_DURATION));

      // Verificar se já existe registro para esta janela
      const { data: existing } = await supabase
        .from('notification_rate_limit')
        .select('id, count')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .eq('category', category)
        .eq('window_start', windowStart.toISOString())
        .maybeSingle();

      if (existing) {
        // Incrementar contador existente
        await supabase
          .from('notification_rate_limit')
          .update({ count: existing.count + 1 })
          .eq('id', existing.id);
      } else {
        // Criar novo registro
        await supabase
          .from('notification_rate_limit')
          .insert({
            user_id: userId,
            conversation_id: conversationId,
            category,
            count: 1,
            window_start: windowStart.toISOString(),
          });
      }
    } catch (error) {
      console.error('Erro ao incrementar rate limit:', error);
    }
  }, []);

  // Resetar rate limit (útil para testes)
  const resetRateLimit = useCallback(async (
    userId: string,
    conversationId?: string
  ) => {
    try {
      let query = supabase
        .from('notification_rate_limit')
        .delete()
        .eq('user_id', userId);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      await query;
    } catch (error) {
      console.error('Erro ao resetar rate limit:', error);
    }
  }, []);

  return {
    checkRateLimit,
    incrementRateLimit,
    resetRateLimit,
    rateLimits: RATE_LIMITS,
  };
};
