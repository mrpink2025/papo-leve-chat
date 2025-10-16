import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { Button } from "@/components/ui/button";
import { Mic, X, Send } from "lucide-react";
import { useEffect } from "react";

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob) => void;
  onCancel: () => void;
}

const VoiceRecorder = ({ onSend, onCancel }: VoiceRecorderProps) => {
  const { isRecording, duration, startRecording, stopRecording, cancelRecording } =
    useVoiceRecorder();

  useEffect(() => {
    startRecording();
    return () => {
      cancelRecording();
    };
  }, []);

  const handleStop = async () => {
    const blob = await stopRecording();
    onSend(blob);
  };

  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 p-4 border-t bg-card animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 animate-pulse">
          <Mic size={20} className="text-destructive" />
        </div>
        <span className="text-sm font-mono">{formatDuration(duration)}</span>
      </div>

      <div className="flex-1" />

      <Button variant="ghost" size="icon" onClick={handleCancel}>
        <X size={20} />
      </Button>

      <Button size="icon" onClick={handleStop} className="bg-primary">
        <Send size={20} />
      </Button>
    </div>
  );
};

export default VoiceRecorder;
