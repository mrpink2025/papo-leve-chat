import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const useTypingIndicator = (
  conversationId: string | undefined,
  userId: string | undefined
) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const typingData = payload.new as any;
            if (typingData.user_id !== userId && typingData.is_typing) {
              // Fetch user profile
              const { data: profile } = await supabase
                .from("profiles")
                .select("username, full_name")
                .eq("id", typingData.user_id)
                .single();

              if (profile) {
                const displayName = profile.full_name || profile.username;
                setTypingUsers((prev) => {
                  if (!prev.includes(displayName)) {
                    return [...prev, displayName];
                  }
                  return prev;
                });
              }
            }
          } else if (payload.eventType === "DELETE") {
            const typingData = payload.old as any;
            // Fetch user profile to remove
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, full_name")
              .eq("id", typingData.user_id)
              .single();

            if (profile) {
              const displayName = profile.full_name || profile.username;
              setTypingUsers((prev) => prev.filter((name) => name !== displayName));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const setTyping = async (isTyping: boolean) => {
    if (!conversationId || !userId) return;

    if (isTyping) {
      await supabase
        .from("typing_indicators")
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          is_typing: true,
          updated_at: new Date().toISOString(),
        });
    } else {
      await supabase
        .from("typing_indicators")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);
    }
  };

  return { typingUsers, setTyping };
};
