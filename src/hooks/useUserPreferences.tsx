import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useUserPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Create default preferences if none exist
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newPrefs;
      }
      
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos - evita refetches desnecessários
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: { theme?: string; language?: string }) => {
      if (!user?.id) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      toast({
        title: 'Preferências atualizadas',
        description: 'Suas preferências foram salvas com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar suas preferências.',
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
  };
};
