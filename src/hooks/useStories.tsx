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
      // Fetch stories without embed
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (storiesError) {
        console.error('❌ Stories query error:', storiesError);
        throw storiesError;
      }

      if (!storiesData || storiesData.length === 0) {
        console.log('✅ No stories found');
        return [];
      }

      // Extract unique user IDs
      const userIds = [...new Set(storiesData.map((s) => s.user_id))];

      // Fetch profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('❌ Profiles query error:', profilesError);
        throw profilesError;
      }

      // Map profiles to stories
      const profileById = new Map(profiles?.map((p) => [p.id, p]) || []);
      const storiesWithProfile = storiesData.map((s) => ({
        ...s,
        profile: profileById.get(s.user_id) || null,
      }));

      console.log('✅ Stories loaded:', storiesWithProfile.length, 'stories');
      return storiesWithProfile;
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
