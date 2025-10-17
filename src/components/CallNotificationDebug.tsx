// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Painel de debug para sistema de notificações de chamadas
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Phone, Trash2, RefreshCw, Database, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export const CallNotificationDebug = () => {
  const [loading, setLoading] = useState(false);

  // Buscar estatísticas de chamadas
  const { data: callStats, refetch: refetchStats } = useQuery({
    queryKey: ['call-stats'],
    queryFn: async () => {
      const { data: ringing } = await supabase
        .from('call_notifications')
        .select('id')
        .eq('status', 'ringing');

      const { data: missed } = await supabase
        .from('call_notifications')
        .select('id')
        .eq('status', 'missed');

      const { data: answered } = await supabase
        .from('call_notifications')
        .select('id')
        .eq('status', 'answered');

      return {
        ringing: ringing?.length || 0,
        missed: missed?.length || 0,
        answered: answered?.length || 0,
      };
    },
  });

  // Buscar estatísticas de tokens push
  const { data: tokenStats, refetch: refetchTokens } = useQuery({
    queryKey: ['token-stats'],
    queryFn: async () => {
      const { data: tokens } = await supabase
        .from('push_subscriptions')
        .select('id, device_name, last_used_at');

      const now = Date.now();
      const active = tokens?.filter(t => {
        const lastUsed = new Date(t.last_used_at).getTime();
        return now - lastUsed < 7 * 24 * 60 * 60 * 1000; // 7 dias
      }).length || 0;

      const inactive = tokens?.filter(t => {
        const lastUsed = new Date(t.last_used_at).getTime();
        return now - lastUsed >= 30 * 24 * 60 * 60 * 1000; // 30 dias
      }).length || 0;

      return {
        total: tokens?.length || 0,
        active,
        inactive,
        devices: tokens?.map(t => ({
          name: t.device_name,
          lastUsed: t.last_used_at,
        })) || [],
      };
    },
  });

  // Executar limpeza manual de chamadas expiradas
  const handleCleanupCalls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-expired-calls');
      
      if (error) throw error;

      toast({
        title: '✅ Limpeza concluída',
        description: `${data.cleaned} chamadas expiradas foram limpas.`,
      });

      refetchStats();
    } catch (error: any) {
      console.error('[Debug] Erro ao limpar chamadas:', error);
      toast({
        title: 'Erro na limpeza',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Executar limpeza manual de tokens inativos
  const handleCleanupTokens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-inactive-tokens');
      
      if (error) throw error;

      toast({
        title: '✅ Limpeza concluída',
        description: `${data.cleaned} tokens inativos foram removidos.`,
      });

      refetchTokens();
    } catch (error: any) {
      console.error('[Debug] Erro ao limpar tokens:', error);
      toast({
        title: 'Erro na limpeza',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Estatísticas de Chamadas
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real do sistema de chamadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500">{callStats?.ringing || 0}</div>
              <div className="text-sm text-muted-foreground">Tocando</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500">{callStats?.missed || 0}</div>
              <div className="text-sm text-muted-foreground">Perdidas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">{callStats?.answered || 0}</div>
              <div className="text-sm text-muted-foreground">Atendidas</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCleanupCalls}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Limpar Expiradas
            </Button>
            <Button
              onClick={() => refetchStats()}
              variant="outline"
              size="icon"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Tokens de Notificação Push
          </CardTitle>
          <CardDescription>
            Dispositivos registrados para receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{tokenStats?.total || 0}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">{tokenStats?.active || 0}</div>
              <div className="text-sm text-muted-foreground">Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">{tokenStats?.inactive || 0}</div>
              <div className="text-sm text-muted-foreground">Inativos</div>
            </div>
          </div>

          <div className="space-y-2">
            {tokenStats?.devices.slice(0, 5).map((device, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="font-medium">{device.name}</span>
                <Badge variant="outline">
                  {new Date(device.lastUsed).toLocaleDateString('pt-BR')}
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCleanupTokens}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              Limpar Inativos
            </Button>
            <Button
              onClick={() => refetchTokens()}
              variant="outline"
              size="icon"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Cron Jobs Configurados</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span>cleanup-expired-calls</span>
            <Badge variant="secondary">A cada 30s</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>cleanup-inactive-tokens</span>
            <Badge variant="secondary">Diário às 3h</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
