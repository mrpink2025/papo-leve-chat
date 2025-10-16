import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Video, Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GroupSettingsDialog from "./GroupSettingsDialog";
import ProfileViewDialog from "./ProfileViewDialog";

interface ChatHeaderProps {
  name: string;
  avatar?: string;
  online?: boolean;
  lastSeen?: string;
  isGroup?: boolean;
  conversationId?: string;
  otherUserId?: string; // ID do outro usuário em conversas diretas
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
  otherUserId,
  onVideoCall, 
  onAudioCall,
  onSearch 
}: ChatHeaderProps) => {
  const navigate = useNavigate();
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);

  // Buscar informações adicionais quando o dialog for aberto
  const { data: profileInfo } = useQuery({
    queryKey: ["profile-info", conversationId, otherUserId, isGroup],
    queryFn: async () => {
      if (isGroup && conversationId) {
        // Buscar informações do grupo
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("id")
          .eq("conversation_id", conversationId);

        return {
          memberCount: participants?.length || 0,
          bio: null,
        };
      } else if (otherUserId) {
        // Buscar bio do usuário
        const { data: profile } = await supabase
          .from("profiles")
          .select("bio")
          .eq("id", otherUserId)
          .single();

        return {
          memberCount: undefined,
          bio: profile?.bio || null,
        };
      }
      return { memberCount: undefined, bio: null };
    },
    enabled: showProfileView && (!!conversationId || !!otherUserId),
  });

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
        <Avatar 
          className="h-10 w-10 ring-1 ring-border/50 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          onClick={() => setShowProfileView(true)}
        >
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

      <ProfileViewDialog
        open={showProfileView}
        onClose={() => setShowProfileView(false)}
        name={name}
        avatarUrl={avatar}
        bio={profileInfo?.bio}
        isGroup={isGroup}
        memberCount={profileInfo?.memberCount}
      />
    </header>
  );
};

export default ChatHeader;
