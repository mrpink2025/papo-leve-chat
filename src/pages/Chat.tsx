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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyToMessage, setReplyToMessage] = useState<{ id: string; content: string } | null>(null);
  const [showSearch, setShowSearch] = useState(false);

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
    </div>
  );
};

export default Chat;
