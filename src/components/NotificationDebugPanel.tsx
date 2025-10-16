import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNotificationTelemetry } from '@/hooks/useNotificationTelemetry';
import { useNotificationManager } from '@/hooks/useNotificationManager';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { 
  Bell, 
  BellOff, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

/**
 * Painel de debug e testes de notificações
 * - Estatísticas em tempo real
 * - Teste de notificações
 * - Status de permissões
 * - Métricas de performance
 */
export const NotificationDebugPanel = () => {
  const { getStats } = useNotificationTelemetry();
  const { sendNotification } = useNotificationManager();
  const { permission, isSubscribed, requestPermission } = usePushNotifications();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Carregar estatísticas
  const loadStats = async () => {
    setIsLoading(true);
    const data = await getStats(7);
    setStats(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Testar notificação
  const testNotification = async () => {
    setTestResult(null);
    
    try {
      const success = await sendNotification({
        conversationId: 'test-conversation',
        category: 'system',
        title: '🔔 Teste de Notificação',
        body: 'Se você viu isso, as notificações estão funcionando!',
      });

      setTestResult(success ? 'success' : 'blocked');
      
      // Recarregar stats após 1 segundo
      setTimeout(loadStats, 1000);
    } catch (error) {
      setTestResult('error');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Debug de Notificações</h2>
        <Button onClick={loadStats} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Status de Permissões */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Status do Sistema
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Permissão:</span>
            <Badge variant={permission === 'granted' ? 'default' : 'destructive'}>
              {permission}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Inscrito:</span>
            <Badge variant={isSubscribed ? 'default' : 'secondary'}>
              {isSubscribed ? 'Sim' : 'Não'}
            </Badge>
          </div>

          {permission !== 'granted' && (
            <Button onClick={() => requestPermission()} size="sm" className="w-full mt-2">
              Solicitar Permissão
            </Button>
          )}
        </div>
      </Card>

      {/* Teste de Notificação */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Teste de Notificação
        </h3>
        
        <Button 
          onClick={testNotification} 
          className="w-full mb-3"
          disabled={permission !== 'granted' || !isSubscribed}
        >
          Enviar Notificação de Teste
        </Button>

        {testResult && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            testResult === 'success' ? 'bg-green-500/10 text-green-500' :
            testResult === 'blocked' ? 'bg-yellow-500/10 text-yellow-500' :
            'bg-red-500/10 text-red-500'
          }`}>
            {testResult === 'success' && <CheckCircle className="h-4 w-4" />}
            {testResult === 'blocked' && <BellOff className="h-4 w-4" />}
            {testResult === 'error' && <XCircle className="h-4 w-4" />}
            <span className="text-sm font-medium">
              {testResult === 'success' && 'Notificação enviada com sucesso!'}
              {testResult === 'blocked' && 'Notificação bloqueada (verifique configurações)'}
              {testResult === 'error' && 'Erro ao enviar notificação'}
            </span>
          </div>
        )}
      </Card>

      <Separator />

      {/* Estatísticas */}
      {stats && (
        <>
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Estatísticas (Últimos 7 dias)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Eventos</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground">Entregues</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.opened}</p>
                <p className="text-xs text-muted-foreground">Abertas</p>
              </div>

              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Falhas</p>
              </div>

              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.blocked}</p>
                <p className="text-xs text-muted-foreground">Bloqueadas</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Performance
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Latência Média:</span>
                <Badge variant={stats.avgLatencyMs < 2000 ? 'default' : 'destructive'}>
                  {stats.avgLatencyMs}ms
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taxa de Entrega:</span>
                <Badge variant={stats.deliveryRate > 90 ? 'default' : 'destructive'}>
                  {stats.deliveryRate}%
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taxa de Abertura:</span>
                <Badge variant={stats.openRate > 50 ? 'default' : 'secondary'}>
                  {stats.openRate}%
                </Badge>
              </div>
            </div>

            {stats.avgLatencyMs >= 2000 && (
              <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                <p className="text-xs text-destructive">
                  ⚠️ Latência acima do objetivo ({'<2s'}). Verifique conexão e edge function.
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
