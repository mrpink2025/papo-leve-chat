import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMessageStatus = (
  conversationId: string | undefined,
  userId: string | undefined
) => {
  // Mark messages as delivered when viewing conversation
  useEffect(() => {
    if (!conversationId || !userId) return;

    const markAsDelivered = async () => {
      // Get undelivered messages
      const { data: messages } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .neq("sender_id", userId);

      if (messages && messages.length > 0) {
        for (const message of messages) {
          await supabase
            .from("message_status")
            .upsert({
              message_id: message.id,
              user_id: userId,
              status: "delivered",
            });
        }
      }
    };

    markAsDelivered();
  }, [conversationId, userId]);

  const markAsRead = async (messageId: string) => {
    if (!userId) return;

    await supabase
      .from("message_status")
      .upsert({
        message_id: messageId,
        user_id: userId,
        status: "read",
      });

    // Update last_read_at for the conversation
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);
  };

  return { markAsRead };
};
