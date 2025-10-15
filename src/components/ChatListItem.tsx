import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatListItemProps {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: Date;
  unread?: number;
  online?: boolean;
  onClick: () => void;
}

const ChatListItem = ({
  name,
  avatar,
  lastMessage,
  timestamp,
  unread = 0,
  online = false,
  onClick,
}: ChatListItemProps) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-4 hover:bg-secondary cursor-pointer transition-colors border-b border-border animate-fade-in"
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-card" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-foreground truncate">{name}</h3>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(timestamp, { locale: ptBR, addSuffix: true })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
          {unread > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
              {unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListItem;
