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
        .select(
          `
            id,
            conversation_id,
            caller_id,
            call_type,
            status,
            started_at,
            ended_at,
            duration_seconds
          `
        )
        .or(`caller_id.eq.${userId},user_id.eq.${userId}`)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const calls = (data || []) as any[];
      if (calls.length === 0) return [] as CallHistoryItem[];

      const callerIds = Array.from(new Set(calls.map((c) => c.caller_id).filter(Boolean)));
      const convIds = Array.from(new Set(calls.map((c) => c.conversation_id).filter(Boolean)));

      const [profilesRes, convsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", callerIds.length ? callerIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase
          .from("conversations")
          .select("id, name")
          .in("id", convIds.length ? convIds : ["00000000-0000-0000-0000-000000000000"]),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (convsRes.error) throw convsRes.error;

      const profilesById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const convNameById = new Map((convsRes.data || []).map((c: any) => [c.id, c.name]));

      return calls.map((call: any) => ({
        id: call.id,
        conversation_id: call.conversation_id,
        caller_id: call.caller_id,
        call_type: call.call_type,
        status: call.status,
        started_at: call.started_at,
        ended_at: call.ended_at,
        duration_seconds: call.duration_seconds,
        caller: profilesById.get(call.caller_id) || null,
        conversation_name: convNameById.get(call.conversation_id) || null,
      })) as CallHistoryItem[];

    },
    enabled: !!userId,
    staleTime: 30000, // 30s
  });
};
