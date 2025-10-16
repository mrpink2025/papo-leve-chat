import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
  updated_at: string;
  archived?: boolean;
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count?: number;
  other_participant?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    status: string;
  };
}

export const useConversations = (userId: string | undefined, includeArchived = false) => {
  return useQuery({
    queryKey: ["conversations", userId, includeArchived],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          last_read_at,
          archived,
          conversations (
            id,
            type,
            name,
            avatar_url,
            updated_at
          )
        `)
        .eq("user_id", userId);

      if (!includeArchived) {
        query = query.eq("archived", false);
      }

      const { data: participations, error } = await query;

      if (error) throw error;

      const conversations = await Promise.all(
        participations.map(async (p: any) => {
          const conversation = p.conversations;

          // Get last message
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conversation.id)
            .gt("created_at", p.last_read_at || "1970-01-01");

          // For direct conversations, get other participant
          let otherParticipant = null;
          if (conversation.type === "direct") {
            const { data: participants } = await supabase
              .from("conversation_participants")
              .select(`
                user_id,
                profiles (
                  id,
                  username,
                  full_name,
                  avatar_url,
                  status
                )
              `)
              .eq("conversation_id", conversation.id)
              .neq("user_id", userId);

            if (participants && participants.length > 0) {
              otherParticipant = participants[0].profiles;
            }
          }

          return {
            ...conversation,
            archived: p.archived,
            last_message: lastMessage,
            unread_count: count || 0,
            other_participant: otherParticipant,
          };
        })
      );

      return conversations.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    },
    enabled: !!userId,
  });
};
