// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "app-icon-192.png", "app-icon-512.png"],
      manifest: {
        name: "Nosso Papo",
        short_name: "NossoPapo",
        description: "Aplicativo de mensagens rápido, acolhedor e divertido. Onde cada conversa importa.",
        theme_color: "#FF9500",
        background_color: "#FCFCFC",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/app",
        lang: "pt-BR",
        dir: "ltr",
        categories: ["social", "lifestyle"],
        icons: [
          {
            src: "/app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/app-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Abrir Conversas",
            short_name: "Conversas",
            description: "Abrir suas conversas",
            url: "/app",
            icons: [{ src: "/app-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Criar Grupo",
            short_name: "Grupo",
            description: "Criar novo grupo",
            url: "/app?action=new-group",
            icons: [{ src: "/app-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Configurações",
            short_name: "Config",
            description: "Abrir configurações",
            url: "/app/configuracoes",
            icons: [{ src: "/app-icon-192.png", sizes: "192x192" }],
          },
        ],
        share_target: {
          action: "/share",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              {
                name: "media",
                accept: ["image/*", "video/*", "audio/*"],
              },
            ],
          },
        },
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Importar Service Worker customizado para notificações push
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "np-google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "np-supabase-storage-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 semana
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: "NetworkOnly",
            options: {
              cacheName: "np-supabase-api-no-cache",
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
