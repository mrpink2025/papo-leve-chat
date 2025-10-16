// Service Worker customizado para notificações push
// Este arquivo será importado pelo Workbox

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

self.addEventListener('push', (event) => {
  console.log('Push notification received', event);

  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    const notification = data.notification || data;
    
    const title = notification.title || 'Nova mensagem';
    const priority = notification.data?.priority || 'normal';
    const prioritySettings = PRIORITY_SETTINGS[priority] || PRIORITY_SETTINGS.normal;
    
    const options = {
      body: notification.body || 'Você tem uma nova mensagem',
      icon: notification.icon || '/app-icon-192.png',
      badge: notification.badge || '/app-icon-192.png',
      tag: notification.tag || 'nosso-papo-notification',
      data: notification.data || {},
      renotify: true, // Reagrupar notificações com mesma tag
      // Aplicar configurações de prioridade
      vibrate: notification.silent ? undefined : prioritySettings.vibrate,
      requireInteraction: prioritySettings.requireInteraction,
      silent: notification.silent || prioritySettings.silent,
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
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/app';
  
  // Se a ação é fechar, não fazer nada
  if (event.action === 'close') {
    return;
  }

  // Abrir ou focar na janela existente
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Verificar se já existe uma janela aberta
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/app') && 'focus' in client) {
            return client.focus().then((client) => {
              // Navegar para a URL correta se necessário
              if (event.notification.data?.conversationId) {
                return client.navigate(
                  `/chat/${event.notification.data.conversationId}`
                );
              }
              return client;
            });
          }
        }
        
        // Se não existe janela aberta, abrir nova
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed', event);
  // Analytics ou limpeza se necessário
});

// Badge API para contador de notificações
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BADGE') {
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(event.data.count).catch((error) => {
        console.error('Error setting app badge:', error);
      });
    }
  } else if (event.data && event.data.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch((error) => {
        console.error('Error clearing app badge:', error);
      });
    }
  }
});
