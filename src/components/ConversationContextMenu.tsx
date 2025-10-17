import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreVertical, 
  Archive, 
  Bell, 
  BellOff, 
  Pin, 
  PinOff,
  Trash2, 
  MessageSquareOff,
  Flag,
  UserX
} from 'lucide-react';

interface ConversationContextMenuProps {
  conversationId: string;
  isArchived?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  isGroup?: boolean;
  onArchive?: () => void;
  onMute?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onClear?: () => void;
  onMarkRead?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
}

export const ConversationContextMenu = ({
  isArchived = false,
  isMuted = false,
  isPinned = false,
  isGroup = false,
  onArchive,
  onMute,
  onPin,
  onDelete,
  onClear,
  onMarkRead,
  onBlock,
  onReport,
}: ConversationContextMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive?.(); }}>
          <Archive className="mr-2 h-4 w-4" />
          {isArchived ? 'Desarquivar' : 'Arquivar conversa'}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPin?.(); }}>
          {isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
          {isPinned ? 'Desafixar' : 'Fixar conversa'}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMute?.(); }}>
          {isMuted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
          {isMuted ? 'Reativar notificações' : 'Silenciar notificações'}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkRead?.(); }}>
          <MessageSquareOff className="mr-2 h-4 w-4" />
          Marcar como lida
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClear?.(); }}>
          <MessageSquareOff className="mr-2 h-4 w-4" />
          Limpar conversa
        </DropdownMenuItem>

        {!isGroup && (
          <>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onBlock?.(); }}
              className="text-orange-600 dark:text-orange-400"
            >
              <UserX className="mr-2 h-4 w-4" />
              Bloquear contato
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onReport?.(); }}
              className="text-orange-600 dark:text-orange-400"
            >
              <Flag className="mr-2 h-4 w-4" />
              Denunciar
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir conversa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
