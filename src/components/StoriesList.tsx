import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Eye } from 'lucide-react';
import { useStories } from '@/hooks/useStories';
import { useAuth } from '@/hooks/useAuth';
import { useState, memo, useMemo } from 'react';
import { EnhancedStoryViewer } from './EnhancedStoryViewer';
import { CreateStoryDialog } from './CreateStoryDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const getAvatarUrl = (avatarPath: string | null) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath;
  const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
  return data.publicUrl;
};

const StoryAvatar = memo(({ story, onClick, viewed }: any) => {
  const profile = story.profile;
  const avatarUrl = getAvatarUrl(profile?.avatar_url);
  
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 min-w-[70px]"
    >
      <div className="relative">
        <div className={cn(
          "p-[2px] rounded-full",
          viewed 
            ? "bg-border" 
            : "bg-gradient-to-br from-[#FF9500] via-[#FFD54F] to-[#FF9500]"
        )}>
          <Avatar className="h-16 w-16 ring-2 ring-background">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback>
              {profile?.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        {story.count > 1 && (
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-semibold">
            {story.count}
          </div>
        )}
      </div>
      <span className="text-xs text-center truncate w-full">
        {profile?.full_name || profile?.username}
      </span>
    </button>
  );
});

StoryAvatar.displayName = 'StoryAvatar';

export const StoriesList = () => {
  const { stories, isLoading } = useStories();
  const { user } = useAuth();
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Load current user's profile avatar as fallback
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const currentAvatarUrl = getAvatarUrl(
    (currentProfile as any)?.avatar_url || user?.user_metadata?.avatar_url || null
  );

  const userStories = stories?.filter((s: any) => s.user_id === user?.id);
  const otherStories = stories?.filter((s: any) => s.user_id !== user?.id);

  // Verificar quais stories foram vistos pelo usuário
  const { data: viewedStories } = useQuery({
    queryKey: ['viewed-stories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', user.id);
      if (error) throw error;
      return data.map(v => v.story_id);
    },
    enabled: !!user,
  });

  // Agrupar stories e determinar se foram vistos
  const storyGroupsWithViewStatus = useMemo(() => {
    if (!stories) return [];
    
    const grouped = stories.reduce((acc: any, story: any) => {
      const userId = story.user_id;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(story);
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([userId, storiesInGroup]: [string, any]) => {
      const allViewed = storiesInGroup.every((s: any) => 
        viewedStories?.includes(s.id)
      );
      return {
        userId,
        stories: storiesInGroup,
        allViewed,
      };
    });
  }, [stories, viewedStories]);

  // Separar em não vistos e vistos
  const unseenGroups = storyGroupsWithViewStatus.filter(g => !g.allViewed && g.userId !== user?.id);
  const seenGroups = storyGroupsWithViewStatus.filter(g => g.allViewed && g.userId !== user?.id);

  // Group ALL stories by user (including user's own stories)
  const allGroupedStories = stories?.reduce((acc: any, story: any) => {
    const userId = story.user_id;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(story);
    return acc;
  }, {});

  const storyGroups = allGroupedStories ? Object.values(allGroupedStories) : [];
  const hasUserStories = userStories && userStories.length > 0;

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4 bg-background border-b">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 min-w-[70px] animate-pulse">
            <div className="h-16 w-16 rounded-full bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto p-4 bg-background border-b">
        {/* User's own story */}
        {hasUserStories ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center gap-2 min-w-[70px] hover:opacity-80 transition-opacity">
                <div className="relative">
                  <div className="p-[2px] rounded-full bg-gradient-to-br from-[#FF9500] via-[#FFD54F] to-[#FF9500]">
                    <Avatar className="h-16 w-16 ring-2 ring-background">
                      <AvatarImage src={currentAvatarUrl || undefined} />
                      <AvatarFallback>Você</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-semibold">
                    {userStories.length}
                  </div>
                </div>
                <span className="text-xs text-center font-medium">Seu story</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  const userStoryGroupIndex = storyGroups.findIndex(
                    (group: any) => group[0]?.user_id === user?.id
                  );
                  setSelectedStoryIndex(userStoryGroupIndex);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver meus stories ({userStories.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar novo story
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex flex-col items-center gap-2 min-w-[70px] hover:opacity-80 transition-opacity"
          >
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-muted">
                <AvatarImage src={currentAvatarUrl || undefined} />
                <AvatarFallback>Você</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1">
                <Plus className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <span className="text-xs text-center">Adicionar</span>
          </button>
        )}

        {/* Stories não vistos */}
        {unseenGroups.length > 0 && (
          <>
            <div className="h-16 w-px bg-border mx-2" />
            {unseenGroups.map((group: any) => {
              const firstStory = group.stories[0];
              const actualIndex = storyGroups.findIndex((g: any) => g[0]?.user_id === firstStory.user_id);
              
              return (
                <StoryAvatar
                  key={firstStory.user_id}
                  story={{
                    profile: firstStory.profile,
                    count: group.stories.length
                  }}
                  viewed={false}
                  onClick={() => setSelectedStoryIndex(actualIndex)}
                />
              );
            })}
          </>
        )}

        {/* Stories vistos */}
        {seenGroups.length > 0 && (
          <>
            {unseenGroups.length > 0 && (
              <div className="h-16 w-px bg-border mx-2" />
            )}
            {seenGroups.map((group: any) => {
              const firstStory = group.stories[0];
              const actualIndex = storyGroups.findIndex((g: any) => g[0]?.user_id === firstStory.user_id);
              
              return (
                <StoryAvatar
                  key={firstStory.user_id}
                  story={{
                    profile: firstStory.profile,
                    count: group.stories.length
                  }}
                  viewed={true}
                  onClick={() => setSelectedStoryIndex(actualIndex)}
                />
              );
            })}
          </>
        )}

        {/* Mensagem quando não há stories */}
        {!hasUserStories && unseenGroups.length === 0 && seenGroups.length === 0 && (
          <div className="flex items-center justify-center w-full py-4">
            <p className="text-sm text-muted-foreground">
              Nenhum story disponível. Seja o primeiro a publicar!
            </p>
          </div>
        )}
      </div>

      {selectedStoryIndex !== null && (
        <EnhancedStoryViewer
          storyGroups={storyGroups}
          initialIndex={selectedStoryIndex}
          onClose={() => setSelectedStoryIndex(null)}
        />
      )}

      <CreateStoryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
};
