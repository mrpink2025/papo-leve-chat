import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  id?: string;
  user_id?: string;
  enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  badge_enabled: boolean;
  show_preview: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_days: number[];
}

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
  badge_enabled: true,
  show_preview: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00:00',
  quiet_hours_end: '08:00:00',
  quiet_hours_days: [0, 1, 2, 3, 4, 5, 6],
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar preferências do usuário
  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return defaultPreferences;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Se não existir, criar com valores padrão
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...defaultPreferences,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user?.id,
  });

  // Atualizar preferências
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast({
        title: '✅ Preferências salvas',
        description: 'Suas configurações de notificação foram atualizadas.',
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar preferências:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as preferências.',
        variant: 'destructive',
      });
    },
  });

  // Verificar se está em Quiet Hours
  const isInQuietHours = (): boolean => {
    if (!preferences?.quiet_hours_enabled) return false;

    const now = new Date();
    const currentDay = now.getDay(); // 0 = domingo, 6 = sábado
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

    // Verificar se hoje está nos dias selecionados
    if (!preferences.quiet_hours_days.includes(currentDay)) return false;

    const start = preferences.quiet_hours_start;
    const end = preferences.quiet_hours_end;

    // Se o horário de fim é menor que o de início, significa que cruza meia-noite
    if (end < start) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  };

  // Verificar se deve mostrar notificação
  const shouldShowNotification = (): boolean => {
    if (!preferences?.enabled) return false;
    if (isInQuietHours()) return false;
    return true;
  };

  return {
    preferences: preferences || defaultPreferences,
    isLoading,
    error,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
    isInQuietHours,
    shouldShowNotification,
  };
};
