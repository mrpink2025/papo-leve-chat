import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStories } from '@/hooks/useStories';
import { Progress } from '@/components/ui/progress';

interface StoryViewerProps {
  storyGroups: any[];
  initialIndex: number;
  onClose: () => void;
}

export const StoryViewer = ({ storyGroups, initialIndex, onClose }: StoryViewerProps) => {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const { viewStory } = useStories();

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.[currentStoryIndex];
  const profile = currentStory?.profiles;

  useEffect(() => {
    if (currentStory) {
      viewStory(currentStory.id);
    }
  }, [currentStory]);

  useEffect(() => {
    setProgress(0);
    const duration = 5000; // 5 seconds per story
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentGroupIndex, currentStoryIndex]);

  const handleNext = () => {
    if (currentStoryIndex < currentGroup.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
      const prevGroup = storyGroups[currentGroupIndex - 1];
      setCurrentStoryIndex(prevGroup.length - 1);
    }
  };

  if (!currentStory) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[90vh] p-0 bg-black">
        <div className="relative h-full flex flex-col">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
            {currentGroup.map((_: any, index: number) => (
              <Progress
                key={index}
                value={
                  index < currentStoryIndex
                    ? 100
                    : index === currentStoryIndex
                    ? progress
                    : 0
                }
                className="h-1 flex-1"
              />
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 z-10 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>
                  {profile?.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white font-medium">
                {profile?.full_name || profile?.username}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Story content */}
          <div className="flex-1 flex items-center justify-center">
            {currentStory.media_type === 'image' ? (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <video
                src={currentStory.media_url}
                autoPlay
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-center">{currentStory.caption}</p>
            </div>
          )}

          {/* Navigation */}
          <button
            onClick={handlePrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-white/20 rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-white/20 rounded-full"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
