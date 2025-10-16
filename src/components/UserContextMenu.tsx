// Signed by Mr_Pink — Nosso Papo (nossopapo.net)

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { User, MessageSquare, Phone, Video } from "lucide-react";

interface UserContextMenuProps {
  children: React.ReactNode;
  userId: string;
  userName: string;
  isCurrentUser?: boolean;
  onOpenProfile?: () => void;
  onSendMessage?: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
}

export const UserContextMenu = ({
  children,
  userId,
  userName,
  isCurrentUser = false,
  onOpenProfile,
  onSendMessage,
  onAudioCall,
  onVideoCall,
}: UserContextMenuProps) => {
  // Não mostrar menu para o próprio usuário
  if (isCurrentUser) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="cursor-pointer hover:opacity-80 transition-opacity">
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {onOpenProfile && (
          <ContextMenuItem onClick={onOpenProfile}>
            <User className="mr-2 h-4 w-4" />
            Ver Perfil
          </ContextMenuItem>
        )}
        {onSendMessage && (
          <ContextMenuItem onClick={onSendMessage}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Mensagem Privada
          </ContextMenuItem>
        )}
        {onAudioCall && (
          <ContextMenuItem onClick={onAudioCall}>
            <Phone className="mr-2 h-4 w-4" />
            Chamada de Áudio
          </ContextMenuItem>
        )}
        {onVideoCall && (
          <ContextMenuItem onClick={onVideoCall}>
            <Video className="mr-2 h-4 w-4" />
            Chamada de Vídeo
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
