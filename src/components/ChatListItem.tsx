import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCheck, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  FileText, 
  Phone, 
  PhoneOff,
  Pin,
  BellOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import ProfileViewDialog from "./ProfileViewDialog";
import { ConversationContextMenu } from "./ConversationContextMenu";

interface ChatListItemProps {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageType?: string;
  timestamp: string;
  unread?: number;
  online?: boolean;
  onClick: () => void;
  isGroup?: boolean;
  memberCount?: number;
  bio?: string;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  hasNewStory?: boolean;
  messageStatus?: 'sent' | 'delivered' | 'read';
  onArchive?: () => void;
  onMute?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onClear?: () => void;
  onMarkRead?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onLongPress?: () => void;
  onToggleSelect?: () => void;
}

const ChatListItem = ({
  id,
  name,
  avatar,
  lastMessage,
  lastMessageType = 'text',
  timestamp,
  unread = 0,
  online = false,
  onClick,
  isGroup = false,
  memberCount,
  bio,
  isPinned = false,
  isMuted = false,
  isArchived = false,
  hasNewStory = false,
  messageStatus,
  onArchive,
  onMute,
  onPin,
  onDelete,
  onClear,
  onMarkRead,
  onBlock,
  onReport,
  isSelectionMode = false,
  isSelected = false,
  onLongPress,
  onToggleSelect,
}: ChatListItemProps) => {
  const [showProfileView, setShowProfileView] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const handleTouchStart = () => {
    setIsPressing(true);
    longPressTimer.current = setTimeout(() => {
      onLongPress?.();
    }, 500);
  };

  const handleTouchEnd = () => {
    setIsPressing(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelect?.();
    } else {
      onClick();
    }
  };

  // Ícone de tipo de mensagem
  const getMessageIcon = () => {
    switch (lastMessageType) {
      case 'image':
        return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
      case 'video':
        return <Video className="h-4 w-4 text-muted-foreground" />;
      case 'audio':
        return <Mic className="h-4 w-4 text-muted-foreground" />;
      case 'document':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'call':
        return <Phone className="h-4 w-4 text-green-500" />;
      case 'missed_call':
        return <PhoneOff className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={cn(
        "group flex items-center gap-3 p-3 sm:p-4 hover:bg-secondary/50 cursor-pointer transition-all border-b border-border/50 animate-fade-in active:bg-secondary relative",
        isPinned && "bg-primary/5",
        unread > 0 && "bg-primary/[0.02]",
        isSelected && "bg-primary/10",
        isPressing && "scale-[0.98]"
      )}
    >
      {/* Checkbox para seleção */}
      {isSelectionMode && (
        <div 
          className="flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
        >
          <div className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            isSelected 
              ? "bg-primary border-primary" 
              : "border-border bg-background"
          )}>
            {isSelected && (
              <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
      {/* Indicador de fixado */}
      {isPinned && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2">
          <Pin className="h-3 w-3 text-primary fill-primary" />
        </div>
      )}

      <div className="relative">
        <Avatar 
          className={cn(
            "h-12 w-12 sm:h-14 sm:w-14 ring-2 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
            hasNewStory 
              ? "ring-primary ring-offset-2 ring-offset-background" 
              : "ring-border/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setShowProfileView(true);
          }}
        >
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary/20 text-foreground font-medium">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card shadow-lg" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className={cn(
              "font-semibold truncate",
              unread > 0 ? "text-foreground" : "text-foreground/80"
            )}>
              {name}
            </h3>
            {isMuted && <BellOff className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
          </div>
          <span className="text-[11px] text-muted-foreground flex-shrink-0">
            {timestamp}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* Ícone de tipo de mensagem */}
            {getMessageIcon()}
            
            {/* Status da mensagem (apenas para mensagens enviadas) */}
            {messageStatus && !isGroup && (
              <CheckCheck 
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0",
                  messageStatus === 'read' 
                    ? "text-blue-500" 
                    : messageStatus === 'delivered'
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
                )}
              />
            )}
            
            <p className={cn(
              "text-sm truncate flex-1",
              unread > 0 
                ? "text-foreground font-medium" 
                : "text-muted-foreground"
            )}>
              {lastMessage}
            </p>
          </div>
          
          {unread > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg flex-shrink-0 animate-scale-in">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>

      {/* Menu contextual (ocultar em modo seleção) */}
      {!isSelectionMode && (
        <ConversationContextMenu
        conversationId={id}
        isArchived={isArchived}
        isMuted={isMuted}
        isPinned={isPinned}
        isGroup={isGroup}
        onArchive={onArchive}
        onMute={onMute}
        onPin={onPin}
        onDelete={onDelete}
        onClear={onClear}
        onMarkRead={onMarkRead}
        onBlock={onBlock}
        onReport={onReport}
      />
      )}

      <ProfileViewDialog
        open={showProfileView}
        onClose={() => setShowProfileView(false)}
        name={name}
        avatarUrl={avatar}
        bio={bio}
        isGroup={isGroup}
        memberCount={memberCount}
      />
    </div>
  );
};

export default ChatListItem;
