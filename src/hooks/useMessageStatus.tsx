import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const useMessageStatus = (
  conversationId: string | undefined,
  userId: string | undefined
) => {
  const queryClient = useQueryClient();
  const [messageStatuses, setMessageStatuses] = useState<Record<string, string>>({});
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mark messages as delivered when viewing conversation
  useEffect(() => {
    if (!conversationId || !userId) return;

    const markAsDelivered = async () => {
      try {
        // Get undelivered messages
        const { data: messages } = await supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", conversationId)
          .neq("sender_id", userId);

        if (messages && messages.length > 0) {
          // Filter only messages that aren't already delivered or read
          const toMark = messages.filter(msg => {
            const status = messageStatuses[msg.id];
            return status !== "delivered" && status !== "read";
          });

          if (toMark.length > 0) {
            // Batch upsert with conflict resolution
            const updates = toMark.map(msg => ({
              message_id: msg.id,
              user_id: userId,
              status: "delivered",
              timestamp: new Date().toISOString(),
            }));

            await supabase
              .from("message_status")
              .upsert(updates, { onConflict: 'message_id,user_id' });
          }
        }
      } catch (error: any) {
        // Ignore 409 conflicts - they mean the record already exists
        if (error?.code !== '23505' && !error?.message?.includes('409')) {
          console.error('[useMessageStatus] Error marking as delivered:', error);
        }
      }
    };

    markAsDelivered();
  }, [conversationId, userId, messageStatuses]);

  const scheduleLastReadUpdate = () => {
    if (!conversationId || !userId) return;
    
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    
    updateTimerRef.current = setTimeout(async () => {
      try {
        await supabase
          .from("conversation_participants")
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .eq("user_id", userId);
      } catch (error) {
        console.error('[useMessageStatus] Error updating last_read_at:', error);
      }
    }, 1500);
  };

  const markAsRead = async (messageId: string) => {
    if (!userId) return;

    // Skip if already read
    if (messageStatuses[messageId] === "read") {
      return;
    }

    try {
      await supabase
        .from("message_status")
        .upsert(
          {
            message_id: messageId,
            user_id: userId,
            status: "read",
            timestamp: new Date().toISOString(),
          },
          { onConflict: 'message_id,user_id' }
        );

      // Schedule debounced update of last_read_at
      scheduleLastReadUpdate();
    } catch (error: any) {
      // Ignore 409 conflicts
      if (error?.code !== '23505' && !error?.message?.includes('409')) {
        console.error('[useMessageStatus] Error marking as read:', error);
      }
    }
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
