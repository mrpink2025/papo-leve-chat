import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneIncoming, Video } from 'lucide-react';
import { CallNotification } from '@/hooks/useCallNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MissedCallsListProps {
  calls: CallNotification[];
  onCallBack: (call: CallNotification) => void;
  isCallBackLoading?: boolean;
}

/**
 * Lista de chamadas perdidas
 * - Mostra histórico de chamadas perdidas
 * - Botão "Ligar de volta"
 * - Timestamp relativo
 */
export const MissedCallsList = ({
  calls,
  onCallBack,
  isCallBackLoading = false,
}: MissedCallsListProps) => {
  if (calls.length === 0) {
    return (
      <Card className="p-8 text-center">
        <PhoneIncoming className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhuma chamada perdida</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Chamadas Perdidas</h3>
        <Badge variant="destructive" className="gap-1">
          <PhoneIncoming className="h-3 w-3" />
          {calls.length}
        </Badge>
      </div>

      {calls.map((call) => {
        const callerName = call.caller?.full_name || call.caller?.username || 'Usuário Desconhecido';
        const callerInitials = callerName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);

        return (
          <Card key={call.id} className="p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <Avatar className="h-12 w-12">
                <AvatarImage src={call.caller?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {callerInitials}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold truncate">{callerName}</h4>
                  {call.call_type === 'video' ? (
                    <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PhoneIncoming className="h-3 w-3 text-destructive" />
                  <span>
                    Chamada perdida •{' '}
                    {formatDistanceToNow(new Date(call.started_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>

              {/* Botão ligar de volta */}
              <Button
                onClick={() => onCallBack(call)}
                disabled={isCallBackLoading}
                variant="outline"
                size="sm"
                className="gap-2 flex-shrink-0"
              >
                {call.call_type === 'video' ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                Ligar de volta
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
