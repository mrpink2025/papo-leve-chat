import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useMessageActions = (conversationId: string) => {
  const queryClient = useQueryClient();

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase
        .from("messages")
        .update({ content, edited: true, updated_at: new Date().toISOString() })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Mensagem editada");
    },
    onError: () => {
      toast.error("Erro ao editar mensagem");
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ deleted: true, content: "Mensagem apagada" })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Mensagem apagada");
    },
    onError: () => {
      toast.error("Erro ao apagar mensagem");
    },
  });

  return {
    editMessage: editMessage.mutateAsync,
    deleteMessage: deleteMessage.mutateAsync,
  };
};
