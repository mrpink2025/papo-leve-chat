import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  timestamp: Date;
  isSent: boolean;
  isRead?: boolean;
  type?: string;
  metadata?: any;
}

const MessageBubble = ({
  content,
  timestamp,
  isSent,
  isRead = false,
  type = "text",
  metadata,
}: MessageBubbleProps) => {
  return (
    <div
      className={`flex ${isSent ? "justify-end" : "justify-start"} mb-2 animate-fade-in`}
    >
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 shadow-message backdrop-blur-sm ${
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
          className={`flex items-center gap-1 mt-1 ${
            isSent ? "justify-end" : "justify-start"
          }`}
        >
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
  );
};

export default MessageBubble;
