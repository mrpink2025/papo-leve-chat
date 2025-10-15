import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChatHeaderProps {
  name: string;
  avatar?: string;
  online?: boolean;
  lastSeen?: string;
}

const ChatHeader = ({ name, avatar, online = false, lastSeen }: ChatHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="bg-chat-header text-chat-header-foreground px-4 py-3 flex items-center justify-between shadow-chat">
      <div className="flex items-center gap-3 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="text-chat-header-foreground hover:bg-chat-header-foreground/10"
        >
          <ArrowLeft size={20} />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary-foreground text-primary">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold text-sm">{name}</h2>
          <p className="text-xs text-chat-header-foreground/80">
            {online ? "online" : lastSeen}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-chat-header-foreground hover:bg-chat-header-foreground/10"
        >
          <Video size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-chat-header-foreground hover:bg-chat-header-foreground/10"
        >
          <Phone size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-chat-header-foreground hover:bg-chat-header-foreground/10"
        >
          <MoreVertical size={20} />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;
