import { useState, useEffect } from "react";
import { toast } from "sonner";

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Você está online novamente!", {
        description: "Suas mensagens serão sincronizadas automaticamente.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Você está offline", {
        description: "Suas mensagens serão enviadas quando voltar a ter conexão.",
        duration: Infinity,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
};
