import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useMessages = (conversationId: string | undefined, userId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          type,
          created_at,
          profiles:sender_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("conversation_id", conversationId)
        .eq("deleted", false)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data.map((msg: any) => ({
        ...msg,
        sender: msg.profiles,
      }));
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
            ["messages", conversationId],
            (old: Message[] = []) => [...old, messageWithSender]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId || !userId) throw new Error("Missing data");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          type: "text",
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return data;
    },
  });

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    sendMessage: sendMessage.mutateAsync,
  };
};
