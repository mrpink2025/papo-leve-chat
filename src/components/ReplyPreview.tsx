import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReplyPreviewProps {
  content: string;
  senderName?: string;
  onCancel: () => void;
}

const ReplyPreview = ({ content, senderName, onCancel }: ReplyPreviewProps) => {
  return (
    <div className="border-l-4 border-primary bg-muted p-3 flex items-start gap-2 rounded">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1">
          Respondendo a {senderName || "mensagem"}
        </p>
        <p className="text-sm truncate">{content}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={onCancel}
      >
        <X size={14} />
      </Button>
    </div>
  );
};

export default ReplyPreview;
