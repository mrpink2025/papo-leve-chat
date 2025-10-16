import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationCategory, NotificationPriority } from './useNotificationCategories';

interface NotificationPayload {
  userId: string;
  conversationId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
}

interface GroupedNotification {
  id: string;
  title: string;
  body: string;
  groupedCount: number;
  shouldGroup: boolean;
}

// Tempo para considerar notificações como "recentes" para agrupamento (30 segundos)
const GROUPING_WINDOW = 30 * 1000;

export const useNotificationGrouping = () => {
  // Verificar se deve agrupar notificação
  const shouldGroupNotification = useCallback(async (
    payload: NotificationPayload
  ): Promise<GroupedNotification | null> => {
    try {
      const recentTime = new Date(Date.now() - GROUPING_WINDOW);

      // Buscar notificações recentes da mesma conversa e categoria
      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', payload.userId)
        .eq('conversation_id', payload.conversationId)
        .eq('category', payload.category)
        .gte('sent_at', recentTime.toISOString())
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar agrupamento:', error);
        return null;
      }

      // Se existe notificação recente, agrupar
      if (data) {
        const newCount = (data.grouped_count || 1) + 1;
        
        // Atualizar notificação existente
        await supabase
          .from('notification_history')
          .update({
            grouped_count: newCount,
            body: `${newCount} novas mensagens`,
            sent_at: new Date().toISOString(),
          })
          .eq('id', data.id);

        return {
          id: data.id,
          title: payload.title,
          body: `${newCount} novas mensagens`,
          groupedCount: newCount,
          shouldGroup: true,
        };
      }

      // Não agrupar - criar nova entrada no histórico
      const { data: newHistory, error: insertError } = await supabase
        .from('notification_history')
        .insert({
          user_id: payload.userId,
          conversation_id: payload.conversationId,
          category: payload.category,
          priority: payload.priority,
          title: payload.title,
          body: payload.body,
          grouped_count: 1,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar histórico:', insertError);
        return null;
      }

      return {
        id: newHistory.id,
        title: payload.title,
        body: payload.body,
        groupedCount: 1,
        shouldGroup: false,
      };
    } catch (error) {
      console.error('Erro no agrupamento:', error);
      return null;
    }
  }, []);

  // Limpar notificações agrupadas antigas
  const cleanupOldNotifications = useCallback(async () => {
    try {
      await supabase.rpc('cleanup_expired_notifications');
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
    }
  }, []);

  return {
    shouldGroupNotification,
    cleanupOldNotifications,
  };
};
