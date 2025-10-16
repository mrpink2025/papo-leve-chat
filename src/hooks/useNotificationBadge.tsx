import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook para gerenciar badges de notificações não lidas
 * Sincroniza o contador entre todos os dispositivos do usuário
 */
export const useNotificationBadge = () => {
  const { user } = useAuth();

  // Buscar contagem de mensagens não lidas
  const { data: unreadCount = 0, refetch } = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Buscar conversas do usuário
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!participations || participations.length === 0) return 0;

      let totalUnread = 0;

      // Para cada conversa, contar mensagens não lidas
      for (const participation of participations) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', participation.conversation_id)
          .neq('sender_id', user.id)
          .gt(
            'created_at',
            participation.last_read_at || new Date(0).toISOString()
          );

        totalUnread += count || 0;
      }

      return totalUnread;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Atualizar a cada 30s
  });

  // Atualizar badge do app
  const updateBadge = useCallback(
    async (count: number) => {
      try {
        // API de Badge do navegador
        if ('setAppBadge' in navigator) {
          if (count > 0) {
            await (navigator as any).setAppBadge(count);
          } else {
            await (navigator as any).clearAppBadge();
          }
        }

        // Notificar Service Worker para sincronizar com outros dispositivos
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'BADGE_UPDATE',
            count,
            userId: user?.id,
          });
        }
      } catch (error) {
        console.error('Erro ao atualizar badge:', error);
      }
    },
    [user?.id]
  );

  // Limpar badge
  const clearBadge = useCallback(async () => {
    await updateBadge(0);
  }, [updateBadge]);

  // Sincronizar badge quando a contagem mudar
  useEffect(() => {
    if (unreadCount !== undefined) {
      updateBadge(unreadCount);
    }
  }, [unreadCount, updateBadge]);

  // Escutar mudanças em tempo real
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('badge-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refetch quando houver nova mensagem
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch quando last_read_at mudar
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // Escutar mensagens do Service Worker (sincronização entre tabs)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BADGE_SYNC') {
        refetch();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [refetch]);

  return {
    unreadCount,
    updateBadge,
    clearBadge,
    refetch,
  };
};
