import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export type NotificationCategory = 'messages' | 'mentions' | 'calls' | 'reactions' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CategoryPreference {
  id?: string;
  user_id?: string;
  category: NotificationCategory;
  enabled: boolean;
  priority: NotificationPriority;
  sound_enabled: boolean;
  group_similar: boolean;
}

// Configurações padrão para cada categoria
const defaultCategorySettings: Record<NotificationCategory, Omit<CategoryPreference, 'user_id' | 'id'>> = {
  messages: {
    category: 'messages',
    enabled: true,
    priority: 'normal',
    sound_enabled: true,
    group_similar: true,
  },
  mentions: {
    category: 'mentions',
    enabled: true,
    priority: 'high',
    sound_enabled: true,
    group_similar: false, // Menções não devem ser agrupadas
  },
  calls: {
    category: 'calls',
    enabled: true,
    priority: 'urgent',
    sound_enabled: true,
    group_similar: false, // Chamadas não devem ser agrupadas
  },
  reactions: {
    category: 'reactions',
    enabled: true,
    priority: 'low',
    sound_enabled: false,
    group_similar: true, // Agrupar reações
  },
  system: {
    category: 'system',
    enabled: true,
    priority: 'low',
    sound_enabled: false,
    group_similar: true,
  },
};

export const useNotificationCategories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar preferências de todas as categorias
  const {
    data: categoryPreferences,
    isLoading,
  } = useQuery({
    queryKey: ['notification-categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notification_category_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Se não existirem preferências, criar padrão para todas as categorias
      if (!data || data.length === 0) {
        const categories: NotificationCategory[] = ['messages', 'mentions', 'calls', 'reactions', 'system'];
        const defaultPrefs = categories.map(cat => ({
          user_id: user.id,
          ...defaultCategorySettings[cat],
        }));

        const { data: inserted, error: insertError } = await supabase
          .from('notification_category_preferences')
          .insert(defaultPrefs)
          .select();

        if (insertError) throw insertError;
        return inserted as CategoryPreference[];
      }

      return data as CategoryPreference[];
    },
    enabled: !!user?.id,
  });

  // Atualizar preferência de uma categoria
  const updateCategory = useMutation({
    mutationFn: async ({
      category,
      updates,
    }: {
      category: NotificationCategory;
      updates: Partial<CategoryPreference>;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notification_category_preferences')
        .upsert({
          user_id: user.id,
          category,
          ...updates,
        }, {
          onConflict: 'user_id,category',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-categories'] });
    },
  });

  // Obter configuração de uma categoria específica
  const getCategorySettings = (category: NotificationCategory): CategoryPreference => {
    const found = categoryPreferences?.find(p => p.category === category);
    return found || { ...defaultCategorySettings[category], user_id: user?.id };
  };

  // Verificar se uma categoria está habilitada
  const isCategoryEnabled = (category: NotificationCategory): boolean => {
    const settings = getCategorySettings(category);
    return settings.enabled;
  };

  // Obter prioridade de uma categoria
  const getCategoryPriority = (category: NotificationCategory): NotificationPriority => {
    const settings = getCategorySettings(category);
    return settings.priority;
  };

  return {
    categoryPreferences: categoryPreferences || [],
    isLoading,
    updateCategory: updateCategory.mutate,
    isUpdating: updateCategory.isPending,
    getCategorySettings,
    isCategoryEnabled,
    getCategoryPriority,
  };
};
