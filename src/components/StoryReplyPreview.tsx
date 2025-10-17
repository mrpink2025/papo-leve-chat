import { Reply } from 'lucide-react';

interface StoryReplyPreviewProps {
  storyMediaUrl: string;
  storyMediaType: 'image' | 'video';
  storyCaption?: string;
  isExpired: boolean;
  onStoryClick?: () => void;
}

export const StoryReplyPreview = ({
  storyMediaUrl,
  storyMediaType,
  storyCaption,
  isExpired,
  onStoryClick
}: StoryReplyPreviewProps) => {
  return (
    <div 
      className={`flex items-center gap-3 p-2 bg-primary/5 border-l-4 border-primary rounded-lg mb-2 ${
        !isExpired ? 'cursor-pointer hover:bg-primary/10 transition-colors' : 'opacity-60'
      }`}
      onClick={!isExpired ? onStoryClick : undefined}
    >
      {/* Miniatura */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
        {storyMediaType === 'image' ? (
          <img 
            src={storyMediaUrl} 
            alt="Story" 
            className="w-full h-full object-cover"
          />
        ) : (
          <video 
            src={storyMediaUrl} 
            className="w-full h-full object-cover"
            muted
          />
        )}
        {isExpired && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-[10px] font-medium">Expirado</span>
          </div>
        )}
      </div>
      
      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary flex items-center gap-1">
          <Reply className="h-3 w-3" />
          Respondeu ao story
        </p>
        {storyCaption && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {storyCaption}
          </p>
        )}
      </div>
    </div>
  );
};
