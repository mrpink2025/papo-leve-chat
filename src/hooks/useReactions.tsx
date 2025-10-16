import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export const useReactions = (messageId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch reactions for a message
  const { data: reactions = [], isLoading } = useQuery({
    queryKey: ["reactions", messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .eq("message_id", messageId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Reaction[];
    },
    enabled: !!messageId,
  });

  // Real-time subscription for reactions
  useEffect(() => {
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["reactions", messageId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, queryClient]);

  // Add reaction
  const addReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reactions", messageId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar reação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove reaction
  const removeReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reactions", messageId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover reação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return {
    reactions,
    groupedReactions,
    isLoading,
    addReaction: addReactionMutation.mutate,
    removeReaction: removeReactionMutation.mutate,
  };
};
