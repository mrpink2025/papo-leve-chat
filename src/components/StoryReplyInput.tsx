import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface StoryReplyInputProps {
  storyId: string;
  storyOwnerId: string;
  onReplySent?: () => void;
}

export const StoryReplyInput = ({ storyId, storyOwnerId, onReplySent }: StoryReplyInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSendReply = async () => {
    if (!message.trim() || !user?.id) return;

    setSending(true);
    try {
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

      // Enviar mensagem
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: message,
          type: 'text',
        });

      if (messageError) throw messageError;

      // Registrar resposta ao story
      await supabase.from('story_replies' as any).insert({
        story_id: storyId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: message,
      });

      toast({
        title: 'Resposta enviada',
        description: 'Sua mensagem foi enviada com sucesso',
      });

      setMessage('');
      onReplySent?.();

      // Navegar para a conversa
      setTimeout(() => {
        navigate(`/app/chat/${conversationId}`);
      }, 500);
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível enviar a resposta',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-black/60 backdrop-blur-sm rounded-full">
      <Input
        type="text"
        placeholder="Responder ao story..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
        disabled={sending}
        className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
      />
      <Button
        size="icon"
        onClick={handleSendReply}
        disabled={!message.trim() || sending}
        className="rounded-full bg-primary hover:bg-primary/90"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};