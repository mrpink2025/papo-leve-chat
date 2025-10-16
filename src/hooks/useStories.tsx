import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export const useStories = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stories, isLoading, error: queryError } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profiles!stories_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Stories query error:', error);
        throw error;
      }
      
      console.log('✅ Stories loaded:', data?.length || 0, 'stories');
      console.log('📊 Stories data:', data);
      return data;
    },
    enabled: !!user,
  });

  // Real-time subscription for stories
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stories'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createStory = useMutation({
    mutationFn: async ({
      mediaUrl,
      mediaType,
      caption,
    }: {
      mediaUrl: string;
      mediaType: 'image' | 'video';
      caption?: string;
    }) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          caption,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast({
        title: 'Story criado!',
        description: 'Seu story foi publicado com sucesso.',
      });
    },
    onError: (error: any) => {
      console.error('Story creation error:', error);
      toast({
        title: 'Erro ao criar story',
        description: error.message || 'Não foi possível criar o story.',
        variant: 'destructive',
      });
    },
  });

  const viewStory = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          viewer_id: user.id,
        });

      if (error && error.code !== '23505') throw error; // Ignore duplicate view
    },
  });

  const deleteStory = useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast({
        title: 'Story excluído',
        description: 'Seu story foi removido.',
      });
    },
  });

  return {
    stories,
    isLoading,
    createStory: createStory.mutate,
    viewStory: viewStory.mutate,
    deleteStory: deleteStory.mutate,
  };
};
