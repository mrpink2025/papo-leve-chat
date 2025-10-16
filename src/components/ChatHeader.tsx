import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Video, Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GroupSettingsDialog from "./GroupSettingsDialog";

interface ChatHeaderProps {
  name: string;
  avatar?: string;
  online?: boolean;
  lastSeen?: string;
  isGroup?: boolean;
  conversationId?: string;
  onVideoCall?: () => void;
  onAudioCall?: () => void;
  onSearch?: () => void;
}

const ChatHeader = ({ 
  name, 
  avatar, 
  online = false, 
  lastSeen, 
  isGroup = false,
  conversationId,
  onVideoCall, 
  onAudioCall,
  onSearch 
}: ChatHeaderProps) => {
  const navigate = useNavigate();
  const [showGroupSettings, setShowGroupSettings] = useState(false);

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
          onClick={onSearch}
          className="text-chat-header-foreground hover:bg-secondary/50"
        >
          <Search size={20} />
        </Button>
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
        {isGroup && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowGroupSettings(true)}
            className="text-chat-header-foreground hover:bg-secondary/50"
          >
            <Settings size={20} />
          </Button>
        )}
      </div>

      {isGroup && conversationId && (
        <GroupSettingsDialog
          open={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
          conversationId={conversationId}
        />
      )}
    </header>
  );
};

export default ChatHeader;
