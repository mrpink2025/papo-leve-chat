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
  member_count?: number;
  other_participant?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    status: string;
    bio?: string | null;
  };
}

export const useConversations = (userId: string | undefined, includeArchived = false) => {
  return useQuery({
    queryKey: ["conversations", userId, includeArchived],
    queryFn: async () => {
      if (!userId) return [];

      // Usar RPC function otimizada - 1 query em vez de 150+
      const { data, error } = await supabase.rpc("get_user_conversations", {
        p_user_id: userId,
        p_include_archived: includeArchived,
      });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Mapear resultado da RPC para formato esperado
      return data.map((row: any) => ({
        id: row.conversation_id,
        type: row.conversation_type,
        name: row.conversation_name,
        avatar_url: row.conversation_avatar_url,
        updated_at: row.conversation_updated_at,
        archived: row.archived,
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
      }));
    },
    enabled: !!userId,
    staleTime: 30000, // Cache por 30s
  });
};
