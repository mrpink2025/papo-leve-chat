import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const PushNotificationPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { permission, isSubscribed, isSupported, requestPermission, isLoading } = usePushNotifications();

  useEffect(() => {
    // Mostrar prompt após 10 segundos se:
    // - Notificações são suportadas
    // - Permissão ainda não foi concedida ou negada
    // - Usuário não está inscrito
    // - Não foi dispensado recentemente (localStorage)
    
    const dismissed = localStorage.getItem('pushPromptDismissed');
    const dismissedAt = dismissed ? parseInt(dismissed) : 0;
    const dayInMs = 24 * 60 * 60 * 1000;
    const shouldShow = 
      isSupported &&
      permission === 'default' &&
      !isSubscribed &&
      (Date.now() - dismissedAt > dayInMs); // Mostrar novamente após 24h

    if (shouldShow) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10000); // 10 segundos

      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, isSubscribed]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pushPromptDismissed', Date.now().toString());
  };

  const handleEnable = async () => {
    const success = await requestPermission();
    if (success) {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="p-4 shadow-lg border-2 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              Ative as notificações
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Receba alertas instantâneos quando alguém te mandar uma mensagem. Nunca perca nenhuma conversa importante!
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleEnable}
                size="sm"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Ativando...' : 'Ativar'}
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
              >
                Depois
              </Button>
            </div>
          </div>

          <Button
            onClick={handleDismiss}
            size="icon"
            variant="ghost"
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
