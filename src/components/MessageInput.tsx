import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Smile, Image as ImageIcon, Mic, File as FileIcon, Video, Loader2, Plus, Camera, Film } from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import ReplyPreview from "./ReplyPreview";
import VoiceRecorder from "./VoiceRecorder";
import VideoRecorder from "./VideoRecorder";
import CameraCapture from "./CameraCapture";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

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
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
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

    const url = await uploadFile({ file, conversationId, type: "audio" });
    if (url) {
      onSendMessage("Mensagem de voz", "audio", { url, filename: file.name });
    }
    setShowRecorder(false);
  };

  const handleVideoSend = async (videoBlob: Blob) => {
    if (!conversationId) return;

    const file = new File(
      [videoBlob],
      `video_${Date.now()}.webm`,
      { type: "video/webm" }
    );

    const url = await uploadFile({ file, conversationId, type: "video" });
    if (url) {
      onSendMessage("Vídeo", "video", { url, filename: file.name });
    }
    setShowVideoRecorder(false);
  };

  const handleCameraCapture = async (blob: Blob, type: "image" | "video") => {
    if (!conversationId) return;

    const file = new File(
      [blob],
      `camera_${type}_${Date.now()}.${type === "image" ? "jpg" : "webm"}`,
      { type: type === "image" ? "image/jpeg" : "video/webm" }
    );

    const url = await uploadFile({ 
      file, 
      conversationId, 
      type: type === "image" ? "image" : "video" 
    });
    
    if (url) {
      onSendMessage(
        type === "image" ? "Foto" : "Vídeo",
        type,
        { url, filename: file.name }
      );
    }
    setShowCamera(false);
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

  if (showVideoRecorder) {
    return <VideoRecorder onSend={handleVideoSend} onCancel={() => setShowVideoRecorder(false)} />;
  }

  if (showCamera) {
    return <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />;
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
        {/* Hidden file inputs */}
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

        {/* Botão de Emoji */}
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
              title="Emoji"
            >
              <Smile size={22} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 border-none shadow-lg" align="start" side="top">
            <EmojiPicker onEmojiClick={handleEmojiClick} width="100%" />
          </PopoverContent>
        </Popover>

        {/* Menu de Anexos (estilo WhatsApp) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
              disabled={uploading || !conversationId}
              title="Anexar"
            >
              {uploading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <Plus size={22} />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            side="top"
            className="w-48 bg-card shadow-lg"
          >
            <DropdownMenuItem
              onClick={() => setShowCamera(true)}
              className="flex items-center gap-3 py-3 cursor-pointer hover:bg-accent"
            >
              <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                <Camera size={20} className="text-pink-500" />
              </div>
              <span className="font-medium">Câmera</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 py-3 cursor-pointer hover:bg-accent"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <ImageIcon size={20} className="text-blue-500" />
              </div>
              <span className="font-medium">Galeria</span>
            </DropdownMenuItem>
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-3 py-3 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Video size={20} className="text-purple-500" />
                </div>
                <span className="font-medium">Vídeo</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-card">
                <DropdownMenuItem
                  onClick={() => setShowVideoRecorder(true)}
                  className="flex items-center gap-2 py-2 cursor-pointer"
                >
                  <Camera size={18} className="text-purple-500" />
                  <span>Gravar Vídeo</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => videoInputRef.current?.click()}
                  className="flex items-center gap-2 py-2 cursor-pointer"
                >
                  <Film size={18} className="text-purple-500" />
                  <span>Escolher da Galeria</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            
            <DropdownMenuItem
              onClick={() => documentInputRef.current?.click()}
              className="flex items-center gap-3 py-3 cursor-pointer hover:bg-accent"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <FileIcon size={20} className="text-green-500" />
              </div>
              <span className="font-medium">Documento</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Campo de mensagem */}
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

        {/* Botão de Enviar ou Áudio (estilo WhatsApp) */}
        {message.trim() ? (
          <Button
            onClick={handleSend}
            size="icon"
            className="bg-primary hover:bg-primary-glow text-primary-foreground shrink-0 transition-all hover:scale-105"
            disabled={!conversationId}
            title="Enviar mensagem"
          >
            <Send size={20} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
            onClick={() => setShowRecorder(true)}
            disabled={!conversationId}
            title="Gravar áudio"
          >
            <Mic size={22} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
