# 🔔 Configuração de Notificações Push - Nosso Papo

## Fase 1: Fundação ✅

A infraestrutura básica de notificações push está implementada. Para finalizar a configuração, siga estes passos:

---

## 📋 Passo 1: Gerar Chaves VAPID

As chaves VAPID são necessárias para autenticar suas notificações push com os navegadores.

### Opção A: Usar web-push-codelab (Online)
1. Acesse: https://web-push-codelab.glitch.me/
2. Clique em "Generate VAPID Keys"
3. Copie as chaves geradas

### Opção B: Usar Node.js (Local)
```bash
# Instalar web-push globalmente
npm install -g web-push

# Gerar chaves VAPID
web-push generate-vapid-keys
```

Você receberá algo assim:
```
=======================================

Public Key:
BKG... (string longa)

Private Key:
abc... (string longa)

=======================================
```

---

## 📋 Passo 2: Configurar Chaves no Supabase

### 2.1 Adicionar Secrets nas Edge Functions

1. Acesse o Supabase Dashboard
2. Vá em **Edge Functions** → **Settings** (ou use o link abaixo)
3. Adicione os seguintes secrets:

| Nome | Valor |
|------|-------|
| `VAPID_PUBLIC_KEY` | Sua chave pública VAPID |
| `VAPID_PRIVATE_KEY` | Sua chave privada VAPID |

### 2.2 Atualizar o Código Frontend

Edite o arquivo `src/hooks/usePushNotifications.tsx`:

```typescript
// Linha 7: Substituir o placeholder pela sua chave pública
const VAPID_PUBLIC_KEY = 'SUA_CHAVE_PUBLICA_VAPID_AQUI';
```

---

## 📋 Passo 3: Testar Notificações

### 3.1 Ativar Notificações

1. Faça login no app
2. Aguarde 10 segundos - um prompt aparecerá perguntando se você quer ativar notificações
3. Clique em "Ativar" e conceda permissão no navegador
4. ✅ Você verá uma confirmação: "Notificações ativadas"

### 3.2 Verificar Inscrição

Abra o DevTools Console e execute:
```javascript
// Verificar se há uma inscrição ativa
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Inscrição:', sub);
  });
});
```

### 3.3 Enviar Notificação de Teste

Por enquanto, o envio de notificações está configurado mas precisa de integração com web-push. Para testar manualmente:

1. Abra o Console do DevTools
2. Execute:
```javascript
// Simular notificação local (funciona mesmo offline)
new Notification('Teste - Nosso Papo', {
  body: 'Esta é uma notificação de teste!',
  icon: '/app-icon-192.png',
  badge: '/app-icon-192.png',
});
```

---

## 🔧 Próximos Passos (Para Implementação Completa)

### 1. Instalar web-push na Edge Function

O arquivo `supabase/functions/send-push-notification/index.ts` está preparado, mas precisa da biblioteca `web-push` para funcionar.

**Opção A: Usar npm especifier (Recomendado para Deno)**
```typescript
import webpush from 'npm:web-push@3.6.6';
```

**Opção B: Importar via esm.sh**
```typescript
import * as webpush from 'https://esm.sh/web-push@3.6.6';
```

Depois, descomente as linhas 86-95 do arquivo e configure:
```typescript
webpush.setVapidDetails(
  'mailto:seu-email@nossopapo.net',
  VAPID_PUBLIC_KEY!,
  VAPID_PRIVATE_KEY!
);

await webpush.sendNotification(
  {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  },
  notificationPayload
);
```

### 2. Integrar com Sistema de Mensagens

Para enviar notificações quando uma mensagem é recebida, adicione ao hook `useMessages.tsx`:

```typescript
// Após inserir mensagem no banco
if (message.sender_id !== currentUserId) {
  // Buscar destinatário(s)
  const recipients = await getConversationParticipants(conversationId);
  
  // Enviar notificação via Edge Function
  await supabase.functions.invoke('send-push-notification', {
    body: {
      recipientId: recipient.id,
      payload: {
        title: senderName,
        body: message.content,
        icon: senderAvatar || '/app-icon-192.png',
        tag: `conv-${conversationId}`,
        data: {
          url: `/chat/${conversationId}`,
          conversationId: conversationId,
          messageId: message.id,
        },
      },
    },
  });
}
```

### 3. Evitar Notificações Duplicadas

Adicionar verificação se a conversa está aberta:

```typescript
// No hook de mensagens
const isConversationOpen = window.location.pathname.includes(conversationId);
if (!isConversationOpen) {
  // Enviar notificação
}
```

---

## 🎯 Funcionalidades Implementadas

✅ Tabela `push_subscriptions` para armazenar tokens  
✅ Hook `usePushNotifications` para gerenciar permissões  
✅ Componente `PushNotificationPrompt` educacional  
✅ Service Worker customizado com handlers de push  
✅ Deep links para abrir conversas corretas  
✅ Edge Function base para envio de notificações  
✅ Suporte para múltiplos dispositivos  
✅ Auto-limpeza de subscriptions inválidas  

---

## 🔍 Debug e Troubleshooting

### Verificar Service Worker
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs);
});
```

### Verificar Permissão
```javascript
console.log('Notification permission:', Notification.permission);
```

### Ver Inscrições no Banco
```sql
SELECT * FROM push_subscriptions WHERE user_id = 'seu-user-id';
```

### Logs do Service Worker
1. Abra DevTools
2. Vá em Application → Service Workers
3. Clique em "Console" ao lado do Service Worker ativo

---

## 📚 Documentação Útil

- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [web-push Node.js library](https://github.com/web-push-libs/web-push)
- [VAPID Protocol](https://datatracker.ietf.org/doc/html/draft-thomson-webpush-vapid-02)

---

## ⚠️ Limitações Conhecidas

1. **Safari iOS**: Notificações push só funcionam em iOS 16.4+ e apenas para PWAs instalados
2. **Firefox Private Mode**: Push não funciona em modo privado
3. **Permissão Negada**: Usuário precisa ir em configurações do navegador para reativar
4. **Rate Limits**: Navegadores limitam quantidade de notificações simultâneas

---

## 🎉 Conclusão da Fase 1

Você completou a Fase 1! A infraestrutura está pronta. 

**Próximas fases:**
- Fase 2: Preferências Globais
- Fase 3: Preferências por Conversa  
- Fase 4: Categorias e Priorização
- Fase 5: Sincronização Multi-device
- Fase 6: Notificações de Chamadas
- Fase 7: Otimizações Finais

Quer continuar com a Fase 2? 🚀
