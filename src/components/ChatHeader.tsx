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
  memberCount?: number; // Número de participantes em grupos
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
  memberCount,
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
        // Buscar informações do grupo (nome e contagem de membros)
        const { data: groupData } = await supabase
          .from("conversations")
          .select("name")
          .eq("id", conversationId)
          .single();

        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("id")
          .eq("conversation_id", conversationId);

        return {
          memberCount: participants?.length || 0,
          bio: null,
          groupName: groupData?.name || null,
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
          groupName: null,
        };
      }
      return { memberCount: undefined, bio: null, groupName: null };
    },
    enabled: showProfileView && (!!conversationId || !!otherUserId),
  });

  return (
    <header className="relative bg-gradient-to-r from-chat-header via-chat-header to-primary/5 text-chat-header-foreground px-3 py-2 flex items-center justify-between shadow-lg border-b-2 border-primary/20 backdrop-blur-sm">
      {/* Overlay de profundidade */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      {/* Lado Esquerdo: Voltar + Avatar + Nome/Status */}
      <div className="relative z-10 flex items-center gap-2 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="text-chat-header-foreground hover:bg-primary/10 hover:text-primary hover:scale-110 transition-all shrink-0"
        >
          <ArrowLeft size={22} />
        </Button>
        
        {/* Avatar com efeito glow */}
        <div className="relative group shrink-0">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:blur-lg transition-all opacity-0 group-hover:opacity-100" />
          <Avatar 
            className="relative z-10 h-10 w-10 ring-2 ring-primary/30 group-hover:ring-primary/60 cursor-pointer hover:scale-110 transition-all"
            onClick={() => setShowProfileView(true)}
          >
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-primary/20 text-foreground font-semibold">
              {name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Indicador online com pulsação */}
          {online && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-chat-header"></span>
            </span>
          )}
        </div>
        <div 
          className="flex-1 min-w-0 cursor-pointer group/text"
          onClick={() => setShowProfileView(true)}
        >
          <h2 className="font-bold text-base truncate group-hover/text:text-primary transition-colors">
            {name}
          </h2>
          <p className="text-xs text-chat-header-foreground/70 truncate flex items-center gap-1">
            {online && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
            {online ? "online" : lastSeen}
          </p>
        </div>
      </div>

      {/* Lado Direito: Ações (estilo WhatsApp) */}
      <div className="relative z-10 flex items-center gap-1 shrink-0">
        {(
          !isGroup || 
          (isGroup && memberCount && memberCount <= 10 && name !== "Bem-vindos")
        ) && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onVideoCall}
              className="text-chat-header-foreground hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-lg hover:shadow-primary/20 transition-all"
              title="Chamada de vídeo"
            >
              <Video size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAudioCall}
              className="text-chat-header-foreground hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-lg hover:shadow-primary/20 transition-all"
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
              className="text-chat-header-foreground hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-lg hover:shadow-primary/20 transition-all"
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
