import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  timestamp: Date;
  isSent: boolean;
  isRead?: boolean;
}

const MessageBubble = ({ content, timestamp, isSent, isRead = false }: MessageBubbleProps) => {
  return (
    <div
      className={`flex ${isSent ? "justify-end" : "justify-start"} mb-2 animate-slide-in`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-message ${
          isSent
            ? "bg-message-sent text-message-sent-foreground rounded-br-sm"
            : "bg-message-received text-message-received-foreground rounded-bl-sm"
        }`}
      >
        <p className="text-sm break-words">{content}</p>
        <div className={`flex items-center gap-1 mt-1 ${isSent ? "justify-end" : "justify-start"}`}>
          <span className={`text-xs ${isSent ? "text-message-sent-foreground/70" : "text-muted-foreground"}`}>
            {format(timestamp, "HH:mm")}
          </span>
          {isSent && (
            <span className="text-message-sent-foreground/70">
              {isRead ? <CheckCheck size={14} /> : <Check size={14} />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
