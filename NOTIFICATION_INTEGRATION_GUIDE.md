# 🔔 Guia de Integração - Sistema de Notificações Nosso Papo

## 📚 Como Integrar Notificações no Fluxo de Mensagens

### 1. Integração Básica no Hook de Mensagens

Edite `src/hooks/useMessages.tsx` para adicionar notificações:

```typescript
import { useNotificationManager } from './useNotificationManager';
import { useConversationNotifications } from './useConversationNotifications';
import { hasMention } from '@/utils/mentionDetection';

export const useMessages = (conversationId: string) => {
  const { user } = useAuth();
  const { notifyNewMessage } = useNotificationManager();
  const { shouldNotify } = useConversationNotifications(conversationId);
  
  // ... código existente ...

  // Listener para novas mensagens em tempo real
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // Não notificar se é a própria mensagem
          if (newMessage.sender_id === user?.id) return;
          
          // Não notificar se a conversa está aberta e visível
          if (document.visibilityState === 'visible' && 
              window.location.pathname.includes(conversationId)) {
            return;
          }

          // Buscar dados do remetente
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          if (!sender) return;

          // Detectar menção
          const isMention = hasMention(newMessage.content, user?.username || '');

          // Verificar preferências da conversa
          if (!shouldNotify(isMention)) return;

          // Enviar notificação
          await notifyNewMessage(
            conversationId,
            newMessage.sender_id,
            sender.full_name || sender.username,
            newMessage.content,
            newMessage.id,
            sender.avatar_url,
            isMention
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, notifyNewMessage, shouldNotify]);

  // ... resto do código ...
};
```

---

### 2. Integração com Reações

Edite `src/hooks/useReactions.tsx`:

```typescript
import { useNotificationManager } from './useNotificationManager';

export const useReactions = () => {
  const { user } = useAuth();
  const { notifyReaction } = useNotificationManager();
  
  const addReaction = useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      // ... código de inserção ...
      
      // Buscar dados da mensagem para notificar o autor
      const { data: message } = await supabase
        .from('messages')
        .select('sender_id, content, conversation_id')
        .eq('id', messageId)
        .single();

      if (!message || message.sender_id === user?.id) return;

      // Buscar nome do reator
      const { data: reactor } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user?.id)
        .single();

      if (!reactor) return;

      // Notificar autor da mensagem
      await notifyReaction(
        message.conversation_id,
        reactor.full_name || reactor.username,
        emoji,
        message.content.substring(0, 50), // Preview curto
        messageId
      );
    },
  });

  return { addReaction };
};
```

---

### 3. Integração com Chamadas

Edite `src/hooks/useVideoCall.tsx`:

```typescript
import { useNotificationManager } from './useNotificationManager';

export const useVideoCall = () => {
  const { notifyCall } = useNotificationManager();
  
  const startCall = async (conversationId: string, isVideoCall: boolean = true) => {
    // ... código existente ...

    // Buscar participantes da conversa
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id, profiles(username, full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .neq('user_id', user?.id);

    // Buscar dados do caller
    const { data: caller } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', user?.id)
      .single();

    if (!caller) return;

    // Notificar cada participante
    for (const participant of participants || []) {
      await notifyCall(
        conversationId,
        caller.full_name || caller.username,
        isVideoCall,
        caller.avatar_url
      );
    }
  };

  return { startCall };
};
```

---

### 4. Notificações de Sistema

Exemplos de uso para eventos do sistema:

```typescript
import { useNotificationManager } from '@/hooks/useNotificationManager';

// Quando alguém é adicionado ao grupo
const notifyUserAddedToGroup = async (
  conversationId: string,
  addedUserId: string,
  groupName: string
) => {
  const { notifySystem } = useNotificationManager();
  
  await notifySystem(
    conversationId,
    '👥 Adicionado ao grupo',
    `Você foi adicionado ao grupo "${groupName}"`
  );
};

// Quando alguém é promovido a admin
const notifyUserPromoted = async (
  conversationId: string,
  userId: string,
  groupName: string
) => {
  const { notifySystem } = useNotificationManager();
  
  await notifySystem(
    conversationId,
    '⭐ Promovido a Admin',
    `Você agora é administrador do grupo "${groupName}"`
  );
};

// Quando há atualização do app
const notifyAppUpdate = async () => {
  const { notifySystem } = useNotificationManager();
  
  // Notificar em alguma conversa padrão ou criar sistema de notificações globais
  await notifySystem(
    'system', // Pode criar uma conversa especial "Sistema"
    '🔄 Atualização disponível',
    'Uma nova versão do Nosso Papo está disponível. Recarregue para atualizar.'
  );
};
```

---

### 5. Verificação Antes de Enviar

**SEMPRE use esta ordem de verificações:**

```typescript
// 1. Verificar se não é o próprio usuário
if (senderId === currentUser.id) return;

// 2. Verificar se a conversa está aberta
if (isConversationOpen(conversationId)) return;

// 3. Detectar categoria e prioridade
const isMention = hasMention(content, currentUser.username);
const category = isMention ? 'mentions' : 'messages';

// 4. Verificar preferências da conversa
const { shouldNotify } = useConversationNotifications(conversationId);
if (!shouldNotify(isMention)) return;

// 5. Enviar (passa por todas as verificações internas)
await notifyNewMessage(...);
```

---

## 🎯 Checklist de Integração

### Backend (Edge Functions)
- [ ] VAPID keys configuradas
- [ ] Edge function `send-push-notification` com web-push library
- [ ] Lógica de retry com backoff
- [ ] Logging adequado

### Frontend (React)
- [ ] Hooks importados nos componentes corretos
- [ ] Listeners de realtime conectados
- [ ] Detecção de menções implementada
- [ ] Verificação de conversa aberta
- [ ] Deep links funcionando

### Service Worker
- [ ] Handlers de push configurados
- [ ] Priorização aplicada (vibração, sons)
- [ ] Tag de agrupamento por conversa
- [ ] Click handlers com deep links
- [ ] Badge API integrada

### UI/UX
- [ ] Página de configurações de categorias
- [ ] Menu de notificações por conversa
- [ ] Feedback visual (toasts)
- [ ] Estados de loading
- [ ] Educacional para permissões

---

## 🧪 Cenários de Teste

### Teste 1: Fluxo Completo
1. Ativar notificações globalmente
2. Entrar em uma conversa
3. Configurar para "Somente menções"
4. Pedir para alguém enviar: "Oi, tudo bem?"
5. **Esperado**: Nenhuma notificação
6. Pedir para enviar: "@seuusername olá!"
7. **Esperado**: Notificação com prioridade ALTA

### Teste 2: Rate Limiting
1. Configurar categoria "messages" para agrupar
2. Enviar 50 mensagens rapidamente (script ou bot)
3. **Esperado**: 
   - Primeiras 30 notificadas individualmente
   - Depois: agrupamento "50 novas mensagens"

### Teste 3: Priorização
1. Enviar mensagem normal → Som padrão
2. Enviar menção → Som diferente (mais alto)
3. Iniciar chamada → Som urgente + requireInteraction
4. Reagir → Sem som (prioridade baixa)

### Teste 4: Quiet Hours + Categorias
1. Configurar Quiet Hours (22:00 - 08:00)
2. Desativar "Permitir urgentes" em Quiet Hours
3. Às 23:00, receber:
   - Mensagem normal → Bloqueada
   - Menção → Bloqueada
   - Chamada → Depende da config (pode passar se urgentes permitidos)

---

## 📱 Comportamento por Plataforma

### Chrome/Edge (Desktop & Android)
- ✅ Todas as categorias funcionam
- ✅ Priorização completa
- ✅ Agrupamento por tag
- ✅ Ações nas notificações
- ✅ Badge API

### Firefox (Desktop & Android)
- ✅ Todas as categorias funcionam
- ⚠️ Badge API limitado
- ✅ Agrupamento por tag
- ⚠️ Ações limitadas

### Safari (macOS)
- ✅ Notificações funcionam
- ⚠️ Sem ações nas notificações
- ⚠️ Sem badge API
- ✅ Som e vibração

### Safari (iOS)
- ⚠️ Apenas PWA instalado (iOS 16.4+)
- ✅ Notificações básicas
- ❌ Sem ações avançadas
- ❌ Sem badge API

---

## 🚨 Problemas Comuns

### "Notificações não aparecem"
1. Verificar permissão: `Notification.permission === 'granted'`
2. Verificar Service Worker ativo
3. Verificar VAPID keys configuradas
4. Ver console para logs de bloqueio

### "Notificações não agrupam"
1. Verificar se `group_similar` está ativo na categoria
2. Verificar se `tag` está sendo usado corretamente
3. Navegador precisa suportar (Chrome/Edge melhor)

### "Rate limiting muito restritivo"
1. Ajustar limites em `useNotificationRateLimit.tsx`
2. Aumentar RATE_LIMITS por categoria
3. Considerar aumentar WINDOW_DURATION

### "Som não toca"
1. Verificar preferências globais (som ativado?)
2. Verificar categoria (som ativado?)
3. Navegador pode bloquear som se usuário não interagiu
4. Verificar `silent: false` no payload

---

## 📊 Métricas Importantes

Para acompanhar a saúde do sistema:

```typescript
// Taxa de entrega
const deliveryRate = notificationsSent / notificationsAttempted;

// Taxa de cliques
const clickRate = notificationsClicked / notificationsSent;

// Taxa de agrupamento
const groupingRate = notificationsGrouped / notificationsSent;

// Taxa de bloqueio por rate limit
const rateLimitRate = notificationsBlocked / notificationsAttempted;
```

Adicionar tracking destes eventos na tabela `analytics_events` para monitoramento.

---

## 🔄 Manutenção

### Cleanup Automático
Configure um cron job para limpar dados antigos:

```sql
-- Executar a cada hora
SELECT cron.schedule(
  'cleanup-notifications',
  '0 * * * *', -- A cada hora
  $$
  SELECT cleanup_expired_notifications();
  $$
);
```

### Monitoramento
Queries úteis para monitorar:

```sql
-- Ver rate limits ativos
SELECT user_id, conversation_id, category, count, window_start
FROM notification_rate_limit
WHERE window_start > now() - interval '1 hour'
ORDER BY count DESC;

-- Ver notificações agrupadas recentemente
SELECT conversation_id, category, title, grouped_count, sent_at
FROM notification_history
WHERE sent_at > now() - interval '1 hour'
AND grouped_count > 1
ORDER BY grouped_count DESC;

-- Ver categorias mais bloqueadas
SELECT category, COUNT(*) as blocked_count
FROM notification_rate_limit
WHERE count >= 30
GROUP BY category
ORDER BY blocked_count DESC;
```

---

## ✅ Status das Fases

- ✅ **Fase 1**: Infraestrutura Push - Service Worker, VAPID, tokens, deep links
- ✅ **Fase 2**: Preferências Globais - Som, vibração, badges, quiet hours
- ✅ **Fase 3**: Preferências por Conversa - Modos, silêncio temporário
- ✅ **Fase 4**: Categorias e Priorização - 5 categorias, rate limiting, agrupamento

**Próximo: Fase 5** - Sincronização Multi-device

---

## 🎊 Conclusão da Fase 4

O sistema de notificações agora é **completo e robusto**:

✨ **5 categorias** configuráveis individualmente  
✨ **4 níveis de prioridade** com comportamentos distintos  
✨ **Rate limiting** inteligente por categoria  
✨ **Agrupamento automático** para reduzir spam  
✨ **Anti-spam** com limites por minuto  
✨ **Preferências em 3 camadas** (global, conversa, categoria)  

**Pronto para produção!** 🚀
