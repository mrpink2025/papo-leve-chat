import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { useStories } from '@/hooks/useStories';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { StoryViewer } from './StoryViewer';
import { CreateStoryDialog } from './CreateStoryDialog';

export const StoriesList = () => {
  const { stories } = useStories();
  const { user } = useAuth();
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const userStories = stories?.filter((s: any) => s.user_id === user?.id);
  const otherStories = stories?.filter((s: any) => s.user_id !== user?.id);

  // Group stories by user
  const groupedStories = otherStories?.reduce((acc: any, story: any) => {
    const userId = story.user_id;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(story);
    return acc;
  }, {});

  const storyGroups = groupedStories ? Object.values(groupedStories) : [];

  return (
    <>
      <div className="flex gap-4 overflow-x-auto p-4 bg-background border-b">
        {/* User's own story */}
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex flex-col items-center gap-2 min-w-[70px]"
        >
          <div className="relative">
            <Avatar className="h-16 w-16 ring-2 ring-primary">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>Você</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1">
              <Plus className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
          <span className="text-xs text-center">Seu story</span>
        </button>

        {/* Other users' stories */}
        {storyGroups.map((group: any, index: number) => {
          const firstStory = group[0];
          const profile = firstStory.profiles;
          
          return (
            <button
              key={firstStory.user_id}
              onClick={() => setSelectedStoryIndex(index)}
              className="flex flex-col items-center gap-2 min-w-[70px]"
            >
              <Avatar className="h-16 w-16 ring-2 ring-primary">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>
                  {profile?.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-center truncate w-full">
                {profile?.full_name || profile?.username}
              </span>
            </button>
          );
        })}
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
