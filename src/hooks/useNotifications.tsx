import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useNotifications = (userId: string | undefined) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const message = payload.new as any;

          // Don't notify for own messages
          if (message.sender_id === userId) return;

          // Check if user is in this conversation
          const { data: participation } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("conversation_id", message.conversation_id)
            .eq("user_id", userId)
            .single();

          if (!participation) return;

          // Fetch sender profile
          const { data: sender } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", message.sender_id)
            .single();

          const senderName = sender?.full_name || sender?.username || "Alguém";

          // Show browser notification if permission granted
          if (Notification.permission === "granted") {
            new Notification(`Nova mensagem de ${senderName}`, {
              body: message.content.substring(0, 100),
              icon: "/favicon.ico",
              tag: message.conversation_id,
            });
          }

          // Show toast notification
          toast({
            title: `${senderName}`,
            description: message.content.substring(0, 100),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  const requestPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  };

  return { requestPermission };
};
