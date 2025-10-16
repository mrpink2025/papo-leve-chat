import { format } from "date-fns";
import { CheckCheck, Reply, Loader2, RotateCw } from "lucide-react";
import { MessageActions } from "./MessageActions";
import { useReactions } from "@/hooks/useReactions";
import ReactionPicker from "./ReactionPicker";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  id: string;
  content: string;
  timestamp: Date;
  isSent: boolean;
  isRead?: boolean;
  type?: string;
  metadata?: any;
  edited?: boolean;
  replyTo?: string;
  replyContent?: string;
  status?: "sending" | "sent" | "read" | "error";
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string, content: string) => void;
  onRetry?: (messageId: string) => void;
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
  replyTo,
  replyContent,
  status = "sent",
  onEdit,
  onDelete,
  onReply,
  onRetry,
}: MessageBubbleProps) => {
  const { groupedReactions, addReaction, removeReaction } = useReactions(id);
  const hasReactions = Object.keys(groupedReactions).length > 0;
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
        
        <div className="relative">
          <div
            className={`rounded-lg px-3 py-2 shadow-message backdrop-blur-sm ${
              isSent
                ? "bg-message-sent text-message-sent-foreground rounded-br-sm"
                : "bg-message-received text-message-received-foreground rounded-bl-sm border border-border/50"
            } ${status === "error" ? "opacity-50" : ""}`}
          >
            {/* Reply preview */}
            {replyTo && replyContent && (
              <div className="mb-2 pb-2 border-l-2 border-primary/50 pl-2">
                <p className="text-xs text-muted-foreground line-clamp-2">{replyContent}</p>
              </div>
            )}
            
            {/* Message content */}
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
            ) : type === "voice" && metadata?.url ? (
              <audio controls src={metadata.url} className="max-w-full" />
            ) : type === "video" && metadata?.url ? (
              <video controls src={metadata.url} className="max-w-full rounded-lg" />
            ) : type === "document" && metadata?.url ? (
              <a
                href={metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline"
              >
                📄 {metadata.filename || "Documento"}
              </a>
            ) : (
              <p className="text-sm break-words leading-relaxed">{content}</p>
            )}
            
            {/* Metadata row */}
            <div className={`flex items-center gap-2 mt-1 ${isSent ? "justify-end" : "justify-start"}`}>
              {edited && (
                <span className="text-[10px] text-muted-foreground/60 italic">editada</span>
              )}
              {status === "sending" && <Loader2 size={11} className="animate-spin" />}
              {status === "error" && onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-destructive hover:text-destructive"
                  onClick={() => onRetry(id)}
                >
                  <RotateCw size={11} className="mr-1" />
                  <span className="text-[10px]">Tentar novamente</span>
                </Button>
              )}
              <span
                className={`text-[11px] ${
                  isSent ? "text-message-sent-foreground/60" : "text-muted-foreground/80"
                }`}
              >
                {format(timestamp, "HH:mm")}
              </span>
              {isSent && status === "sent" && (
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

          {/* Reactions */}
          {hasReactions && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(groupedReactions).map(([emoji, reactions]) => (
                <button
                  key={emoji}
                  onClick={() => removeReaction(emoji)}
                  className="flex items-center gap-1 bg-muted hover:bg-muted/80 rounded-full px-2 py-0.5 text-xs transition-colors"
                >
                  <span>{emoji}</span>
                  <span className="text-muted-foreground">{reactions.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action buttons (hover) */}
          <div className="absolute -top-3 right-0 flex items-center gap-1">
            {onReply && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onReply(id, content)}
              >
                <Reply size={16} />
              </Button>
            )}
            <ReactionPicker onReactionSelect={addReaction} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
