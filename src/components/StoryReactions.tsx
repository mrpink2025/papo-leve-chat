import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStoryReactions } from '@/hooks/useStoryReactions';

interface StoryReactionsProps {
  storyId: string;
  onReact?: (emoji: string) => void;
  className?: string;
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

export const StoryReactions = ({ storyId, onReact, className }: StoryReactionsProps) => {
  const { addReaction, removeReaction, hasReacted, getReactionCount } = useStoryReactions(storyId);

  const handleReaction = (emoji: string) => {
    if (hasReacted(emoji)) {
      removeReaction({ emoji });
    } else {
      addReaction(emoji);
    }
    onReact?.(emoji);
  };

  return (
    <div className={cn('flex items-center gap-2 p-2 bg-black/60 backdrop-blur-sm rounded-full', className)}>
      {QUICK_REACTIONS.map((emoji) => {
        const count = getReactionCount(emoji);
        const reacted = hasReacted(emoji);
        
        return (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            onClick={() => handleReaction(emoji)}
            className={cn(
              'h-10 w-10 rounded-full p-0 text-2xl hover:scale-125 transition-all',
              reacted && 'bg-primary/20 ring-2 ring-primary'
            )}
          >
            <span className="relative">
              {emoji}
              {count > 0 && (
                <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center font-semibold">
                  {count}
                </span>
              )}
            </span>
          </Button>
        );
      })}
    </div>
  );
};