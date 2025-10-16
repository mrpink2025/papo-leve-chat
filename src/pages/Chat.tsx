import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ChatHeader from "@/components/ChatHeader";
import MessageBubble from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";
import TypingIndicator from "@/components/TypingIndicator";
import DateSeparator from "@/components/DateSeparator";
import SearchMessages from "@/components/SearchMessages";
import { NativeCallDialog } from "@/components/NativeCallDialog";
import { IncomingNativeCallDialog } from "@/components/IncomingNativeCallDialog";
import ProfileViewDialog from "@/components/ProfileViewDialog";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useNativeVideoCall } from "@/hooks/useNativeVideoCall";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useMessageStatus } from "@/hooks/useMessageStatus";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ConversationData {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
  other_participant?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    status: string;
    last_seen: string | null;
  };
}

const Chat = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyToMessage, setReplyToMessage] = useState<{ id: string; content: string } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  } | null>(null);

  const { data: conversation } = useQuery<ConversationData>({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          type,
          name,
          avatar_url
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // For direct conversations, get other participant
      if (data.type === "direct") {
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select(`
            user_id,
            profiles!inner (
              id,
              username,
              full_name,
              avatar_url,
              status,
              last_seen
            )
          `)
          .eq("conversation_id", id)
          .neq("user_id", user?.id);

        if (participants && participants.length > 0) {
          const participantData = participants[0] as any;
          return {
            ...data,
            other_participant: participantData.profiles,
          };
        }
      }

      return data;
    },
    enabled: !!id && !!user,
  });

  const { messages, sendMessage, hasNextPage, loadMore } = useMessages(id, user?.id);
  const { typingUsers, setTyping } = useTypingIndicator(id || "", user?.id || "");
  const { editMessage, deleteMessage } = useMessageActions(id || "");
  const { 
    callState, 
    startCall, 
    endCall, 
    toggleVideo, 
    toggleAudio, 
    switchCamera,
    formatDuration 
  } = useNativeVideoCall();
  const { incomingCall, acceptCall, rejectCall, clearIncomingCall } = useIncomingCalls(user?.id);
  const { trackEvent } = useAnalytics();
  const { markAsRead, getMessageStatus } = useMessageStatus(id, user?.id);
  const { isOnline: isNetworkOnline, addToQueue, removeFromQueue } = useOfflineQueue();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when conversation is visible
  useEffect(() => {
    if (!id || !user?.id || !messages.length) return;

    const unreadMessages = messages.filter(
      (msg: any) => msg.sender_id !== user.id
    );

    if (unreadMessages.length > 0 && document.visibilityState === "visible") {
      unreadMessages.forEach((msg: any) => {
        markAsRead(msg.id);
      });
    }
  }, [messages, id, user?.id, markAsRead]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSendMessage = async (
    content: string,
    type?: string,
    metadata?: any
  ) => {
    try {
      const reply_to = replyToMessage?.id;
      await sendMessage({ content, type, metadata, reply_to });
      setReplyToMessage(null);
      trackEvent({ eventType: 'message_sent', eventData: { conversationId: id, type } });
    } catch (error) {
      console.error("Error sending message:", error);
      if (!isNetworkOnline && id) {
        addToQueue({ conversationId: id, content, type, metadata });
      }
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await editMessage({ messageId, content: newContent });
    } catch (error) {
      console.error("Error editing message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleOpenProfile = async (userId: string) => {
    try {
      console.log('[Chat] Abrir perfil do usuário:', userId);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!profile) {
        toast({
          title: "Erro",
          description: "Perfil não encontrado",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedProfile({
        id: profile.id,
        name: profile.full_name || profile.username || 'Usuário',
        avatar: profile.avatar_url || undefined,
        bio: profile.bio || undefined,
      });
      setProfileDialogOpen(true);
    } catch (error) {
      console.error('[Chat] Erro ao buscar perfil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil",
        variant: "destructive",
      });
    }
  };

  const handleSendPrivateMessage = async (userId: string) => {
    try {
      // Validação 1: Não pode enviar mensagem para si mesmo
      if (userId === user?.id) {
        toast({
          title: "Ação inválida",
          description: "Você não pode enviar mensagem para si mesmo",
          variant: "default",
        });
        return;
      }
      
      // Validação 2: Se já está em conversa direta com essa pessoa, não fazer nada
      if (conversation.type === 'direct' && conversation.other_participant?.id === userId) {
        toast({
          title: "Você já está conversando",
          description: "Esta já é a conversa com esta pessoa",
          variant: "default",
        });
        return;
      }
      
      console.log('[Chat] Criar conversa privada com:', userId);
      
      // Buscar conversas diretas do usuário atual
      const { data: myParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user?.id);
      
      if (!myParticipations) return;
      
      const myConvIds = myParticipations.map(p => p.conversation_id);
      
      // Buscar conversas diretas
      const { data: directConvs } = await supabase
        .from('conversations')
        .select('id, type')
        .in('id', myConvIds)
        .eq('type', 'direct');
      
      if (!directConvs) return;
      
      // Para cada conversa direta, verificar se o outro participante é o userId
      for (const conv of directConvs) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.id);
        
        if (participants) {
          const otherUserId = participants.find(p => p.user_id !== user?.id)?.user_id;
          if (otherUserId === userId) {
            // Conversa já existe
            navigate(`/chat/${conv.id}`);
            return;
          }
        }
      }
      
      // Criar nova conversa
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (convError) throw convError;
      
      // Adicionar participantes
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user?.id },
          { conversation_id: newConv.id, user_id: userId },
        ]);
      
      if (partError) throw partError;
      
      // Navegar para a nova conversa
      navigate(`/chat/${newConv.id}`);
      toast({
        title: "Conversa iniciada",
        description: "Você pode começar a conversar agora",
      });
    } catch (error) {
      console.error('[Chat] Erro ao criar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a conversa",
        variant: "destructive",
      });
    }
  };

  const handleAudioCallFromMenu = async (userId: string) => {
    try {
      console.log('[Chat] Iniciar chamada de áudio com:', userId);
      
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) throw profileError;
      
      if (!profile) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar permissões de mídia
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        console.error('[Chat] Erro ao verificar permissões:', error);
        toast({
          title: "Permissões necessárias",
          description: "Por favor, permita o acesso ao microfone",
          variant: "destructive",
        });
        return;
      }
      
      // Buscar ou criar conversa direta
      await handleSendPrivateMessage(userId);
      
      toast({
        title: "Iniciando chamada",
        description: "Aguarde enquanto conectamos...",
      });
    } catch (error) {
      console.error('[Chat] Erro ao iniciar chamada:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a chamada",
        variant: "destructive",
      });
    }
  };

  const handleVideoCallFromMenu = async (userId: string) => {
    try {
      console.log('[Chat] Iniciar chamada de vídeo com:', userId);
      
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) throw profileError;
      
      if (!profile) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar permissões de mídia
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (error) {
        console.error('[Chat] Erro ao verificar permissões:', error);
        toast({
          title: "Permissões necessárias",
          description: "Por favor, permita o acesso à câmera e microfone",
          variant: "destructive",
        });
        return;
      }
      
      // Buscar ou criar conversa direta
      await handleSendPrivateMessage(userId);
      
      toast({
        title: "Iniciando chamada",
        description: "Aguarde enquanto conectamos...",
      });
    } catch (error) {
      console.error('[Chat] Erro ao iniciar chamada:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a chamada",
        variant: "destructive",
      });
    }
  };

  const isDirectChat = conversation.type === "direct";
  const displayName = isDirectChat && conversation.other_participant
    ? conversation.other_participant.full_name || conversation.other_participant.username || "Usuário"
    : conversation.name || "Grupo";
  const displayAvatar = isDirectChat && conversation.other_participant
    ? conversation.other_participant.avatar_url || "/placeholder.svg"
    : conversation.avatar_url || "/placeholder.svg";
  const isOnline = isDirectChat && conversation.other_participant?.status === "online";
  const lastSeen = isDirectChat && conversation.other_participant ? conversation.other_participant.last_seen : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader
        name={displayName}
        avatar={displayAvatar}
        online={isOnline}
        lastSeen={lastSeen}
        isGroup={conversation.type === "group"}
        conversationId={id}
        otherUserId={conversation.other_participant?.id}
        onVideoCall={async () => {
          console.log('[Chat] Tentando iniciar chamada de vídeo:', {
            conversationId: id,
            isDirectChat,
            hasOtherParticipant: !!conversation.other_participant,
            participantInfo: conversation.other_participant
          });

          // Verificar se é conversa direta
          if (!isDirectChat) {
            toast({
              title: "Recurso não disponível",
              description: "Chamadas em grupo ainda não estão disponíveis",
              variant: "default",
            });
            return;
          }

          if (!id || !conversation.other_participant) {
            toast({
              title: "Erro ao iniciar chamada",
              description: "Não foi possível identificar o destinatário",
              variant: "destructive",
            });
            return;
          }

          // Verificar permissões de mídia
          try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } catch (error) {
            console.error('[Chat] Erro ao verificar permissões de mídia:', error);
            toast({
              title: "Permissões necessárias",
              description: "Por favor, permita o acesso à câmera e microfone",
              variant: "destructive",
            });
            return;
          }

          startCall(
            id,
            'video',
            {
              name: conversation.other_participant.full_name || conversation.other_participant.username || 'Usuário',
              avatar: conversation.other_participant.avatar_url,
            }
          );
          trackEvent({ eventType: 'video_call_started', eventData: { conversationId: id } });
        }}
        onAudioCall={async () => {
          console.log('[Chat] Tentando iniciar chamada de áudio:', {
            conversationId: id,
            isDirectChat,
            hasOtherParticipant: !!conversation.other_participant,
            participantInfo: conversation.other_participant
          });

          // Verificar se é conversa direta
          if (!isDirectChat) {
            toast({
              title: "Recurso não disponível",
              description: "Chamadas em grupo ainda não estão disponíveis",
              variant: "default",
            });
            return;
          }

          if (!id || !conversation.other_participant) {
            toast({
              title: "Erro ao iniciar chamada",
              description: "Não foi possível identificar o destinatário",
              variant: "destructive",
            });
            return;
          }

          // Verificar permissões de mídia
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (error) {
            console.error('[Chat] Erro ao verificar permissões de mídia:', error);
            toast({
              title: "Permissões necessárias",
              description: "Por favor, permita o acesso ao microfone",
              variant: "destructive",
            });
            return;
          }

          startCall(
            id,
            'audio',
            {
              name: conversation.other_participant.full_name || conversation.other_participant.username || 'Usuário',
              avatar: conversation.other_participant.avatar_url,
            }
          );
          trackEvent({ eventType: 'audio_call_started', eventData: { conversationId: id } });
        }}
        onSearch={() => setShowSearch(!showSearch)}
      />

      {/* Chamada ativa */}
      <NativeCallDialog
        callState={callState}
        onEndCall={endCall}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onSwitchCamera={switchCamera}
        formatDuration={formatDuration}
      />

      {/* Chamada recebida */}
      {incomingCall && (
        <IncomingNativeCallDialog
          open={true}
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          callType={incomingCall.callType}
          onAccept={() => {
            acceptCall();
            startCall(
              incomingCall.conversationId,
              incomingCall.callType,
              {
                name: incomingCall.callerName,
                avatar: incomingCall.callerAvatar,
              }
            );
            clearIncomingCall();
          }}
          onReject={rejectCall}
        />
      )}

      {showSearch && (
        <SearchMessages
          conversationId={id || ""}
          onClose={() => setShowSearch(false)}
          onMessageSelect={(messageId) => {
            const element = document.getElementById(messageId);
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
            setShowSearch(false);
          }}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-chat-pattern">
        {hasNextPage && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={loadMore}>
              Carregar mensagens antigas
            </Button>
          </div>
        )}
        
        {messages.map((message: any, index: number) => {
          const showDateSeparator =
            index === 0 ||
            !isSameDay(
              new Date(message.created_at),
              new Date(messages[index - 1].created_at)
            );

          const status = getMessageStatus(message.id);
          const replyContent = message.reply_to
            ? messages.find((m: any) => m.id === message.reply_to)?.content
            : undefined;

          // Detectar se deve mostrar info do remetente (primeira mensagem do autor ou após separador de data)
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showSenderInfo = 
            conversation.type === "group" &&
            message.sender_id !== user?.id &&
            (!prevMessage || 
             prevMessage.sender_id !== message.sender_id ||
             showDateSeparator);

          return (
            <div key={message.id} id={message.id}>
              {showDateSeparator && (
                <DateSeparator date={new Date(message.created_at)} />
              )}
              <MessageBubble
                id={message.id}
                content={message.content}
                timestamp={new Date(message.created_at)}
                isSent={message.sender_id === user?.id}
                isRead={status === "read"}
                type={message.type}
                metadata={message.metadata}
                edited={message.edited}
                replyTo={message.reply_to}
                replyContent={replyContent}
                status={status}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onReply={(msgId, content) => setReplyToMessage({ id: msgId, content })}
                onRetry={async (msgId) => {
                  const msg = messages.find((m: any) => m.id === msgId);
                  if (msg) {
                    await handleSendMessage(msg.content, msg.type, msg.metadata);
                    removeFromQueue(msgId);
                  }
                }}
                isGroup={conversation.type === "group"}
                showSenderInfo={showSenderInfo}
                senderName={message.sender?.full_name || message.sender?.username || "Usuário"}
                senderAvatar={message.sender?.avatar_url}
                senderId={message.sender_id}
                onOpenProfile={handleOpenProfile}
                onSendMessage={handleSendPrivateMessage}
                onAudioCall={handleAudioCallFromMenu}
                onVideoCall={handleVideoCallFromMenu}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
        <TypingIndicator users={typingUsers} />
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        conversationId={id}
        onTyping={setTyping}
        replyTo={replyToMessage}
        onCancelReply={() => setReplyToMessage(null)}
      />

      {/* Dialog de perfil */}
      <ProfileViewDialog
        open={profileDialogOpen}
        onClose={() => {
          setProfileDialogOpen(false);
          setSelectedProfile(null);
        }}
        name={selectedProfile?.name || ''}
        avatarUrl={selectedProfile?.avatar}
        bio={selectedProfile?.bio}
        isGroup={false}
      />
    </div>
  );
};

export default Chat;
