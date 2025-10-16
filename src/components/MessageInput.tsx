import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Smile, Image as ImageIcon, Mic, File as FileIcon, Video, Loader2 } from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import ReplyPreview from "./ReplyPreview";
import VoiceRecorder from "./VoiceRecorder";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, metadata?: any, replyTo?: string) => void;
  conversationId?: string;
  onTyping?: (isTyping: boolean) => void;
  replyTo?: { id: string; content: string; senderName?: string };
  onCancelReply?: () => void;
}

const MessageInput = ({ onSendMessage, conversationId, onTyping, replyTo, onCancelReply }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading } = useFileUpload();
  const { isOnline } = useOfflineQueue();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message, "text", undefined, replyTo?.id);
      setMessage("");
      if (onTyping) onTyping(false);
      if (onCancelReply) onCancelReply();
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "document") => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    const url = await uploadFile({ file, conversationId, type });
    if (url) {
      onSendMessage(
        type === "image" ? "Imagem" : type === "video" ? "Vídeo" : "Documento",
        type,
        { url, filename: file.name }
      );
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (documentInputRef.current) documentInputRef.current.value = "";
  };

  const handleVoiceSend = async (audioBlob: Blob) => {
    if (!conversationId) return;

    const file = new File(
      [audioBlob],
      `voice_${Date.now()}.webm`,
      { type: "audio/webm" }
    );

    const url = await uploadFile({ file, conversationId, type: "voice" });
    if (url) {
      onSendMessage("Mensagem de voz", "voice", { url, filename: file.name });
    }
    setShowRecorder(false);
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

  if (showRecorder) {
    return <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowRecorder(false)} />;
  }

  return (
    <div className="border-t border-border bg-card">
      {replyTo && onCancelReply && (
        <div className="px-4 pt-3">
          <ReplyPreview
            content={replyTo.content}
            senderName={replyTo.senderName}
            onCancel={onCancelReply}
          />
        </div>
      )}
      
      <div className="flex items-end gap-2 p-4">
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
          onChange={(e) => handleFileSelect(e, "image")}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={(e) => handleFileSelect(e, "video")}
          className="hidden"
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => handleFileSelect(e, "document")}
          className="hidden"
        />

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !conversationId}
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploading || !conversationId}
        >
          <Video size={20} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => documentInputRef.current?.click()}
          disabled={uploading || !conversationId}
        >
          <FileIcon size={20} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => setShowRecorder(true)}
          disabled={!conversationId}
        >
          <Mic size={20} />
        </Button>

        <Textarea
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isOnline ? "Digite uma mensagem..." : "Sem conexão - mensagem será enviada quando reconectar"}
          className={`flex-1 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary min-h-[44px] max-h-[120px] resize-none py-3 ${
            !isOnline ? "text-muted-foreground" : ""
          }`}
          rows={1}
          disabled={!conversationId}
        />

        <Button
          onClick={handleSend}
          size="icon"
          className="bg-primary hover:bg-primary-glow text-primary-foreground shrink-0 transition-all hover:scale-105"
          disabled={!message.trim() || !conversationId}
        >
          <Send size={20} />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
