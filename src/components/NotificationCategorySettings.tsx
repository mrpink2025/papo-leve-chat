import { MessageSquare, AtSign, Phone, Heart, Info, Volume2, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  useNotificationCategories,
  NotificationCategory,
} from '@/hooks/useNotificationCategories';

const CATEGORY_INFO: Record<NotificationCategory, {
  icon: typeof MessageSquare;
  label: string;
  description: string;
  priorityLabel: string;
}> = {
  messages: {
    icon: MessageSquare,
    label: 'Mensagens',
    description: 'Novas mensagens em conversas 1:1 e grupos',
    priorityLabel: 'Normal',
  },
  mentions: {
    icon: AtSign,
    label: 'Menções',
    description: 'Quando alguém te marca com @você ou @todos',
    priorityLabel: 'Alta',
  },
  calls: {
    icon: Phone,
    label: 'Chamadas',
    description: 'Chamadas de voz e vídeo recebidas',
    priorityLabel: 'Urgente',
  },
  reactions: {
    icon: Heart,
    label: 'Reações',
    description: 'Reações às suas mensagens (❤️, 👍, etc)',
    priorityLabel: 'Baixa',
  },
  system: {
    icon: Info,
    label: 'Sistema',
    description: 'Avisos sobre grupos, admin e atualizações',
    priorityLabel: 'Baixa',
  },
};

const PRIORITY_COLORS = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  urgent: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export const NotificationCategorySettings = () => {
  const {
    categoryPreferences,
    isLoading,
    updateCategory,
    isUpdating,
    getCategorySettings,
  } = useNotificationCategories();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const categories: NotificationCategory[] = ['mentions', 'calls', 'messages', 'reactions', 'system'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Categorias de notificações</CardTitle>
        <CardDescription>
          Configure quais tipos de notificações você quer receber
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category, index) => {
          const info = CATEGORY_INFO[category];
          const Icon = info.icon;
          const settings = getCategorySettings(category);
          const priorityColor = PRIORITY_COLORS[settings.priority];

          return (
            <div key={category}>
              {index > 0 && <Separator className="my-4" />}
              
              <div className="space-y-3">
                {/* Header da categoria */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">{info.label}</Label>
                        <Badge variant="outline" className={priorityColor}>
                          {info.priorityLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(checked) =>
                      updateCategory({
                        category,
                        updates: { enabled: checked },
                      })
                    }
                    disabled={isUpdating}
                  />
                </div>

                {/* Configurações adicionais (quando habilitado) */}
                {settings.enabled && (
                  <div className="ml-11 space-y-2">
                    {/* Som */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-3 w-3 text-muted-foreground" />
                        <Label className="text-sm font-normal text-muted-foreground">
                          Som
                        </Label>
                      </div>
                      <Switch
                        checked={settings.sound_enabled}
                        onCheckedChange={(checked) =>
                          updateCategory({
                            category,
                            updates: { sound_enabled: checked },
                          })
                        }
                        disabled={isUpdating}
                        className="scale-75"
                      />
                    </div>

                    {/* Agrupar (somente para categorias que suportam) */}
                    {(category === 'messages' || category === 'reactions' || category === 'system') && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <Label className="text-sm font-normal text-muted-foreground">
                            Agrupar similares
                          </Label>
                        </div>
                        <Switch
                          checked={settings.group_similar}
                          onCheckedChange={(checked) =>
                            updateCategory({
                              category,
                              updates: { group_similar: checked },
                            })
                          }
                          disabled={isUpdating}
                          className="scale-75"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Info sobre priorização */}
        <Separator className="my-4" />
        <div className="rounded-lg bg-muted p-3 space-y-2">
          <p className="text-sm font-medium">Como funciona a priorização?</p>
          <ul className="text-xs text-muted-foreground space-y-1 ml-4">
            <li>🔴 <strong>Urgente</strong> (Chamadas): Som alto, vibração forte, sempre visível</li>
            <li>🟠 <strong>Alta</strong> (Menções): Som notável, não agrupa, prioridade visual</li>
            <li>🔵 <strong>Normal</strong> (Mensagens): Som padrão, pode agrupar</li>
            <li>⚪ <strong>Baixa</strong> (Reações/Sistema): Sem som, agrupa automaticamente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
