import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Clock } from "lucide-react";

interface MuteDurationDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectDuration: (hours: number | null) => void;
  conversationName: string;
}

export const MuteDurationDialog = ({
  open,
  onClose,
  onSelectDuration,
  conversationName,
}: MuteDurationDialogProps) => {
  const handleSelect = (hours: number | null) => {
    onSelectDuration(hours);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-primary" />
            Silenciar notificações
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-4">
            Escolha por quanto tempo deseja silenciar "{conversationName}"
          </p>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => handleSelect(8)}
          >
            <Clock className="h-4 w-4 text-primary" />
            <div className="text-left">
              <div className="font-medium">8 horas</div>
              <div className="text-xs text-muted-foreground">
                Até {new Date(Date.now() + 8 * 60 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => handleSelect(24 * 7)}
          >
            <Clock className="h-4 w-4 text-primary" />
            <div className="text-left">
              <div className="font-medium">1 semana</div>
              <div className="text-xs text-muted-foreground">
                Até {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => handleSelect(null)}
          >
            <BellOff className="h-4 w-4 text-primary" />
            <div className="text-left">
              <div className="font-medium">Sempre</div>
              <div className="text-xs text-muted-foreground">
                Até reativar manualmente
              </div>
            </div>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-auto py-3 text-primary hover:text-primary"
            onClick={() => {
              onSelectDuration(0); // 0 = unmute
              onClose();
            }}
          >
            <Bell className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Reativar notificações</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
