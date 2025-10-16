import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChatHeaderProps {
  name: string;
  avatar?: string;
  online?: boolean;
  lastSeen?: string;
  onVideoCall?: () => void;
  onAudioCall?: () => void;
}

const ChatHeader = ({ name, avatar, online = false, lastSeen, onVideoCall, onAudioCall }: ChatHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="bg-chat-header text-chat-header-foreground px-4 py-3 flex items-center justify-between shadow-chat border-b border-border/50">
      <div className="flex items-center gap-3 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="text-chat-header-foreground hover:bg-secondary/50"
        >
          <ArrowLeft size={20} />
        </Button>
        <Avatar className="h-10 w-10 ring-1 ring-border/50">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary/20 text-foreground">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold text-sm">{name}</h2>
          <p className="text-xs text-chat-header-foreground/70">
            {online ? "online" : lastSeen}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onVideoCall}
          className="text-chat-header-foreground hover:bg-secondary/50"
        >
          <Video size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onAudioCall}
          className="text-chat-header-foreground hover:bg-secondary/50"
        >
          <Phone size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-chat-header-foreground hover:bg-secondary/50"
        >
          <MoreVertical size={20} />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;
