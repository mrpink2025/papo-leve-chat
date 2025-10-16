import { useState } from 'react';
import { Bell, Volume2, Vibrate, Hash, Eye, Moon, Clock, Calendar, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Checkbox } from '@/components/ui/checkbox';

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { preferences, updatePreferences, isUpdating } = useNotificationPreferences();
  const { permission, isSubscribed, requestPermission, unsubscribe, isLoading: isPushLoading } = usePushNotifications();

  const [localPrefs, setLocalPrefs] = useState(preferences);

  const handleToggle = (key: keyof typeof preferences, value: boolean) => {
    const newPrefs = { ...localPrefs, [key]: value };
    setLocalPrefs(newPrefs);
    updatePreferences({ [key]: value });
  };

  const handleTimeChange = (key: 'quiet_hours_start' | 'quiet_hours_end', value: string) => {
    const timeWithSeconds = value.length === 5 ? `${value}:00` : value;
    const newPrefs = { ...localPrefs, [key]: timeWithSeconds };
    setLocalPrefs(newPrefs);
    updatePreferences({ [key]: timeWithSeconds });
  };

  const handleDayToggle = (day: number) => {
    const currentDays = localPrefs.quiet_hours_days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    
    const newPrefs = { ...localPrefs, quiet_hours_days: newDays };
    setLocalPrefs(newPrefs);
    updatePreferences({ quiet_hours_days: newDays });
  };

  const handleEnableNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
      handleToggle('enabled', false);
    } else {
      const success = await requestPermission();
      if (success) {
        handleToggle('enabled', true);
      }
    }
  };

  const needsPermission = permission === 'default' || permission === 'denied';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/configuracoes')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              Configure como você quer receber notificações
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Status das Permissões */}
        {needsPermission && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificações desativadas
              </CardTitle>
              <CardDescription>
                Ative as notificações para receber alertas de novas mensagens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleEnableNotifications}
                disabled={isPushLoading}
                className="w-full"
              >
                {isPushLoading ? 'Ativando...' : 'Ativar notificações'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Configurações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configurações gerais</CardTitle>
            <CardDescription>
              Controle como as notificações funcionam
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle Principal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label>Permitir notificações</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativar ou desativar todas as notificações
                  </p>
                </div>
              </div>
              <Switch
                checked={localPrefs.enabled && isSubscribed}
                onCheckedChange={handleEnableNotifications}
                disabled={isUpdating || isPushLoading}
              />
            </div>

            <Separator />

            {/* Som */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label>Som</Label>
                  <p className="text-sm text-muted-foreground">
                    Reproduzir som ao receber notificações
                  </p>
                </div>
              </div>
              <Switch
                checked={localPrefs.sound_enabled}
                onCheckedChange={(checked) => handleToggle('sound_enabled', checked)}
                disabled={!localPrefs.enabled || isUpdating}
              />
            </div>

            {/* Vibração */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Vibrate className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label>Vibração</Label>
                  <p className="text-sm text-muted-foreground">
                    Vibrar ao receber notificações (em dispositivos compatíveis)
                  </p>
                </div>
              </div>
              <Switch
                checked={localPrefs.vibration_enabled}
                onCheckedChange={(checked) => handleToggle('vibration_enabled', checked)}
                disabled={!localPrefs.enabled || isUpdating}
              />
            </div>

            {/* Badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label>Badges</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar contador de mensagens não lidas
                  </p>
                </div>
              </div>
              <Switch
                checked={localPrefs.badge_enabled}
                onCheckedChange={(checked) => handleToggle('badge_enabled', checked)}
                disabled={!localPrefs.enabled || isUpdating}
              />
            </div>

            {/* Preview */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label>Preview de conteúdo</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar prévia da mensagem na tela bloqueada
                  </p>
                </div>
              </div>
              <Switch
                checked={localPrefs.show_preview}
                onCheckedChange={(checked) => handleToggle('show_preview', checked)}
                disabled={!localPrefs.enabled || isUpdating}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours (Não Perturbe) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Não Perturbe
            </CardTitle>
            <CardDescription>
              Silenciar notificações em horários específicos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ativar Quiet Hours */}
            <div className="flex items-center justify-between">
              <Label>Ativar modo Não Perturbe</Label>
              <Switch
                checked={localPrefs.quiet_hours_enabled}
                onCheckedChange={(checked) => handleToggle('quiet_hours_enabled', checked)}
                disabled={!localPrefs.enabled || isUpdating}
              />
            </div>

            {localPrefs.quiet_hours_enabled && (
              <>
                <Separator />

                {/* Horários */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    <span>Horário</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Início</Label>
                      <Input
                        type="time"
                        value={localPrefs.quiet_hours_start.slice(0, 5)}
                        onChange={(e) => handleTimeChange('quiet_hours_start', e.target.value)}
                        disabled={isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Fim</Label>
                      <Input
                        type="time"
                        value={localPrefs.quiet_hours_end.slice(0, 5)}
                        onChange={(e) => handleTimeChange('quiet_hours_end', e.target.value)}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Dias da Semana */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    <span>Dias da semana</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {DIAS_SEMANA.map((dia) => (
                      <Button
                        key={dia.value}
                        variant={localPrefs.quiet_hours_days?.includes(dia.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleDayToggle(dia.value)}
                        disabled={isUpdating}
                        className="flex-1 min-w-[60px]"
                      >
                        {dia.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Info sobre Quiet Hours */}
                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <p>
                    Durante o modo Não Perturbe, você não receberá notificações sonoras ou visuais.
                    As mensagens ainda serão recebidas normalmente.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info adicional */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Você também pode configurar notificações individuais para cada conversa
              nas configurações da conversa.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSettings;
