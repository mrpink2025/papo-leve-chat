import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Smile, Paperclip } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
}

const MessageInput = ({ onSendMessage }: MessageInputProps) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex items-end gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
          <Smile size={20} />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
          <Paperclip size={20} />
        </Button>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary min-h-[44px] max-h-[120px] resize-none py-3"
          rows={1}
        />
        <Button
          onClick={handleSend}
          size="icon"
          className="bg-primary hover:bg-primary-glow text-primary-foreground shrink-0 transition-all hover:scale-105"
          disabled={!message.trim()}
        >
          <Send size={20} />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
