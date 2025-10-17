interface StoryReactionPreviewProps {
  storyMediaUrl: string;
  storyMediaType: 'image' | 'video';
  emoji: string;
  isExpired: boolean;
  onStoryClick?: () => void;
}

export const StoryReactionPreview = ({
  storyMediaUrl,
  storyMediaType,
  emoji,
  isExpired,
  onStoryClick
}: StoryReactionPreviewProps) => {
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
      
      {/* Emoji e texto */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <p className="text-sm text-muted-foreground">Reagiu ao story</p>
      </div>
    </div>
  );
};
