import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CallHistoryItem {
  id: string;
  conversation_id: string;
  caller_id: string;
  call_type: 'audio' | 'video';
  status: 'ringing' | 'answered' | 'rejected' | 'missed' | 'ended';
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  caller: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  conversation_name: string | null;
}

export const useCallHistory = (userId: string | undefined, limit = 10) => {
  return useQuery({
    queryKey: ["call-history", userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("call_notifications")
        .select(`
          id,
          conversation_id,
          caller_id,
          call_type,
          status,
          started_at,
          ended_at,
          duration_seconds,
          caller:profiles!call_notifications_caller_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          ),
          conversation:conversations(name)
        `)
        .or(`caller_id.eq.${userId},user_id.eq.${userId}`)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((call: any) => ({
        id: call.id,
        conversation_id: call.conversation_id,
        caller_id: call.caller_id,
        call_type: call.call_type,
        status: call.status,
        started_at: call.started_at,
        ended_at: call.ended_at,
        duration_seconds: call.duration_seconds,
        caller: call.caller,
        conversation_name: call.conversation?.name || null,
      })) as CallHistoryItem[];
    },
    enabled: !!userId,
    staleTime: 30000, // 30s
  });
};
