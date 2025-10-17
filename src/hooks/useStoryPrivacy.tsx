import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface StoryPrivacySettings {
  id: string;
  user_id: string;
  visibility_mode: 'all_contacts' | 'selected_contacts' | 'except_contacts';
  selected_contacts: string[];
  muted_users: string[];
  hide_view_list: boolean;
}

export const useStoryPrivacy = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar configurações de privacidade
  const { data: settings, isLoading } = useQuery({
    queryKey: ['story-privacy-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('story_privacy_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      // Se não existe, criar configuração padrão
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('story_privacy_settings' as any)
          .insert({
            user_id: user.id,
            visibility_mode: 'all_contacts',
            selected_contacts: [],
            muted_users: [],
            hide_view_list: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newSettings as unknown as StoryPrivacySettings;
      }

      return data as unknown as StoryPrivacySettings;
    },
    enabled: !!user,
  });

  // Atualizar configurações
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<StoryPrivacySettings>) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('story_privacy_settings' as any)
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-privacy-settings'] });
      toast({
        title: 'Configurações atualizadas',
        description: 'Suas preferências de privacidade foram salvas.',
      });
    },
    onError: (error: any) => {
      console.error('Error updating privacy settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    },
  });

  // Silenciar/dessilenciar um usuário
  const toggleMuteUser = useMutation({
    mutationFn: async (userId: string) => {
      if (!user?.id || !settings) throw new Error('No settings');

      const currentMuted = settings.muted_users || [];
      const isMuted = currentMuted.includes(userId);
      
      const newMuted = isMuted
        ? currentMuted.filter(id => id !== userId)
        : [...currentMuted, userId];

      const { data, error } = await supabase
        .from('story_privacy_settings' as any)
        .update({ muted_users: newMuted, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-privacy-settings'] });
    },
  });

  // Verificar se um usuário está silenciado
  const isUserMuted = (userId: string) => {
    return settings?.muted_users?.includes(userId) || false;
  };

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    toggleMuteUser: toggleMuteUser.mutate,
    isUserMuted,
  };
};