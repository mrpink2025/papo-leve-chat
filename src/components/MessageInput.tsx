import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Smile, Image as ImageIcon, Loader2 } from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, metadata?: any) => void;
  conversationId?: string;
  onTyping?: (isTyping: boolean) => void;
}

const MessageInput = ({ onSendMessage, conversationId, onTyping }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, uploading } = useFileUpload();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
      if (onTyping) onTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    const url = await uploadImage(file, conversationId);
    if (url) {
      onSendMessage("Imagem", "image", { url, filename: file.name });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);

    // Handle typing indicator
    if (onTyping) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex items-end gap-2">
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <Smile size={20} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 border-none" align="start">
            <EmojiPicker onEmojiClick={handleEmojiClick} width="100%" />
          </PopoverContent>
        </Popover>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !conversationId}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <ImageIcon size={20} />
          )}
        </Button>

        <Textarea
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
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
