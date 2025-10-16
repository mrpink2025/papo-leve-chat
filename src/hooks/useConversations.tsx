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

      // Fetch participations without embed
      let query = supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at, archived")
        .eq("user_id", userId);

      if (!includeArchived) {
        query = query.eq("archived", false);
      }

      const { data: participations, error } = await query;
      if (error) throw error;
      if (!participations || participations.length === 0) return [];

      // Fetch conversations separately
      const convIds = [...new Set(participations.map((p) => p.conversation_id))];
      const { data: conversations, error: convsError } = await supabase
        .from("conversations")
        .select("id, type, name, avatar_url, updated_at")
        .in("id", convIds);

      if (convsError) throw convsError;

      const convById = new Map(conversations?.map((c) => [c.id, c]) || []);

      // For direct conversations, fetch other participants
      const { data: allParticipants, error: partsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds);

      if (partsError) throw partsError;

      const otherUserIds = [
        ...new Set(
          allParticipants
            ?.filter((p) => p.user_id !== userId)
            .map((p) => p.user_id) || []
        ),
      ];

      const { data: otherProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, status")
        .in("id", otherUserIds);

      if (profilesError) throw profilesError;

      const profileById = new Map(otherProfiles?.map((p) => [p.id, p]) || []);
      const convIdToOtherUserId = new Map(
        allParticipants
          ?.filter((p) => p.user_id !== userId)
          .map((p) => [p.conversation_id, p.user_id]) || []
      );

      const enrichedConversations = await Promise.all(
        participations.map(async (p: any) => {
          const conversation = convById.get(p.conversation_id);
          if (!conversation) return null;

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
            const otherUserId = convIdToOtherUserId.get(conversation.id);
            if (otherUserId) {
              otherParticipant = profileById.get(otherUserId) || null;
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

      return enrichedConversations
        .filter((c) => c !== null)
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    },
    enabled: !!userId,
  });
};
