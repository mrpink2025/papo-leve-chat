import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import logo from "@/assets/nosso-papo-logo-transparent.png";

const PWAInstallBanner = () => {
  const location = useLocation();
  const { canInstall, promptInstall, isIOS, isInstalled, isPWACapable } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);

  // Modo de teste via query param
  const isTestMode = new URLSearchParams(window.location.search).get("show-pwa-banner") === "true";

  // Verificar dismiss de 7 dias E sessão atual
  useEffect(() => {
    // Checar localStorage (7 dias)
    const dismissedUntil = localStorage.getItem("pwa_banner_dismissed_until");
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        setIsDismissed(true);
        return;
      } else {
        localStorage.removeItem("pwa_banner_dismissed_until");
      }
    }

    // Checar sessionStorage (sessão atual)
    const shownThisSession = sessionStorage.getItem("pwa_banner_shown");
    if (shownThisSession === "true") {
      setHasShownThisSession(true);
      return;
    }

    // Se passou todas as verificações, marcar como mostrado nesta sessão
    if (canInstall && !isInstalled) {
      sessionStorage.setItem("pwa_banner_shown", "true");
      setHasShownThisSession(true);
    }
  }, [canInstall, isInstalled]);

  const handleDismiss = () => {
    setIsDismissed(true);
    const dismissedUntil = new Date();
    dismissedUntil.setDate(dismissedUntil.getDate() + 7); // 7 dias
    localStorage.setItem("pwa_banner_dismissed_until", dismissedUntil.toISOString());
  };

  const handleInstall = async () => {
    if (isIOS) {
      // Para iOS, redirecionar para a página de instruções
      window.location.href = "/install";
    } else {
      const installed = await promptInstall();
      if (installed) {
        setIsDismissed(true);
        // Marcar como instalado para não aparecer mais (1 ano)
        const dismissedUntil = new Date();
        dismissedUntil.setFullYear(dismissedUntil.getFullYear() + 1);
        localStorage.setItem("pwa_banner_dismissed_until", dismissedUntil.toISOString());
      } else {
        // Se o prompt falhar, redirecionar para a página de instruções
        window.location.href = "/install";
      }
    }
  };

  // Não mostrar o banner se:
  // 1. Já está instalado
  // 2. Foi dispensado (7 dias)
  // 3. Já foi mostrado nesta sessão
  // 4. Não pode ser instalado
  // 5. Está na rota de chat (/app/chat/:id ou /chat/:id)
  const isInChatRoute = useMemo(
    () => location.pathname.startsWith("/app/chat") || location.pathname.startsWith("/chat/"),
    [location.pathname]
  );
  
  // Modo teste ignora todas as restrições
  if (isTestMode) {
    console.log("🧪 [PWA Banner] Modo de teste ativado - exibindo banner");
  } else if (isInstalled || isDismissed || hasShownThisSession || !canInstall || isInChatRoute) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300"
      role="banner"
      aria-label="Banner de instalação do aplicativo Nosso Papo"
    >
      <div className="bg-[#FFF5E6] dark:bg-card border border-[#FFE0B3] dark:border-border rounded-2xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <img src={logo} alt="Nosso Papo" className="h-8 w-8" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1A1A1A] dark:text-foreground mb-1">
              Instale o Nosso Papo
            </h3>
            <p className="text-sm text-[#1A1A1A]/70 dark:text-muted-foreground mb-3">
              Acesse suas conversas mais rápido 🚀
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-primary hover:bg-[#E68A00] text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Instalar
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="text-[#1A1A1A] dark:text-foreground hover:underline"
              >
                Agora não
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Fechar banner"
          >
            <X className="h-4 w-4 text-[#1A1A1A]/50 dark:text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
