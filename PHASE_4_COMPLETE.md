# ✅ Fase 4 Concluída: Categorias e Priorização

## 🎉 Implementado

A Fase 4 do sistema de notificações está completa! Sistema robusto de categorias, priorização, rate limiting e agrupamento implementado.

---

## 📦 O que foi criado

### 1. **Banco de Dados**

#### Enums
- `notification_category`: 'messages', 'mentions', 'calls', 'reactions', 'system'
- `notification_priority`: 'low', 'normal', 'high', 'urgent'

#### Tabelas
- **`notification_category_preferences`** - Preferências por categoria
  - Ativar/desativar por categoria
  - Prioridade configurável
  - Som individual por categoria
  - Flag de agrupamento

- **`notification_rate_limit`** - Rate limiting
  - Contador por usuário + conversa + categoria
  - Janela de 1 minuto
  - Auto-limpeza de registros antigos

- **`notification_history`** - Histórico para agrupamento
  - Registro de notificações enviadas
  - Contador de agrupamento
  - Expira em 12 horas
  - Usado para consolidar notificações similares

#### Função
- `cleanup_expired_notifications()` - Limpa histórico e rate limits antigos

### 2. **Hooks React**

#### `useNotificationCategories`
Gerencia preferências de categorias:
```typescript
const {
  categoryPreferences,        // Array com todas as preferências
  getCategorySettings,        // Obter config de uma categoria
  isCategoryEnabled,          // Verificar se categoria está ativa
  getCategoryPriority,        // Obter prioridade da categoria
  updateCategory,             // Atualizar preferências
} = useNotificationCategories();
```

#### `useNotificationRateLimit`
Controla rate limiting:
```typescript
const {
  checkRateLimit,      // Verificar se pode enviar
  incrementRateLimit,  // Incrementar contador
  resetRateLimit,      // Resetar (útil para testes)
  rateLimits,          // Limites por categoria
} = useNotificationRateLimit();
```

**Limites por categoria:**
- Mensagens: 30/minuto
- Menções: 10/minuto
- Chamadas: 5/minuto
- Reações: 20/minuto
- Sistema: 10/minuto

#### `useNotificationGrouping`
Gerencia agrupamento:
```typescript
const {
  shouldGroupNotification,    // Verificar e agrupar se necessário
  cleanupOldNotifications,    // Limpar notificações expiradas
} = useNotificationGrouping();
```

#### `useNotificationManager` 🌟 (CENTRAL)
**Hook principal** que integra tudo:
```typescript
const {
  shouldSendNotification,  // Decisão completa (todas as verificações)
  sendNotification,        // Enviar notificação genérica
  notifyNewMessage,        // Helper para mensagens
  notifyReaction,          // Helper para reações
  notifyCall,              // Helper para chamadas
  notifySystem,            // Helper para sistema
} = useNotificationManager();
```

### 3. **Componente UI**

#### `NotificationCategorySettings`
Card completo para configurar categorias:
- ✅ Lista todas as 5 categorias
- ✅ Toggle para ativar/desativar cada uma
- ✅ Badge visual de prioridade (Urgente/Alta/Normal/Baixa)
- ✅ Controles de som por categoria
- ✅ Controles de agrupamento por categoria
- ✅ Ícones intuitivos para cada categoria
- ✅ Info box explicando priorização

---

## 🎯 Sistema de Categorias

### **5 Categorias Implementadas**

| Categoria | Ícone | Prioridade | Som Padrão | Agrupa | Descrição |
|-----------|-------|------------|------------|---------|-----------|
| **Menções** | @ | 🔴 Urgente→Alta | ✅ | ❌ | @você ou @todos |
| **Chamadas** | 📞 | 🔴 Urgente | ✅ | ❌ | Voz e vídeo |
| **Mensagens** | 💬 | 🔵 Normal | ✅ | ✅ | Mensagens normais |
| **Reações** | ❤️ | ⚪ Baixa | ❌ | ✅ | Reações às mensagens |
| **Sistema** | ℹ️ | ⚪ Baixa | ❌ | ✅ | Admin, grupo, avisos |

---

## 🎚️ Sistema de Priorização

### **Níveis de Prioridade**

1. **🔴 Urgente** (Chamadas)
   - Som alto e distintivo
   - Vibração forte (padrão: [400, 200, 400])
   - Não agrupa nunca
   - `requireInteraction: true` (notificação fica até ser clicada)
   - Sobrescreve Quiet Hours (opcional por configuração)

2. **🟠 Alta** (Menções)
   - Som notável
   - Vibração média (padrão: [200, 100, 200])
   - Nunca agrupa
   - Sempre visível, mesmo em tela bloqueada
   - Bypass parcial de rate limiting (+50% do limite)

3. **🔵 Normal** (Mensagens)
   - Som padrão
   - Vibração normal (padrão: [200, 100, 200])
   - Agrupa por conversa (se configurado)
   - Rate limiting padrão

4. **⚪ Baixa** (Reações, Sistema)
   - Sem som por padrão
   - Sem vibração
   - Sempre agrupa
   - Rate limiting rigoroso
   - Pode ser enviado como "resumo" em lote

---

## 🛡️ Rate Limiting e Anti-Spam

### **Limites por Categoria**
```typescript
const RATE_LIMITS = {
  messages: 30,    // 30 mensagens/minuto por conversa
  mentions: 10,    // 10 menções/minuto
  calls: 5,        // 5 chamadas/minuto
  reactions: 20,   // 20 reações/minuto (agrupadas)
  system: 10,      // 10 notificações sistema/minuto
};
```

### **Janela de Tempo**
- 1 minuto por janela
- Contador é incrementado a cada notificação
- Reset automático após 1 minuto
- Limpeza de registros antigos (> 1 hora)

### **Comportamento ao Exceder**
1. Notificações excedentes são **bloqueadas**
2. Se agrupamento estiver ativo, **consolida** em uma notificação
3. Exemplo: 50 mensagens em 1 min → 1 notificação "50 novas mensagens"

---

## 📦 Sistema de Agrupamento

### **Como Funciona**

1. **Janela de Agrupamento**: 30 segundos
2. **Critérios**:
   - Mesma conversa
   - Mesma categoria
   - Dentro da janela de tempo
   - Categoria tem `group_similar: true`

3. **Processo**:
   ```typescript
   Mensagem 1: "João: Oi"         → Notificação 1: "João: Oi"
   Mensagem 2: "João: Tudo bem?"  → Notificação 1: "João: 2 novas mensagens"
   Mensagem 3: "João: Cadê você?" → Notificação 1: "João: 3 novas mensagens"
   [30s depois]
   Mensagem 4: "João: ?"          → Notificação 2: "João: ?"
   ```

### **Tag de Agrupamento**
```typescript
tag: `conv-${conversationId}` 
// Todas as notificações da mesma conversa compartilham a mesma tag
// Navegador automaticamente substitui notificação antiga pela nova
```

### **Categorias que Agrupam**
- ✅ Mensagens (se configurado)
- ✅ Reações (sempre)
- ✅ Sistema (sempre)
- ❌ Menções (nunca agrupa)
- ❌ Chamadas (nunca agrupa)

---

## 🔄 Fluxo Completo de Decisão

```
Nova Mensagem
    ↓
┌─────────────────────────────────┐
│ 1. Verificar Globais (Fase 2)  │
│    - Notificações habilitadas?  │
│    - Quiet Hours ativo?          │
└───────────┬─────────────────────┘
            ↓ SIM
┌─────────────────────────────────┐
│ 2. Verificar Conversa (Fase 3) │
│    - Conversa silenciada?        │
│    - Modo: all/mentions/muted?   │
└───────────┬─────────────────────┘
            ↓ SIM
┌─────────────────────────────────┐
│ 3. Verificar Categoria (Fase 4)│
│    - Categoria habilitada?       │
│    - Prioridade?                 │
└───────────┬─────────────────────┘
            ↓ SIM
┌─────────────────────────────────┐
│ 4. Rate Limiting                │
│    - Dentro do limite?           │
│    - Incrementar contador        │
└───────────┬─────────────────────┘
            ↓ SIM
┌─────────────────────────────────┐
│ 5. Agrupamento                  │
│    - Notificação recente?        │
│    - Categoria agrupa?           │
│    - Consolidar se sim           │
└───────────┬─────────────────────┘
            ↓
    ✅ ENVIAR NOTIFICAÇÃO
```

---

## 💻 Como Integrar no App

### Exemplo: Notificar Nova Mensagem
```typescript
import { useNotificationManager } from '@/hooks/useNotificationManager';
import { useConversationNotifications } from '@/hooks/useConversationNotifications';

// No componente de mensagens
const { notifyNewMessage } = useNotificationManager();
const { shouldNotify } = useConversationNotifications(conversationId);

// Quando nova mensagem chegar
const handleNewMessage = async (message) => {
  // Detectar se é menção
  const isMention = message.content.includes(`@${currentUser.username}`) ||
                   message.content.includes('@todos');

  // Verificar preferências da conversa
  if (!shouldNotify(isMention)) {
    console.log('Notificação bloqueada por preferências da conversa');
    return;
  }

  // Enviar notificação (passa por todas as verificações)
  await notifyNewMessage(
    conversationId,
    message.sender_id,
    senderName,
    message.content,
    message.id,
    senderAvatar,
    isMention
  );
};
```

### Exemplo: Notificar Reação
```typescript
const { notifyReaction } = useNotificationManager();

// Quando alguém reagir à sua mensagem
await notifyReaction(
  conversationId,
  reactorName,
  '❤️',
  'Sua mensagem aqui...',
  messageId
);
```

### Exemplo: Notificar Chamada
```typescript
const { notifyCall } = useNotificationManager();

// Quando receber chamada
await notifyCall(
  conversationId,
  callerName,
  true, // isVideo
  callerAvatar
);
```

---

## 🎨 Interface de Categorias

### Localização
`/app/configuracoes/notificacoes` → Seção "Categorias de notificações"

### Elementos Visuais
- **Card por categoria** com:
  - Ícone colorido
  - Nome e descrição
  - Badge de prioridade (com cores)
  - Toggle principal (ativar/desativar)
  - Controles secundários:
    - Som individual
    - Agrupar similares (quando aplicável)

### Feedback
- ✅ Auto-save em todas as alterações
- ✅ Toast com confirmação
- ✅ Estados de loading
- ✅ Info box explicativa sobre priorização

---

## 🔍 Exemplos Práticos

### Cenário 1: Grupo Muito Ativo
**Problema**: 100 mensagens em 5 minutos
**Solução**:
1. Rate limit: bloqueia após 30/min
2. Agrupamento: consolida em "30 novas mensagens"
3. Resultado: 1 notificação ao invés de 100

### Cenário 2: Menção Importante
**Problema**: Precisa chamar atenção mesmo em grupo silenciado
**Solução**:
1. Categoria "mentions" tem prioridade ALTA
2. Não agrupa nunca
3. Som distintivo
4. Sobrescreve configuração "silenciado" da conversa (se menções ativadas globalmente)

### Cenário 3: Múltiplas Reações
**Problema**: 10 pessoas reagiram à sua mensagem
**Solução**:
1. Categoria "reactions" tem prioridade BAIXA
2. Agrupa automaticamente
3. Sem som por padrão
4. Resultado: "10 pessoas reagiram à sua mensagem"

### Cenário 4: Chamada Urgente
**Problema**: Precisa notificar imediatamente
**Solução**:
1. Categoria "calls" tem prioridade URGENTE
2. Nunca agrupa
3. requireInteraction: true (fica na tela)
4. Som + vibração fortes
5. Sobrescreve Quiet Hours (opcional)

---

## 📊 Estrutura de Dados

### CategoryPreference
```typescript
interface CategoryPreference {
  category: NotificationCategory;
  enabled: boolean;
  priority: NotificationPriority;
  sound_enabled: boolean;
  group_similar: boolean;
}
```

### Valores Padrão por Categoria
```typescript
{
  messages: {
    enabled: true,
    priority: 'normal',
    sound_enabled: true,
    group_similar: true,
  },
  mentions: {
    enabled: true,
    priority: 'high',
    sound_enabled: true,
    group_similar: false, // ← Importante!
  },
  calls: {
    enabled: true,
    priority: 'urgent',
    sound_enabled: true,
    group_similar: false, // ← Importante!
  },
  reactions: {
    enabled: true,
    priority: 'low',
    sound_enabled: false, // ← Sem som por padrão
    group_similar: true,
  },
  system: {
    enabled: true,
    priority: 'low',
    sound_enabled: false,
    group_similar: true,
  },
}
```

---

## 🚀 Performance e Otimização

### Índices Criados
- `user_id` em todas as tabelas
- `conversation_id` + `window_start` em rate_limit
- `user_id` + `conversation_id` + `sent_at` em history
- `expires_at` em history

### Queries Otimizadas
- Usa `maybeSingle()` para evitar erros quando não há dados
- Upsert com `onConflict` para evitar duplicatas
- Batch inserts para criar preferências padrão
- Limita queries a 1 resultado quando apropriado

### Cleanup Automático
- Função `cleanup_expired_notifications()` pode ser agendada
- Remove histórico > 12 horas
- Remove rate limits > 1 hora
- Mantém tabelas leves e performáticas

---

## 🔐 Segurança

### RLS Policies
- ✅ Usuários só veem suas próprias preferências
- ✅ Usuários só veem seu próprio histórico
- ✅ Usuários só veem seus próprios rate limits
- ✅ Rate limits incrementados apenas por backend

### Validação
- ✅ Enums garantem valores válidos
- ✅ Unique constraints evitam duplicatas
- ✅ Foreign keys garantem integridade
- ✅ Timestamps automáticos

---

## 🧪 Testes Sugeridos

### 1. Teste de Rate Limiting
```typescript
// Enviar 50 mensagens rapidamente
for (let i = 0; i < 50; i++) {
  await notifyNewMessage(conversationId, senderId, 'Teste', `Mensagem ${i}`, messageId);
}
// Resultado esperado: Apenas ~30 notificações (ou 1 agrupada)
```

### 2. Teste de Agrupamento
```typescript
// Enviar 5 mensagens em 10 segundos
for (let i = 0; i < 5; i++) {
  await notifyNewMessage(conversationId, senderId, 'João', `Oi ${i}`, messageId);
  await sleep(2000);
}
// Resultado esperado: 1 notificação "João: 5 novas mensagens"
```

### 3. Teste de Priorização
```typescript
// Enviar uma mensagem normal
await notifyNewMessage(conversationId, senderId, 'Maria', 'Oi', messageId, '', false);

// Enviar uma menção
await notifyNewMessage(conversationId, senderId, 'Maria', '@você urgente!', messageId, '', true);

// Resultado esperado: Menção aparece primeiro/com som diferente
```

### 4. Teste de Categorias Desativadas
```typescript
// Desativar categoria "reactions"
await updateCategory({
  category: 'reactions',
  updates: { enabled: false }
});

// Enviar reação
await notifyReaction(conversationId, 'Pedro', '❤️', 'Sua msg', messageId);

// Resultado esperado: Nenhuma notificação enviada
```

---

## 🎯 Próximas Fases

### Fase 5: Sincronização Multi-device (2h)
- Gerenciar múltiplos dispositivos
- Deduplicação entre devices
- Badges sincronizados
- Estados lido/entregue

### Fase 6: Notificações de Chamadas (1-2h)
- Ringtone customizado
- Cartão de chamada interativo
- Chamadas perdidas com callback

### Fase 7: Otimizações Finais (1h)
- Telemetria e analytics
- Performance final
- QA completo

---

## ✨ Destaques da Fase 4

1. **Sistema Robusto**: 5 categorias, 4 prioridades, totalmente configurável
2. **Anti-Spam Inteligente**: Rate limiting por categoria + agrupamento automático
3. **Priorização Clara**: Menções e chamadas sempre têm precedência
4. **Performance**: Índices otimizados, queries eficientes
5. **UX Polida**: Interface intuitiva com badges visuais de prioridade
6. **Segurança**: RLS completo, validação em todos os níveis
7. **Flexibilidade**: Cada categoria pode ser configurada independentemente

---

## 🎊 Conclusão

**Sistema de notificações agora tem:**
- ✅ Fase 1: Infraestrutura Push (SW, VAPID, tokens, deep links)
- ✅ Fase 2: Preferências Globais (som, vibração, badges, quiet hours)
- ✅ Fase 3: Preferências por Conversa (modos, silêncio temporário)
- ✅ Fase 4: Categorias e Priorização (5 categorias, rate limiting, agrupamento)

**Próximo: Fase 5 (Sincronização Multi-device)** 🚀

---

## 📚 Documentação Adicional

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Notification Best Practices](https://web.dev/push-notifications-overview/)
- [Service Worker Notification Events](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)
