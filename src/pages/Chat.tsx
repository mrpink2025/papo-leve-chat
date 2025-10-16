import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import ChatHeader from "@/components/ChatHeader";
import MessageBubble from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";
import TypingIndicator from "@/components/TypingIndicator";
import { VideoCallDialog } from "@/components/VideoCallDialog";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useVideoCall } from "@/hooks/useVideoCall";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  const { messages, sendMessage } = useMessages(id, user?.id);
  const { typingUsers, setTyping } = useTypingIndicator(id || "", user?.id || "");
  const { editMessage, deleteMessage } = useMessageActions(id || "");
  const { callState, startCall, endCall } = useVideoCall();
  const { trackEvent } = useAnalytics();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      await sendMessage({ content, type, metadata });
      trackEvent({ eventType: 'message_sent', eventData: { conversationId: id, type } });
    } catch (error) {
      console.error("Error sending message:", error);
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
        onVideoCall={() => {
          if (id) {
            startCall(id, true);
            trackEvent({ eventType: 'video_call_started', eventData: { conversationId: id } });
          }
        }}
        onAudioCall={() => {
          if (id) {
            startCall(id, false);
            trackEvent({ eventType: 'audio_call_started', eventData: { conversationId: id } });
          }
        }}
      />

      <VideoCallDialog
        open={callState.isInCall}
        onClose={endCall}
        roomName={callState.roomName || ""}
        displayName={user?.email?.split('@')[0] || "Usuário"}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-chat-pattern">
        {messages.map((message: any) => (
          <MessageBubble
            key={message.id}
            id={message.id}
            content={message.content}
            timestamp={new Date(message.created_at)}
            isSent={message.sender_id === user?.id}
            isRead={false}
            type={message.type}
            metadata={message.metadata}
            edited={message.edited}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
          />
        ))}
        <div ref={messagesEndRef} />
        <TypingIndicator users={typingUsers} />
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        conversationId={id}
        onTyping={setTyping}
      />
    </div>
  );
};

export default Chat;
