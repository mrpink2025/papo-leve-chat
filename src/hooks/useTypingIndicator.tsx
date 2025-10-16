import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useTypingIndicator = (
  conversationId: string | undefined,
  userId: string | undefined
) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Query to get typing users
  const { data: typingData } = useQuery({
    queryKey: ["typing", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("typing_indicators")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .eq("is_typing", true)
        .neq("user_id", userId);

      if (error) {
        console.error("Error fetching typing indicators:", error);
        return [];
      }

      // Fetch profiles separately
      if (!data || data.length === 0) return [];

      const userNames = await Promise.all(
        data.map(async (indicator) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", indicator.user_id)
            .single();

          return profile ? profile.full_name || profile.username : null;
        })
      );

      return userNames.filter(Boolean);
    },
    enabled: !!conversationId && !!userId,
    refetchInterval: 3000,
  });

  // Update typing users from query
  useEffect(() => {
    if (typingData) {
      setTypingUsers(typingData as string[]);
    }
  }, [typingData]);

  // Subscribe to real-time typing indicators
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
            const newTyping = payload.new as any;
            if (newTyping.user_id !== userId && newTyping.is_typing) {
              // Fetch user profile
              const { data: profile } = await supabase
                .from("profiles")
                .select("username, full_name")
                .eq("id", newTyping.user_id)
                .single();

              if (profile) {
                const name = profile.full_name || profile.username;
                setTypingUsers((prev) => {
                  if (!prev.includes(name)) {
                    return [...prev, name];
                  }
                  return prev;
                });
              }
            }
          } else if (payload.eventType === "DELETE") {
            const oldTyping = payload.old as any;
            // Remove from typing users
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, full_name")
              .eq("id", oldTyping.user_id)
              .single();

            if (profile) {
              const name = profile.full_name || profile.username;
              setTypingUsers((prev) => prev.filter((u) => u !== name));
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

    try {
      if (isTyping) {
        // Upsert typing indicator
        await supabase.from("typing_indicators").upsert(
          {
            conversation_id: conversationId,
            user_id: userId,
            is_typing: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "conversation_id,user_id" }
        );

        // Clear existing timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Auto-remove after 5 seconds
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 5000);
      } else {
        // Remove typing indicator
        await supabase
          .from("typing_indicators")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("user_id", userId);
      }
    } catch (error) {
      console.error("Error setting typing:", error);
    }
  };

  return {
    typingUsers,
    setTyping,
  };
};
