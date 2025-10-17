import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ChevronLeft, ChevronRight, X, Volume2, VolumeX, MoreVertical, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStories } from '@/hooks/useStories';
import { Progress } from '@/components/ui/progress';
import { StoryReactions } from './StoryReactions';
import { StoryReplyInput } from './StoryReplyInput';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedStoryViewerProps {
  storyGroups: any[];
  initialIndex: number;
  onClose: () => void;
}

export const EnhancedStoryViewer = ({ storyGroups, initialIndex, onClose }: EnhancedStoryViewerProps) => {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [showViewList, setShowViewList] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const { viewStory, deleteStory } = useStories();
  const { user } = useAuth();

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.[currentStoryIndex];
  const profile = currentStory?.profile;
  const isOwnStory = currentStory?.user_id === user?.id;

  // Buscar visualizações do story
  const { data: views } = useQuery({
    queryKey: ['story-views', currentStory?.id],
    queryFn: async () => {
      if (!currentStory?.id || !isOwnStory) return [];
      
      const { data, error } = await supabase
        .from('story_views')
        .select(`
          id,
          viewed_at,
          profiles:viewer_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('story_id', currentStory.id)
        .order('viewed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentStory?.id && isOwnStory,
  });

  useEffect(() => {
    if (currentStory) {
      viewStory(currentStory.id);
    }
  }, [currentStory]);

  useEffect(() => {
    if (isPaused) return;

    setProgress(0);
    const isVideo = currentStory?.media_type === 'video';
    const duration = isVideo ? (videoRef.current?.duration || 10) * 1000 : 5000;
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
  }, [currentGroupIndex, currentStoryIndex, isPaused]);

  // Gerenciar áudio do vídeo
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

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

  // Gestos de toque
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const screenWidth = window.innerWidth;
    const x = touch.clientX;

    // Iniciar timer para pausar (long press)
    longPressTimer.current = setTimeout(() => {
      setIsPaused(true);
    }, 200);

    // Detectar zona de toque (left/right)
    if (x < screenWidth / 3) {
      // Zona esquerda - anterior
    } else if (x > (2 * screenWidth) / 3) {
      // Zona direita - próximo
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isPaused) {
      setIsPaused(false);
      return;
    }

    const touch = e.changedTouches[0];
    const screenWidth = window.innerWidth;
    const x = touch.clientX;

    if (x < screenWidth / 3) {
      handlePrevious();
    } else if (x > (2 * screenWidth) / 3) {
      handleNext();
    }
  };

  // Swipe para fechar
  const [touchStart, setTouchStart] = useState(0);
  const handleSwipeStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchEnd - touchStart;
    if (diff > 100) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (confirm('Deseja realmente excluir este story?')) {
      deleteStory(currentStory.id);
      handleNext();
    }
  };

  if (!currentStory) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent 
        className="max-w-lg h-[90vh] p-0 bg-black overflow-hidden"
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        <VisuallyHidden>
          <DialogTitle>Visualizando Story</DialogTitle>
          <DialogDescription>
            Story de {profile?.full_name || profile?.username}
          </DialogDescription>
        </VisuallyHidden>
        
        <div className="relative h-full flex flex-col">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
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
                className="h-1 flex-1 bg-white/30"
              />
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10 ring-2 ring-white">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary">
                  {profile?.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-white font-medium text-sm">
                  {profile?.full_name || profile?.username}
                </span>
                <span className="text-white/70 text-xs">
                  {new Date(currentStory.created_at).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {currentStory.media_type === 'video' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              )}
              
              {isOwnStory && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card">
                    <DropdownMenuItem onClick={() => setShowViewList(!showViewList)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizações ({views?.length || 0})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <X className="mr-2 h-4 w-4" />
                      Excluir story
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Story content */}
          <div 
            className="flex-1 flex items-center justify-center relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {currentStory.media_type === 'image' ? (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <video
                ref={videoRef}
                src={currentStory.media_url}
                autoPlay
                muted={isMuted}
                className="max-h-full max-w-full object-contain"
                onEnded={handleNext}
              />
            )}
            
            {isPaused && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="text-white text-6xl opacity-70">⏸️</div>
              </div>
            )}
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-20 left-0 right-0 px-4">
              <p className="text-white text-center text-sm bg-black/50 backdrop-blur-sm rounded-lg p-2">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Reactions */}
          {showReactions && !isOwnStory && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
              <StoryReactions 
                storyId={currentStory.id}
                onReact={() => setShowReactions(false)}
              />
            </div>
          )}

          {/* Reply Input */}
          {!isOwnStory && (
            <div className="absolute bottom-2 left-4 right-4 z-20">
              {showReply ? (
                <StoryReplyInput
                  storyId={currentStory.id}
                  storyOwnerId={currentStory.user_id}
                  onReplySent={() => setShowReply(false)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowReactions(!showReactions)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors text-sm"
                  >
                    😊 Reagir
                  </button>
                  <button
                    onClick={() => setShowReply(true)}
                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-full backdrop-blur-sm transition-colors text-sm text-left"
                  >
                    Responder ao story...
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Views list (for own stories) */}
          {showViewList && isOwnStory && views && views.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl p-4 max-h-[50vh] overflow-y-auto z-30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Visualizações</h3>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowViewList(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {views.map((view: any) => (
                  <div key={view.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={view.profiles?.avatar_url} />
                        <AvatarFallback>
                          {view.profiles?.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {view.profiles?.full_name || view.profiles?.username}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(view.viewed_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons (hidden on mobile) */}
          <button
            onClick={handlePrevious}
            className="hidden md:block absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={handleNext}
            className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};