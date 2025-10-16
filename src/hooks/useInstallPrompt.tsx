import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const useInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isPWACapable, setIsPWACapable] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);
    
    console.log("🔍 [PWA Debug] User Agent:", userAgent);
    console.log("🔍 [PWA Debug] Is iOS:", isIOSDevice);

    // Verificar se já está instalado
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const installed = isStandalone || isIOSStandalone;
    setIsInstalled(installed);
    
    console.log("🔍 [PWA Debug] Display Mode Standalone:", isStandalone);
    console.log("🔍 [PWA Debug] iOS Standalone:", isIOSStandalone);
    console.log("🔍 [PWA Debug] Is Installed:", installed);

    // Detectar se é PWA capable
    const isHttps = window.location.protocol === "https:" || window.location.hostname === "localhost";
    const hasServiceWorker = "serviceWorker" in navigator;
    const capable = isHttps && hasServiceWorker;
    setIsPWACapable(capable);
    
    console.log("🔍 [PWA Debug] HTTPS:", isHttps);
    console.log("🔍 [PWA Debug] Service Worker Support:", hasServiceWorker);
    console.log("🔍 [PWA Debug] PWA Capable:", capable);

    // Capturar evento de instalação (apenas Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("✅ [PWA Debug] beforeinstallprompt event fired!");
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detectar quando o app é instalado
    window.addEventListener("appinstalled", () => {
      console.log("✅ [PWA Debug] App installed!");
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    // Log após 3 segundos se o evento não disparou
    setTimeout(() => {
      if (!installPrompt && !isIOSDevice && !installed) {
        console.warn("⚠️ [PWA Debug] beforeinstallprompt não disparou após 3s");
        console.warn("⚠️ Possíveis causas:");
        console.warn("  - App já instalado");
        console.warn("  - Navegador não suporta (Firefox, Safari desktop)");
        console.warn("  - PWA criteria não atendidos (manifest, SW, HTTPS)");
        console.warn("  - Usuário já rejeitou instalação recentemente");
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) {
      return false;
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      setInstallPrompt(null);
      return true;
    }

    return false;
  };

  return {
    installPrompt,
    isInstalled,
    isIOS,
    isPWACapable,
    canInstall: !isInstalled && (!!installPrompt || (isIOS && isPWACapable)),
    promptInstall,
  };
};
