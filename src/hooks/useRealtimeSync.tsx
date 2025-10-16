import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook centralizado para sincronização real-time
 * Consolida todos os listeners Supabase em um único canal
 */
export const useRealtimeSync = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Canal único para todas as atualizações
    const channel = supabase
      .channel(`realtime-sync:${userId}`)
      
      // Mensagens
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Invalidar queries de mensagens e conversações
          if (payload.new && 'conversation_id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: ['messages', payload.new.conversation_id] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ['conversations', userId] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ['unread-count', userId] 
            });
          }
        }
      )
      
      // Status de mensagens
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_status',
        },
        (payload) => {
          if (payload.new && 'message_id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: ['message-status'] 
            });
          }
        }
      )
      
      // Participantes de conversa
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['conversations', userId] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['unread-count', userId] 
          });
        }
      )
      
      // Typing indicators
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
        },
        (payload) => {
          if (payload.new && 'conversation_id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: ['typing', payload.new.conversation_id] 
            });
          }
        }
      )
      
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
};
