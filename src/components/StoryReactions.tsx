import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStoryReactions } from '@/hooks/useStoryReactions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface StoryReactionsProps {
  storyId: string;
  storyOwnerId: string;
  storyMediaUrl: string;
  storyMediaType: string;
  storyCaption?: string;
  onReact?: (emoji: string) => void;
  className?: string;
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

export const StoryReactions = ({ 
  storyId, 
  storyOwnerId, 
  storyMediaUrl, 
  storyMediaType, 
  storyCaption,
  onReact, 
  className 
}: StoryReactionsProps) => {
  const { addReaction, removeReaction, hasReacted, getReactionCount } = useStoryReactions(storyId);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleReaction = async (emoji: string) => {
    if (!user?.id) return;

    try {
      if (hasReacted(emoji)) {
        removeReaction({ emoji });
      } else {
        addReaction(emoji);
        
        // Criar conversa direta se reagir ao story de outra pessoa
        if (storyOwnerId !== user.id) {
          // Buscar ou criar conversa direta
          const { data: existingConversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('type', 'direct')
            .filter('created_by', 'in', `(${user.id},${storyOwnerId})`)
            .maybeSingle();

          let conversationId = existingConversation?.id;

          if (!conversationId) {
            // Criar nova conversa
            const { data: newConversation, error: convError } = await supabase
              .from('conversations')
              .insert({
                type: 'direct',
                created_by: user.id,
              })
              .select()
              .single();

            if (convError) throw convError;
            conversationId = newConversation.id;

            // Adicionar participantes
            await supabase.from('conversation_participants').insert([
              { conversation_id: conversationId, user_id: user.id, role: 'member' },
              { conversation_id: conversationId, user_id: storyOwnerId, role: 'member' },
            ]);
          }

          // Enviar mensagem com reação
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: user.id,
              content: `Reagiu com ${emoji}`,
              type: 'story_reaction',
              metadata: {
                story_id: storyId,
                story_media_url: storyMediaUrl,
                story_media_type: storyMediaType,
                story_caption: storyCaption || null,
                emoji: emoji,
              },
            });
        }
      }
      onReact?.(emoji);
    } catch (error: any) {
      console.error('Error handling reaction:', error);
      toast({
        title: 'Erro ao reagir',
        description: error.message || 'Não foi possível enviar a reação',
        variant: 'destructive',
      });
    }
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