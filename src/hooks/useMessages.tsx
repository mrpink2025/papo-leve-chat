import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNotifications } from "./useNotifications";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: string;
  created_at: string;
  metadata?: any;
  edited?: boolean;
  reply_to?: string;
  sender?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

const MESSAGES_PER_PAGE = 50;

export const useMessages = (conversationId: string | undefined, userId: string | undefined) => {
  const queryClient = useQueryClient();
  const { sendNotification } = useNotifications();
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ["messages", conversationId, page],
    queryFn: async () => {
      if (!conversationId) return [];

      const start = page * MESSAGES_PER_PAGE;
      const end = start + MESSAGES_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw error;

      // Fetch sender profiles separately
      const messagesWithSenders = await Promise.all(
        data.map(async (msg: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .eq("id", msg.sender_id)
            .single();

          return {
            ...msg,
            sender: profile,
          };
        })
      );

      return messagesWithSenders.reverse();
    },
    enabled: !!conversationId,
  });

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .eq("id", newMessage.sender_id)
            .single();

          const messageWithSender = {
            ...newMessage,
            sender: profile,
          };

          queryClient.setQueryData(
            ["messages", conversationId, 0],
            (old: Message[] = []) => [...old, messageWithSender]
          );

          // Send notification if message is from another user
          if (newMessage.sender_id !== userId && document.hidden) {
            const senderName = profile?.full_name || profile?.username || "Alguém";
            sendNotification(
              senderName,
              newMessage.content,
              profile?.avatar_url
            );
          }

          // Mark message as delivered
          if (newMessage.sender_id !== userId) {
            setTimeout(async () => {
              if (!userId) return;
              
              try {
                await supabase
                  .from("message_status")
                  .upsert(
                    {
                      message_id: newMessage.id,
                      user_id: userId,
                      status: "delivered",
                      timestamp: new Date().toISOString(),
                    },
                    { onConflict: "message_id,user_id" }
                  );
              } catch (error: any) {
                // Ignore 409 conflicts - record already exists
                if (error?.code !== '23505' && !error?.message?.includes('409')) {
                  console.error('[useMessages] Error marking delivered:', error);
                }
              }
            }, 0);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          
          // If message was deleted, remove from cache
          if (updatedMessage.deleted) {
            queryClient.setQueryData(
              ["messages", conversationId, 0],
              (old: Message[] = []) => old.filter(msg => msg.id !== updatedMessage.id)
            );
          } else {
            // Otherwise update the message
            queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, userId, sendNotification]);

  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      type = "text",
      metadata,
      reply_to,
    }: {
      content: string;
      type?: string;
      metadata?: any;
      reply_to?: string;
    }) => {
      if (!conversationId || !userId) throw new Error("Missing data");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          type,
          metadata,
          reply_to,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Create sent status
      await supabase
        .from("message_status")
        .upsert(
          {
            message_id: data.id,
            user_id: userId,
            status: "sent",
            timestamp: new Date().toISOString(),
          },
          { onConflict: "message_id,user_id" }
        );

      return data;
    },
  });

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    hasNextPage: (query.data || []).length === MESSAGES_PER_PAGE,
    loadMore,
    sendMessage: sendMessage.mutateAsync,
  };
};
