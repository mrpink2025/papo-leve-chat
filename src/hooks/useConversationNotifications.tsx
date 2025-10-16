import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export type NotificationMode = 'all' | 'mentions_only' | 'muted';

export interface ConversationNotificationSettings {
  id?: string;
  user_id?: string;
  conversation_id: string;
  mode: NotificationMode;
  muted_until: string | null;
}

interface MuteOptions {
  duration: '1h' | '8h' | '24h' | 'always';
}

export const useConversationNotifications = (conversationId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar configurações da conversa
  const {
    data: settings,
    isLoading,
  } = useQuery({
    queryKey: ['conversation-notifications', conversationId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('conversation_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Retornar configurações padrão se não existir
      if (!data) {
        return {
          conversation_id: conversationId,
          mode: 'all' as NotificationMode,
          muted_until: null,
        };
      }

      return data as ConversationNotificationSettings;
    },
    enabled: !!user?.id && !!conversationId,
  });

  // Atualizar modo de notificação
  const updateMode = useMutation({
    mutationFn: async (mode: NotificationMode) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('conversation_notification_settings')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          mode,
          muted_until: mode === 'muted' ? null : settings?.muted_until || null,
        }, {
          onConflict: 'user_id,conversation_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-notifications', conversationId] 
      });
      
      const modeLabels = {
        all: 'Todas as notificações ativadas',
        mentions_only: 'Somente menções ativadas',
        muted: 'Conversa silenciada',
      };
      
      toast({
        title: '✅ Notificações atualizadas',
        description: modeLabels[data.mode as NotificationMode],
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar modo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as notificações.',
        variant: 'destructive',
      });
    },
  });

  // Silenciar conversa temporariamente
  const muteConversation = useMutation({
    mutationFn: async ({ duration }: MuteOptions) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      let mutedUntil: string | null = null;

      if (duration !== 'always') {
        const now = new Date();
        const hours = duration === '1h' ? 1 : duration === '8h' ? 8 : 24;
        mutedUntil = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
      }

      const { data, error } = await supabase
        .from('conversation_notification_settings')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          mode: 'muted',
          muted_until: mutedUntil,
        }, {
          onConflict: 'user_id,conversation_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-notifications', conversationId] 
      });
      
      const durationLabels = {
        '1h': 'por 1 hora',
        '8h': 'por 8 horas',
        '24h': 'por 24 horas',
        'always': 'até você reativar',
      };
      
      toast({
        title: '🔕 Conversa silenciada',
        description: `Notificações desativadas ${durationLabels[variables.duration]}.`,
      });
    },
    onError: (error) => {
      console.error('Erro ao silenciar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível silenciar a conversa.',
        variant: 'destructive',
      });
    },
  });

  // Reativar notificações
  const unmuteConversation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('conversation_notification_settings')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          mode: 'all',
          muted_until: null,
        }, {
          onConflict: 'user_id,conversation_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-notifications', conversationId] 
      });
      
      toast({
        title: '🔔 Notificações reativadas',
        description: 'Você voltará a receber notificações desta conversa.',
      });
    },
    onError: (error) => {
      console.error('Erro ao reativar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reativar as notificações.',
        variant: 'destructive',
      });
    },
  });

  // Verificar se está silenciado (considerando tempo)
  const isMuted = (): boolean => {
    if (!settings) return false;
    if (settings.mode !== 'muted') return false;
    
    // Se muted_until é null, está permanentemente silenciado
    if (!settings.muted_until) return true;
    
    // Verificar se ainda está dentro do período de silêncio
    const now = new Date();
    const mutedUntil = new Date(settings.muted_until);
    return now < mutedUntil;
  };

  // Verificar se deve mostrar notificação para esta conversa
  const shouldNotify = (isMention: boolean = false): boolean => {
    if (!settings) return true; // Padrão é notificar

    // Se está silenciado (e ainda dentro do período)
    if (isMuted()) return false;

    // Se é modo "só menções" e não é uma menção
    if (settings.mode === 'mentions_only' && !isMention) return false;

    return true;
  };

  // Obter tempo restante de silêncio
  const getTimeRemaining = (): string | null => {
    if (!settings?.muted_until) return null;
    
    const now = new Date();
    const mutedUntil = new Date(settings.muted_until);
    
    if (now >= mutedUntil) return null;
    
    const diff = mutedUntil.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${minutes} minutos`;
    }
  };

  return {
    settings,
    isLoading,
    updateMode: updateMode.mutate,
    muteConversation: muteConversation.mutate,
    unmuteConversation: unmuteConversation.mutate,
    isUpdating: updateMode.isPending || muteConversation.isPending || unmuteConversation.isPending,
    isMuted: isMuted(),
    shouldNotify,
    timeRemaining: getTimeRemaining(),
  };
};
