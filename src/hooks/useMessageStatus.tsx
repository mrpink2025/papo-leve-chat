import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const useMessageStatus = (
  conversationId: string | undefined,
  userId: string | undefined
) => {
  const queryClient = useQueryClient();
  const [messageStatuses, setMessageStatuses] = useState<Record<string, string>>({});
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
            .upsert(
              {
                message_id: message.id,
                user_id: userId,
                status: "delivered",
              },
              { onConflict: 'message_id,user_id' }
            );
        }
      }
    };

    markAsDelivered();
  }, [conversationId, userId]);

  const markAsRead = async (messageId: string) => {
    if (!userId) return;

    await supabase
      .from("message_status")
      .upsert(
        {
          message_id: messageId,
          user_id: userId,
          status: "read",
        },
        { onConflict: 'message_id,user_id' }
      );

    // Update last_read_at for the conversation
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);
  };

  // Fetch message statuses
  useEffect(() => {
    if (!conversationId || !userId) return;

    const fetchStatuses = async () => {
      const { data } = await supabase
        .from("message_status")
        .select("message_id, status")
        .eq("user_id", userId);

      if (data) {
        const statusMap: Record<string, string> = {};
        data.forEach((s) => {
          statusMap[s.message_id] = s.status;
        });
        setMessageStatuses(statusMap);
      }
    };

    fetchStatuses();

    // Subscribe to status changes
    const channel = supabase
      .channel(`message_status:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_status",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const getMessageStatus = (messageId: string): "sending" | "sent" | "read" | "error" => {
    return (messageStatuses[messageId] as any) || "sent";
  };

  return { markAsRead, getMessageStatus };
};
