import { Copy, Forward, Star, Info, Flag, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";

interface MessageContextMenuProps {
  children: React.ReactNode;
  messageId: string;
  content: string;
  isSent: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
  onForward?: () => void;
  onStar?: () => void;
  onInfo?: () => void;
  onReport?: () => void;
}

export const MessageContextMenu = ({
  children,
  messageId,
  content,
  isSent,
  onEdit,
  onDelete,
  onReply,
  onForward,
  onStar,
  onInfo,
  onReport,
}: MessageContextMenuProps) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copiado",
      description: "Mensagem copiada para a área de transferência",
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {onReply && (
          <ContextMenuItem onClick={onReply} className="cursor-pointer">
            <Forward size={16} className="mr-2" />
            Responder
          </ContextMenuItem>
        )}
        
        <ContextMenuItem onClick={handleCopy} className="cursor-pointer">
          <Copy size={16} className="mr-2" />
          Copiar
        </ContextMenuItem>

        {onForward && (
          <ContextMenuItem onClick={onForward} className="cursor-pointer">
            <Forward size={16} className="mr-2" />
            Encaminhar
          </ContextMenuItem>
        )}

        {onStar && (
          <ContextMenuItem onClick={onStar} className="cursor-pointer">
            <Star size={16} className="mr-2" />
            Favoritar
          </ContextMenuItem>
        )}

        {onInfo && (
          <ContextMenuItem onClick={onInfo} className="cursor-pointer">
            <Info size={16} className="mr-2" />
            Info da mensagem
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {isSent && onEdit && (
          <ContextMenuItem onClick={onEdit} className="cursor-pointer">
            Editar
          </ContextMenuItem>
        )}

        {isSent && onDelete && (
          <ContextMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
            <Trash2 size={16} className="mr-2" />
            Apagar
          </ContextMenuItem>
        )}

        {!isSent && onReport && (
          <ContextMenuItem onClick={onReport} className="cursor-pointer text-destructive">
            <Flag size={16} className="mr-2" />
            Denunciar
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
