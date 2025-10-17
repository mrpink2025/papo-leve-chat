import { Lock } from "lucide-react";

export const RestrictedReplyPreview = () => {
  return (
    <div className="mb-2 pb-2 border-l-2 border-muted pl-2 bg-muted/30 rounded-r">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock size={12} />
        <p className="text-xs italic">
          Mensagem anterior à sua entrada no grupo
        </p>
      </div>
    </div>
  );
};
