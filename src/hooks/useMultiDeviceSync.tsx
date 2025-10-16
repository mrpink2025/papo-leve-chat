import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook para sincronizar estados entre múltiplos dispositivos
 * - Estados de lido/entregue
 * - Badges
 * - Preferências de notificação
 */
export const useMultiDeviceSync = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Sincronizar status de mensagens lidas
  const syncReadStatus = useCallback(
    async (conversationId: string, messageId: string) => {
      if (!user?.id) return;

      try {
        // Atualizar status local
        await supabase
          .from('message_status')
          .upsert(
            {
              message_id: messageId,
              user_id: user.id,
              status: 'read',
              timestamp: new Date().toISOString(),
            },
            {
              onConflict: 'message_id,user_id',
            }
          );

        // Atualizar last_read_at da conversa
        await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);

        // Notificar outros dispositivos via broadcast
        const channel = supabase.channel('read-sync');
        await channel.send({
          type: 'broadcast',
          event: 'read-status-update',
          payload: {
            userId: user.id,
            conversationId,
            messageId,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Erro ao sincronizar status de leitura:', error);
      }
    },
    [user?.id]
  );

  // Sincronizar status de entrega
  const syncDeliveryStatus = useCallback(
    async (messageIds: string[]) => {
      if (!user?.id || messageIds.length === 0) return;

      try {
        const updates = messageIds.map((messageId) => ({
          message_id: messageId,
          user_id: user.id,
          status: 'delivered',
          timestamp: new Date().toISOString(),
        }));

        await supabase.from('message_status').upsert(updates, {
          onConflict: 'message_id,user_id',
        });

        // Notificar outros dispositivos
        const channel = supabase.channel('delivery-sync');
        await channel.send({
          type: 'broadcast',
          event: 'delivery-status-update',
          payload: {
            userId: user.id,
            messageIds,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Erro ao sincronizar status de entrega:', error);
      }
    },
    [user?.id]
  );

  // Gerenciar dispositivos ativos
  const updateDeviceActivity = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Atualizar last_used_at do dispositivo atual
      const subscription = await getActiveSubscription();
      if (subscription) {
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Erro ao atualizar atividade do dispositivo:', error);
    }
  }, [user?.id]);

  // Obter inscrição ativa do dispositivo atual
  const getActiveSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription;
    } catch (error) {
      console.error('Erro ao obter inscrição:', error);
      return null;
    }
  }, []);

  // Deduplicar notificações
  const shouldShowNotification = useCallback(
    async (notificationId: string): Promise<boolean> => {
      try {
        // Verificar se já recebemos esta notificação em outro dispositivo
        const key = `notif-${user?.id}-${notificationId}`;
        const lastShown = localStorage.getItem(key);

        if (lastShown) {
          const timeSinceShown = Date.now() - parseInt(lastShown, 10);
          // Se mostrou nos últimos 5 segundos, não mostrar novamente
          if (timeSinceShown < 5000) {
            return false;
          }
        }

        // Marcar como mostrada
        localStorage.setItem(key, Date.now().toString());

        // Limpar entradas antigas (mais de 1 minuto)
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('notif-')) {
            const timestamp = parseInt(localStorage.getItem(key) || '0', 10);
            if (Date.now() - timestamp > 60000) {
              localStorage.removeItem(key);
            }
          }
        });

        return true;
      } catch (error) {
        console.error('Erro na deduplicação:', error);
        return true; // Em caso de erro, mostrar a notificação
      }
    },
    [user?.id]
  );

  // Escutar atualizações em tempo real
  useEffect(() => {
    if (!user?.id) return;

    // Canal para sincronização de leitura
    const readChannel = supabase
      .channel('read-sync-listener')
      .on('broadcast', { event: 'read-status-update' }, (payload) => {
        if (payload.payload.userId === user.id) {
          // Invalidar queries relacionadas
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          queryClient.invalidateQueries({ queryKey: ['message-status'] });
          queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        }
      })
      .subscribe();

    // Canal para sincronização de entrega
    const deliveryChannel = supabase
      .channel('delivery-sync-listener')
      .on('broadcast', { event: 'delivery-status-update' }, (payload) => {
        if (payload.payload.userId === user.id) {
          queryClient.invalidateQueries({ queryKey: ['message-status'] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(readChannel);
      supabase.removeChannel(deliveryChannel);
    };
  }, [user?.id, queryClient]);

  // Atualizar atividade periodicamente
  useEffect(() => {
    if (!user?.id) return;

    updateDeviceActivity();
    const interval = setInterval(updateDeviceActivity, 5 * 60 * 1000); // A cada 5 min

    return () => clearInterval(interval);
  }, [user?.id, updateDeviceActivity]);

  // Sincronizar quando a aba fica visível
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateDeviceActivity();
        queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateDeviceActivity, queryClient]);

  return {
    syncReadStatus,
    syncDeliveryStatus,
    updateDeviceActivity,
    shouldShowNotification,
    getActiveSubscription,
  };
};
