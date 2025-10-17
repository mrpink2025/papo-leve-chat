import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useStoryReactions = (storyId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar reações do story
  const { data: reactions, isLoading } = useQuery({
    queryKey: ['story-reactions', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('story_reactions' as any)
        .select(`
          id,
          emoji,
          user_id,
          created_at,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('story_id', storyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!storyId,
  });

  // Adicionar reação
  const addReaction = useMutation({
    mutationFn: async (emoji: string) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('story_reactions' as any)
        .insert({
          story_id: storyId,
          user_id: user.id,
          emoji,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-reactions', storyId] });
    },
    onError: (error: any) => {
      console.error('Error adding reaction:', error);
      toast({
        title: 'Erro ao reagir',
        description: error.message || 'Não foi possível adicionar reação',
        variant: 'destructive',
      });
    },
  });

  // Remover reação
  const removeReaction = useMutation({
    mutationFn: async ({ emoji }: { emoji: string }) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('story_reactions' as any)
        .delete()
        .eq('story_id', storyId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-reactions', storyId] });
    },
  });

  // Verificar se o usuário já reagiu com determinado emoji
  const hasReacted = (emoji: string) => {
    return reactions?.some((r: any) => r.user_id === user?.id && r.emoji === emoji) || false;
  };

  // Contar reações por emoji
  const getReactionCount = (emoji: string) => {
    return reactions?.filter((r: any) => r.emoji === emoji).length || 0;
  };

  return {
    reactions,
    isLoading,
    addReaction: addReaction.mutate,
    removeReaction: removeReaction.mutate,
    hasReacted,
    getReactionCount,
  };
};