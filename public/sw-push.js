// Service Worker customizado para notificações push com sincronização multi-device
// Este arquivo será importado pelo Workbox

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
    vibrate: [400, 200, 400, 200, 400],
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
  console.log('Push notification received', event);

  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    const { notification, badge } = data;
    
    // Deduplicação: verificar se já mostramos esta notificação
    const notifId = notification.data?.notificationId;
    if (notifId) {
      const lastShown = notificationDedupeCache.get(notifId);
      if (lastShown && (Date.now() - lastShown < 5000)) {
        console.log('Notificação duplicada ignorada:', notifId);
        return;
      }
      notificationDedupeCache.set(notifId, Date.now());
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
    const prioritySettings = PRIORITY_SETTINGS[priority] || PRIORITY_SETTINGS.normal;
    
    // Configurações baseadas na prioridade
    const notificationOptions = {
      body: notification.body || 'Você tem uma nova mensagem',
      icon: notification.icon || '/app-icon-192.png',
      badge: notification.badge || '/app-icon-192.png',
      tag: notification.tag || 'nosso-papo-notification',
      data: notification.data || {},
      renotify: notification.renotify || false,
      silent: notification.silent || prioritySettings.silent,
      requireInteraction: notification.requireInteraction || prioritySettings.requireInteraction,
      vibrate: notification.silent ? [] : (prioritySettings.vibrate || [200, 100, 200]),
      actions: priority === 'urgent' 
        ? [
            { action: 'answer', title: 'Atender' },
            { action: 'decline', title: 'Recusar' },
          ]
        : [
            { action: 'open', title: 'Abrir' },
            { action: 'close', title: 'Fechar' },
          ],
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
  
  event.notification.close();

  // Se a ação é fechar, não fazer nada
  if (event.action === 'close' || event.action === 'decline') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/app';
  const conversationId = event.notification.data?.conversationId;

  event.waitUntil(
    Promise.all([
      // Abrir ou focar na janela
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          // Verificar se já existe uma janela aberta
          for (const client of windowClients) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus().then(focusedClient => {
                // Notificar a tab que a notificação foi clicada
                focusedClient.postMessage({
                  type: 'NOTIFICATION_CLICKED',
                  conversationId: conversationId,
                });
                
                // Navegar para a conversa se necessário
                if (conversationId && focusedClient.navigate) {
                  return focusedClient.navigate(`/chat/${conversationId}`);
                }
                return focusedClient;
              });
            }
          }
          // Senão, abrir nova janela
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
