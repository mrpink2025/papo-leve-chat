// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Service Worker para notificações push com sincronização multi-device

// Variável global para tracking de notificações (deduplicação)
let notificationDedupeCache = new Map();

// Limpar cache de deduplicação a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of notificationDedupeCache.entries()) {
    if (now - timestamp > 60000) { // 1 minuto
      notificationDedupeCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Mapear prioridade para configurações de notificação
const PRIORITY_SETTINGS = {
  urgent: {
    vibrate: [400, 200, 400, 200, 400, 200, 400, 200, 400], // Vibração mais longa para chamadas
    requireInteraction: true,
    silent: false,
  },
  high: {
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
  },
  normal: {
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
  },
  low: {
    vibrate: undefined,
    requireInteraction: false,
    silent: true,
  },
};

// Configurações especiais para chamadas
const CALL_SETTINGS = {
  vibrate: [800, 400, 800, 400, 800, 400, 800], // Padrão de toque
  requireInteraction: true,
  silent: false,
  renotify: true,
};

// Escutar mensagens para sincronização de badges
self.addEventListener('message', (event) => {
  if (event.data?.type === 'BADGE_UPDATE') {
    const { count, userId } = event.data;
    
    // Atualizar badge
    if (self.registration?.setAppBadge) {
      if (count > 0) {
        self.registration.setAppBadge(count);
      } else {
        self.registration.clearAppBadge();
      }
    }
    
    // Broadcast para outras tabs
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'BADGE_SYNC',
          count,
          userId
        });
      });
    });
  }
  // Manter compatibilidade com mensagens antigas
  else if (event.data?.type === 'SET_BADGE') {
    if ('setAppBadge' in self.registration) {
      self.registration.setAppBadge(event.data.count).catch((error) => {
        console.error('Error setting app badge:', error);
      });
    }
  } else if (event.data?.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in self.registration) {
      self.registration.clearAppBadge().catch((error) => {
        console.error('Error clearing app badge:', error);
      });
    }
  }
});

// Ouvir notificações push
self.addEventListener('push', (event) => {
  console.log('[SW Push] 🔔 Push notification received', event);

  if (!event.data) {
    console.log('[SW Push] ⚠️ Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    const { notification, badge } = data;
    
    console.log('[SW Push] 📦 Payload:', { 
      title: notification.title,
      category: notification.data?.category,
      callId: notification.data?.callId,
      badge
    });
    
    // Deduplicação: verificar se já mostramos esta notificação
    const notifId = notification.data?.notificationId;
    if (notifId) {
      const lastShown = notificationDedupeCache.get(notifId);
      if (lastShown && (Date.now() - lastShown < 5000)) {
        console.log('[SW Push] 🚫 Notificação duplicada ignorada:', notifId);
        return;
      }
      notificationDedupeCache.set(notifId, Date.now());
    }
    
    // Se for ação de cancelar chamada, fechar notificação existente e não mostrar nova
    if (notification.data?.action === 'cancel-call') {
      const callId = notification.data?.callId;
      if (callId) {
        console.log('[SW Push] 🚫 Cancelando notificação de chamada:', callId);
        event.waitUntil(
          self.registration.getNotifications({ tag: `call:${callId}` })
            .then(notifications => {
              notifications.forEach(n => n.close());
              console.log('[SW Push] ✅ Notificações fechadas:', notifications.length);
            })
        );
      }
      return; // Não mostrar notificação de cancelamento
    }
    
    // Atualizar badge com o contador recebido
    if (badge !== undefined && self.registration?.setAppBadge) {
      if (badge > 0) {
        self.registration.setAppBadge(badge);
      } else {
        self.registration.clearAppBadge();
      }
    }
    
    const title = notification.title || 'Nova mensagem';
    const priority = notification.data?.priority || 'normal';
    const category = notification.data?.category || 'messages';
    const isCall = category === 'call';
    const callId = notification.data?.callId;
    
    // Usar configurações especiais para chamadas
    const prioritySettings = isCall 
      ? CALL_SETTINGS 
      : (PRIORITY_SETTINGS[priority] || PRIORITY_SETTINGS.normal);
    
    // Tag única para chamadas (permite cancelamento multi-device)
    const notificationTag = isCall && callId 
      ? `call:${callId}` 
      : (notification.tag || 'nosso-papo-notification');
    
    // Configurações baseadas na prioridade/categoria
    const notificationOptions = {
      body: notification.body || 'Você tem uma nova mensagem',
      icon: notification.icon || '/app-icon-192.png',
      badge: notification.badge || '/app-icon-192.png',
      tag: notificationTag,
      data: { 
        ...notification.data,
        callId: callId, // Garantir que callId está presente
      },
      renotify: isCall ? true : (notification.renotify || false),
      silent: notification.silent || prioritySettings.silent,
      requireInteraction: notification.requireInteraction || prioritySettings.requireInteraction,
      vibrate: notification.silent ? [] : (prioritySettings.vibrate || [200, 100, 200]),
      actions: isCall 
        ? [
            { action: 'answer', title: 'Atender', icon: '/app-icon-192.png' },
            { action: 'decline', title: 'Recusar', icon: '/app-icon-192.png' },
          ]
        : (priority === 'urgent' 
            ? [
                { action: 'answer', title: 'Atender' },
                { action: 'decline', title: 'Recusar' },
              ]
            : [
                { action: 'open', title: 'Abrir' },
                { action: 'close', title: 'Fechar' },
              ]
          ),
    };

    event.waitUntil(
      Promise.all([
        // Mostrar notificação
        self.registration.showNotification(title, notificationOptions),
        
        // Notificar todas as tabs abertas para sincronização
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'NOTIFICATION_RECEIVED',
              notification: notification,
              badge: badge,
            });
          });
        })
      ])
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
  }
});

// Lidar com cliques em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);
  
  const isCall = event.notification.data?.category === 'call';
  const callId = event.notification.data?.callId;
  
  event.notification.close();

  // Se a ação é recusar chamada
  if (event.action === 'decline') {
    if (isCall && callId) {
      // Atualizar status da chamada no banco para 'rejected'
      event.waitUntil(
        fetch(`https://valazbmgqazykdzcwfcs.supabase.co/rest/v1/call_notifications?id=eq.${callId}`, {
          method: 'PATCH',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbGF6Ym1ncWF6eWtkemN3ZmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1ODI1OTIsImV4cCI6MjA3NjE1ODU5Mn0.BKwXC0ZnGz1F0W7uMoJQcaUvN5K6mNJk5fYdj1LukFI',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'rejected', ended_at: new Date().toISOString() }),
        })
      );
    }
    return;
  }

  // Se a ação é fechar notificação normal
  if (event.action === 'close') {
    return;
  }

  // Para chamadas, abrir rota /call/:callId
  const callId = event.notification.data?.callId;
  const conversationId = event.notification.data?.conversationId;
  let urlToOpen = event.notification.data?.url || '/app';
  
  // Se for chamada, usar rota dedicada
  if (isCall && callId) {
    urlToOpen = `/call/${callId}`;
    console.log('[SW] 📞 Abrindo chamada em:', urlToOpen);
  }

  event.waitUntil(
    Promise.all([
      // Abrir ou focar na janela
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          // Para chamadas, sempre abrir nova janela
          if (isCall && clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
          
          // Para mensagens normais, tentar focar janela existente
          for (const client of windowClients) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus().then(focusedClient => {
                focusedClient.postMessage({
                  type: 'NOTIFICATION_CLICKED',
                  conversationId: conversationId,
                });
                
                if (conversationId && focusedClient.navigate) {
                  return focusedClient.navigate(`/chat/${conversationId}`);
                }
                return focusedClient;
              });
            }
          }
          
          // Abrir nova janela
          if (clients.openWindow) {
            const targetUrl = conversationId 
              ? `/chat/${conversationId}` 
              : urlToOpen;
            return clients.openWindow(targetUrl);
          }
        }),
      
      // Limpar badge se não houver mais notificações
      self.registration.getNotifications().then(notifications => {
        if (notifications.length === 0 && self.registration?.clearAppBadge) {
          self.registration.clearAppBadge();
        }
      })
    ])
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed', event);
  
  // Verificar se ainda há notificações e atualizar badge
  event.waitUntil(
    self.registration.getNotifications().then(notifications => {
      if (notifications.length === 0 && self.registration?.clearAppBadge) {
        self.registration.clearAppBadge();
      }
    })
  );
});
