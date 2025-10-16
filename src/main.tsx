// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Force Service Worker update - remove after 1 week (2025-10-23)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName.includes('workbox') || cacheName.includes('np-')) {
          return caches.delete(cacheName);
        }
      })
    );
  });
}

createRoot(document.getElementById("root")!).render(<App />);
