import { Bell, BellOff, Volume2, VolumeX, Check, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useConversationNotifications } from '@/hooks/useConversationNotifications';
import { cn } from '@/lib/utils';

interface ConversationNotificationMenuProps {
  conversationId: string;
}

export const ConversationNotificationMenu = ({
  conversationId,
}: ConversationNotificationMenuProps) => {
  const {
    settings,
    updateMode,
    muteConversation,
    unmuteConversation,
    isUpdating,
    isMuted,
    timeRemaining,
  } = useConversationNotifications(conversationId);

  const currentMode = settings?.mode || 'all';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={cn(
            "relative",
            isMuted && "text-muted-foreground"
          )}
        >
          {isMuted ? (
            <BellOff className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {isMuted && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Status atual */}
        {isMuted && timeRemaining && (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Silenciado por mais {timeRemaining}</span>
            </div>
          </div>
        )}

        {/* Opções de modo */}
        <DropdownMenuItem
          onClick={() => updateMode('all')}
          disabled={isUpdating}
          className="cursor-pointer"
        >
          <Volume2 className="mr-2 h-4 w-4" />
          <span>Todas as mensagens</span>
          {currentMode === 'all' && !isMuted && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => updateMode('mentions_only')}
          disabled={isUpdating}
          className="cursor-pointer"
        >
          <Bell className="mr-2 h-4 w-4" />
          <span>Somente menções</span>
          {currentMode === 'mentions_only' && !isMuted && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Silenciar temporariamente */}
        {!isMuted ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isUpdating}>
              <VolumeX className="mr-2 h-4 w-4" />
              <span>Silenciar por...</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => muteConversation({ duration: '1h' })}
                disabled={isUpdating}
                className="cursor-pointer"
              >
                1 hora
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => muteConversation({ duration: '8h' })}
                disabled={isUpdating}
                className="cursor-pointer"
              >
                8 horas
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => muteConversation({ duration: '24h' })}
                disabled={isUpdating}
                className="cursor-pointer"
              >
                24 horas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => muteConversation({ duration: 'always' })}
                disabled={isUpdating}
                className="cursor-pointer"
              >
                Sempre (até reativar)
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem
            onClick={() => unmuteConversation()}
            disabled={isUpdating}
            className="cursor-pointer text-primary"
          >
            <Bell className="mr-2 h-4 w-4" />
            <span>Reativar notificações</span>
          </DropdownMenuItem>
        )}

        {/* Info adicional */}
        <DropdownMenuSeparator />
        <div className="px-2 py-2 text-xs text-muted-foreground">
          Configure notificações globais em Configurações
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
