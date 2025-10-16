import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Video, Search, MoreVertical, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GroupSettingsDialog from "./GroupSettingsDialog";
import ProfileViewDialog from "./ProfileViewDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <header className="bg-chat-header text-chat-header-foreground px-3 py-2 flex items-center justify-between shadow-sm border-b border-border/50">
      {/* Lado Esquerdo: Voltar + Avatar + Nome/Status */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="text-chat-header-foreground hover:bg-secondary/50 shrink-0"
        >
          <ArrowLeft size={22} />
        </Button>
        <Avatar 
          className="h-10 w-10 ring-1 ring-border/50 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all shrink-0"
          onClick={() => setShowProfileView(true)}
        >
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary/20 text-foreground">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setShowProfileView(true)}
        >
          <h2 className="font-semibold text-base truncate">{name}</h2>
          <p className="text-xs text-chat-header-foreground/70 truncate">
            {online ? "online" : lastSeen}
          </p>
        </div>
      </div>

      {/* Lado Direito: Ações (estilo WhatsApp) */}
      <div className="flex items-center gap-1 shrink-0">
        {!isGroup && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onVideoCall}
              className="text-chat-header-foreground hover:bg-secondary/50"
              title="Chamada de vídeo"
            >
              <Video size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAudioCall}
              className="text-chat-header-foreground hover:bg-secondary/50"
              title="Chamada de voz"
            >
              <Phone size={20} />
            </Button>
          </>
        )}
        
        {/* Menu de Opções (3 pontos) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-chat-header-foreground hover:bg-secondary/50"
              title="Mais opções"
            >
              <MoreVertical size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card">
            <DropdownMenuItem onClick={onSearch} className="cursor-pointer">
              <Search size={18} className="mr-2" />
              <span>Pesquisar</span>
            </DropdownMenuItem>

            {isGroup && (
              <DropdownMenuItem 
                onClick={() => setShowGroupSettings(true)}
                className="cursor-pointer"
              >
                <Settings2 size={18} className="mr-2" />
                <span>Configurações do grupo</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
