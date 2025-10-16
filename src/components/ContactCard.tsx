import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, Phone, Video, Star, Ban, Trash2, MoreVertical, User } from "lucide-react";
import { Contact } from "@/hooks/useContacts";

interface ContactCardProps {
  contact: Contact;
  onSendMessage: () => void;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onToggleFavorite: () => void;
  onToggleBlock: () => void;
  onRemove: () => void;
  onViewProfile: () => void;
}

export const ContactCard = ({
  contact,
  onSendMessage,
  onAudioCall,
  onVideoCall,
  onToggleFavorite,
  onToggleBlock,
  onRemove,
  onViewProfile,
}: ContactCardProps) => {
  const displayName = contact.nickname || contact.contact.full_name || contact.contact.username;
  const isOnline = contact.contact.status === "online";

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Avatar className="h-12 w-12">
        <AvatarImage src={contact.contact.avatar_url} />
        <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {contact.favorite && <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
          {contact.blocked && <Ban className="h-4 w-4 text-destructive" />}
          <h3 className="font-semibold truncate">{displayName}</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>@{contact.contact.username}</span>
          {isOnline && (
            <>
              <span>•</span>
              <span className="text-green-500">Online</span>
            </>
          )}
        </div>
        {contact.contact.bio && (
          <p className="text-sm text-muted-foreground truncate">{contact.contact.bio}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSendMessage}
          disabled={contact.blocked}
          title="Enviar mensagem"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onAudioCall}
          disabled={contact.blocked}
          title="Chamada de áudio"
        >
          <Phone className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onVideoCall}
          disabled={contact.blocked}
          title="Chamada de vídeo"
        >
          <Video className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="Mais opções">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewProfile}>
              <User className="h-4 w-4 mr-2" />
              Ver Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFavorite}>
              <Star className="h-4 w-4 mr-2" />
              {contact.favorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleBlock}>
              <Ban className="h-4 w-4 mr-2" />
              {contact.blocked ? "Desbloquear" : "Bloquear"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Remover Contato
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
