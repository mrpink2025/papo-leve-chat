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

  // Buscar contagem de mensagens não lidas usando RPC otimizada
  const { data: unreadCount = 0, refetch } = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Usar RPC function otimizada - 1 query em vez de 50+
      const { data, error } = await supabase.rpc('get_total_unread_count', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Erro ao buscar contagem de não lidas:', error);
        return 0;
      }

      return Number(data) || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Atualizar a cada 30s
    staleTime: 10000, // Cache por 10s
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
