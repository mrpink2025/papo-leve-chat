// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// ✅ Registrar Service Worker para Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Registrar sw-push.js para notificações
      const registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registrado:', registration);
      
      // Forçar update se houver nova versão
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              console.log('🔄 Service Worker atualizado, recarregando...');
              window.location.reload();
            }
          });
        }
      });

      // Verificar atualizações a cada 60 segundos
      setInterval(() => {
        registration.update();
      }, 60000);
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
