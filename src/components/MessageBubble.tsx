import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";
import { MessageActions } from "./MessageActions";

interface MessageBubbleProps {
  id: string;
  content: string;
  timestamp: Date;
  isSent: boolean;
  isRead?: boolean;
  type?: string;
  metadata?: any;
  edited?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
}

const MessageBubble = ({
  id,
  content,
  timestamp,
  isSent,
  isRead = false,
  type = "text",
  metadata,
  edited = false,
  onEdit,
  onDelete,
}: MessageBubbleProps) => {
  return (
    <div
      className={`flex ${isSent ? "justify-end" : "justify-start"} mb-2 animate-fade-in group`}
    >
      <div className="flex items-start gap-2 max-w-[75%]">
        {isSent && onEdit && onDelete && (
          <MessageActions
            messageId={id}
            currentContent={content}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        <div
          className={`rounded-lg px-3 py-2 shadow-message backdrop-blur-sm ${
            isSent
              ? "bg-message-sent text-message-sent-foreground rounded-br-sm"
              : "bg-message-received text-message-received-foreground rounded-bl-sm border border-border/50"
          }`}
        >
        {type === "image" && metadata?.url ? (
          <div className="space-y-2">
            <img
              src={metadata.url}
              alt={metadata.filename || "Imagem"}
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
              onClick={() => window.open(metadata.url, "_blank")}
            />
            {content !== "Imagem" && (
              <p className="text-sm break-words leading-relaxed">{content}</p>
            )}
          </div>
        ) : (
          <p className="text-sm break-words leading-relaxed">{content}</p>
        )}
        
        <div
          className={`flex items-center gap-2 mt-1 ${
            isSent ? "justify-end" : "justify-start"
          }`}
        >
          {edited && (
            <span className="text-[10px] text-muted-foreground/60 italic">
              editada
            </span>
          )}
          <span
            className={`text-[11px] ${
              isSent
                ? "text-message-sent-foreground/60"
                : "text-muted-foreground/80"
            }`}
          >
            {format(timestamp, "HH:mm")}
          </span>
          {isSent && (
            <span className="text-message-sent-foreground/60">
              {isRead ? (
                <CheckCheck size={13} className="text-blue-500" />
              ) : (
                <CheckCheck size={13} />
              )}
            </span>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
