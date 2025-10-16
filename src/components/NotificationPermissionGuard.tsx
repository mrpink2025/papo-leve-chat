import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';

/**
 * Componente que monitora e solicita permissões de notificação
 * Exibe prompt discreto quando necessário
 */
export const NotificationPermissionGuard = () => {
  const { user } = useAuth();
  const { 
    permission, 
    isSubscribed, 
    isSupported, 
    requestPermission,
    isLoading 
  } = usePushNotifications();
  
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Não mostrar se:
    // - Usuário não está logado
    // - Navegador não suporta
    // - Já tem permissão concedida
    // - Já está inscrito
    // - Usuário dispensou
    // - Permissão foi negada
    if (!user || !isSupported || permission === 'granted' || isSubscribed || dismissed || permission === 'denied') {
      setShowPrompt(false);
      return;
    }

    // Verificar se já dispensou nas últimas 24h
    const lastDismissed = localStorage.getItem('push-notification-dismissed');
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed);
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      
      if (hoursSinceDismissed < 24) {
        setDismissed(true);
        return;
      }
    }

    // Esperar 10 segundos antes de mostrar
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [user, isSupported, permission, isSubscribed, dismissed]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowPrompt(false);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('push-notification-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="p-4 shadow-lg border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-sm">
              Ativar Notificações Push
            </h3>
            <p className="text-xs text-muted-foreground">
              Receba alertas de novas mensagens, chamadas e menções mesmo quando o app estiver fechado.
            </p>
            
            <div className="flex gap-2 pt-1">
              <Button 
                size="sm" 
                onClick={handleEnable}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Ativando...' : 'Ativar'}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                disabled={isLoading}
              >
                Depois
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Fechar"
          >
            <BellOff className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  );
};
