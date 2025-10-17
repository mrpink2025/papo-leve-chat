import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useGroupJoinedAt = (conversationId: string | undefined, userId: string | undefined) => {
  return useQuery({
    queryKey: ["group-joined-at", conversationId, userId],
    queryFn: async () => {
      if (!conversationId || !userId) return null;

      // Buscar o joined_at do usuário
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("joined_at, joined_at_history, conversation_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .is("left_at", null)
        .single();

      if (error || !data) return null;

      // Retornar joined_at_history se existir, senão joined_at
      return data.joined_at_history || data.joined_at;
    },
    enabled: !!conversationId && !!userId,
  });
};
