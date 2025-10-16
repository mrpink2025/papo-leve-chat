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
  
  // Batching and throttle refs
  const pendingReadIdsRef = useRef<Set<string>>(new Set());
  const flushReadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Batch flush of pending "read" IDs
  const flushPendingReads = async () => {
    if (!conversationId || !userId) return;
    const ids = Array.from(pendingReadIdsRef.current);
    pendingReadIdsRef.current.clear();
    if (ids.length === 0) return;

    // Only upsert what isn't already "read"
    const toUpsert = ids
      .filter(id => messageStatuses[id] !== "read")
      .map(id => ({
        message_id: id,
        user_id: userId,
        status: "read",
        timestamp: new Date().toISOString(),
      }));

    if (toUpsert.length === 0) return;

    try {
      await supabase.from("message_status").upsert(toUpsert, { onConflict: "message_id,user_id" });
      scheduleLastReadUpdate();
    } catch (error: any) {
      if (error?.code !== "23505" && !String(error?.message || "").includes("409")) {
        console.error("[useMessageStatus] Error batch marking as read:", error);
      }
    }
  };

  // Enqueue message ID and trigger debounced batch flush
  const markAsRead = (messageId: string) => {
    if (!userId) return;
    if (messageStatuses[messageId] === "read") return;

    pendingReadIdsRef.current.add(messageId);

    if (flushReadTimerRef.current) clearTimeout(flushReadTimerRef.current);
    flushReadTimerRef.current = setTimeout(() => {
      flushPendingReads();
    }, 200);
  };

  // Fetch message statuses limited to current conversation with throttle
  useEffect(() => {
    if (!conversationId || !userId) return;

    const fetchStatuses = async () => {
      // Get message IDs from cache for current conversation only
      const cached = queryClient.getQueriesData<any[]>({ queryKey: ["messages", conversationId] });
      const idsSet = new Set<string>();
      cached.forEach(([, arr]) => (arr || []).forEach((m: any) => idsSet.add(m.id)));
      const idList = Array.from(idsSet);

      if (idList.length === 0) {
        setMessageStatuses({});
        return;
      }

      const { data, error } = await supabase
        .from("message_status")
        .select("message_id, status")
        .eq("user_id", userId)
        .in("message_id", idList);

      if (error) {
        console.error("[useMessageStatus] fetchStatuses error:", error);
        return;
      }

      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.message_id] = s.status; });
      setMessageStatuses(map);
    };

    const scheduleStatusRefresh = () => {
      if (statusRefreshTimerRef.current) clearTimeout(statusRefreshTimerRef.current);
      statusRefreshTimerRef.current = setTimeout(fetchStatuses, 600);
    };

    // Initial fetch
    fetchStatuses();

    // Subscribe to status changes with throttle
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
        () => { scheduleStatusRefresh(); }
      )
      .subscribe();

    return () => {
      if (statusRefreshTimerRef.current) clearTimeout(statusRefreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, queryClient]);

  const getMessageStatus = (messageId: string): "sending" | "sent" | "read" | "error" => {
    return (messageStatuses[messageId] as any) || "sent";
  };

  return { markAsRead, getMessageStatus };
};
