import { useState, useEffect } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HistoryVisibilityNoticeProps {
  conversationId: string;
}

export const HistoryVisibilityNotice = ({ conversationId }: HistoryVisibilityNoticeProps) => {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `history-notice-dismissed-${conversationId}`;

  useEffect(() => {
    const isDismissed = localStorage.getItem(storageKey) === "true";
    setDismissed(isDismissed);
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 mb-4 mx-4 rounded-r-lg animate-fade-in">
      <div className="flex items-start gap-3">
        <Info size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            Histórico de mensagens
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            Você só vê as mensagens enviadas após entrar no grupo. Mensagens anteriores não são acessíveis.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-6 w-6 shrink-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
};
