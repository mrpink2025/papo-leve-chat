import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { useStories } from '@/hooks/useStories';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { StoryViewer } from './StoryViewer';
import { CreateStoryDialog } from './CreateStoryDialog';
import { supabase } from '@/integrations/supabase/client';

const getAvatarUrl = (avatarPath: string | null) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath;
  const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
  return data.publicUrl;
};

export const StoriesList = () => {
  const { stories, isLoading } = useStories();
  const { user } = useAuth();
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const userStories = stories?.filter((s: any) => s.user_id === user?.id);
  const otherStories = stories?.filter((s: any) => s.user_id !== user?.id);

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
        <button
          onClick={() => {
            if (hasUserStories) {
              // Find the index of user's stories in storyGroups
              const userStoryGroupIndex = storyGroups.findIndex(
                (group: any) => group[0]?.user_id === user?.id
              );
              setSelectedStoryIndex(userStoryGroupIndex);
            } else {
              setShowCreateDialog(true);
            }
          }}
          className="flex flex-col items-center gap-2 min-w-[70px]"
        >
          <div className="relative">
            <Avatar className={`h-16 w-16 ${hasUserStories ? 'ring-2 ring-primary' : 'ring-2 ring-muted'}`}>
              <AvatarImage src={getAvatarUrl(user?.user_metadata?.avatar_url) || undefined} />
              <AvatarFallback>Você</AvatarFallback>
            </Avatar>
            {hasUserStories ? (
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-semibold">
                {userStories.length}
              </div>
            ) : (
              <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1">
                <Plus className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
          <span className="text-xs text-center">
            {hasUserStories ? 'Ver seu story' : 'Adicionar'}
          </span>
        </button>

        {/* Other users' stories */}
        {otherStories && otherStories.length > 0 ? (
          storyGroups
            .filter((group: any) => group[0]?.user_id !== user?.id)
            .map((group: any, index: number) => {
              const firstStory = group[0];
              const profile = firstStory.profile;
              const actualIndex = storyGroups.findIndex((g: any) => g[0]?.user_id === firstStory.user_id);
              
              return (
                <button
                  key={firstStory.user_id}
                  onClick={() => setSelectedStoryIndex(actualIndex)}
                  className="flex flex-col items-center gap-2 min-w-[70px]"
                >
                  <div className="relative">
                    <Avatar className="h-16 w-16 ring-2 ring-primary">
                      <AvatarImage src={getAvatarUrl(profile?.avatar_url) || undefined} />
                      <AvatarFallback>
                        {profile?.username?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {group.length > 1 && (
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-semibold">
                        {group.length}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-center truncate w-full">
                    {profile?.full_name || profile?.username}
                  </span>
                </button>
              );
            })
        ) : (
          <div className="flex items-center justify-center w-full py-4">
            <p className="text-sm text-muted-foreground">
              Nenhum story disponível. Seja o primeiro a publicar!
            </p>
          </div>
        )}
      </div>

      {selectedStoryIndex !== null && (
        <StoryViewer
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
