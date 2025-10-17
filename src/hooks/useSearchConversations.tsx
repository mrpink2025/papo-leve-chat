import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "./useConversations";

export const useSearchConversations = (
  userId: string | undefined,
  searchText: string,
  includeArchived = false
) => {
  return useQuery({
    queryKey: ["search-conversations", userId, searchText, includeArchived],
    queryFn: async () => {
      if (!userId || !searchText || searchText.trim().length === 0) return [];

      const { data, error } = await supabase.rpc("search_conversations", {
        p_user_id: userId,
        p_search_text: searchText.trim(),
        p_include_archived: includeArchived,
      });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data.map((row: any) => {
        const isMuted = row.muted || (row.muted_until && new Date(row.muted_until) > new Date());
        
        return {
          id: row.conversation_id,
          type: row.conversation_type,
          name: row.conversation_name,
          avatar_url: row.conversation_avatar_url,
          updated_at: row.conversation_updated_at,
          archived: row.archived,
          pinned: row.pinned,
          muted: isMuted,
          muted_until: row.muted_until,
          last_message: row.last_message_content
            ? {
                content: row.last_message_content,
                created_at: row.last_message_created_at,
              }
            : null,
          unread_count: Number(row.unread_count) || 0,
          member_count: row.conversation_type === "group" ? Number(row.member_count) : undefined,
          other_participant:
            row.conversation_type === "direct" && row.other_user_id
              ? {
                  id: row.other_user_id,
                  username: row.other_username,
                  full_name: row.other_full_name,
                  avatar_url: row.other_avatar_url,
                  status: row.other_status,
                  bio: row.other_bio,
                }
              : null,
          match_rank: row.match_rank,
        } as Conversation & { match_rank: number };
      });
    },
    enabled: !!userId && !!searchText && searchText.trim().length > 0,
    staleTime: 10000, // Cache por 10s
  });
};
