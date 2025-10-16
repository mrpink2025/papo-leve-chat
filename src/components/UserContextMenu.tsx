// Signed by Mr_Pink — Nosso Papo (nossopapo.net)

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer hover:opacity-80 transition-opacity">
          {children}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {onOpenProfile && (
          <DropdownMenuItem onClick={onOpenProfile}>
            <User className="mr-2 h-4 w-4" />
            Ver Perfil
          </DropdownMenuItem>
        )}
        {onSendMessage && (
          <DropdownMenuItem onClick={onSendMessage}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Mensagem Privada
          </DropdownMenuItem>
        )}
        {onAudioCall && (
          <DropdownMenuItem onClick={onAudioCall}>
            <Phone className="mr-2 h-4 w-4" />
            Chamada de Áudio
          </DropdownMenuItem>
        )}
        {onVideoCall && (
          <DropdownMenuItem onClick={onVideoCall}>
            <Video className="mr-2 h-4 w-4" />
            Chamada de Vídeo
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
