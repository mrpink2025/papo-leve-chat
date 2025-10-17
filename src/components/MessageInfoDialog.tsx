import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCheck } from "lucide-react";
import { format } from "date-fns";

interface MessageInfoDialogProps {
  messageId: string;
  open: boolean;
  onClose: () => void;
}

export const MessageInfoDialog = ({ messageId, open, onClose }: MessageInfoDialogProps) => {
  const { data: messageInfo } = useQuery({
    queryKey: ["message-info", messageId],
    queryFn: async () => {
      // Buscar status de leitura
      const { data: statuses } = await supabase
        .from("message_status")
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("message_id", messageId)
        .order("timestamp", { ascending: false });

      return statuses || [];
    },
    enabled: open && !!messageId,
  });

  const readBy = messageInfo?.filter((s: any) => s.status === "read") || [];
  const deliveredTo = messageInfo?.filter((s: any) => s.status === "delivered") || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Info da mensagem</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Lido por */}
            {readBy.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  <CheckCheck size={16} className="text-blue-500" />
                  <span className="font-medium">Lido por {readBy.length}</span>
                </div>
                <div className="space-y-2">
                  {readBy.map((status: any) => (
                    <div key={status.id} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={status.profiles?.avatar_url} />
                        <AvatarFallback>
                          {status.profiles?.full_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {status.profiles?.full_name || status.profiles?.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(status.timestamp), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entregue a */}
            {deliveredTo.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  <CheckCheck size={16} />
                  <span className="font-medium">Entregue a {deliveredTo.length}</span>
                </div>
                <div className="space-y-2">
                  {deliveredTo.map((status: any) => (
                    <div key={status.id} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={status.profiles?.avatar_url} />
                        <AvatarFallback>
                          {status.profiles?.full_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {status.profiles?.full_name || status.profiles?.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(status.timestamp), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!readBy.length && !deliveredTo.length) && (
              <p className="text-center text-muted-foreground py-8">
                Sem informações de entrega disponíveis
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
