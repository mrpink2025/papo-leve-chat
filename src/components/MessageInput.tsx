import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import ImageUpload from "./ImageUpload";

interface MessageInputProps {
  conversationId: string;
  onSendMessage: (message: string) => void;
  onTyping?: (isTyping: boolean) => void;
}

const MessageInput = ({ conversationId, onSendMessage, onTyping }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Trigger typing indicator
    if (onTyping) {
      onTyping(true);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleImageSelect = async (url: string) => {
    // Send image as message with metadata
    onSendMessage(`[IMAGE]${url}`);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (onTyping) {
        onTyping(false);
      }
    };
  }, [onTyping]);

  return (
    <div className="border-t border-border bg-card p-4 relative">
      <div className="flex items-end gap-2">
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        <ImageUpload
          conversationId={conversationId}
          onImageSelected={handleImageSelect}
        />
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
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
