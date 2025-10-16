import { useVideoRecorder } from "@/hooks/useVideoRecorder";
import { Button } from "@/components/ui/button";
import { Video, X, Send, Pause, Play } from "lucide-react";
import { useEffect } from "react";

interface VideoRecorderProps {
  onSend: (videoBlob: Blob) => void;
  onCancel: () => void;
}

const VideoRecorder = ({ onSend, onCancel }: VideoRecorderProps) => {
  const { 
    isRecording, 
    isPaused, 
    duration, 
    videoRef, 
    startRecording, 
    pauseRecording, 
    resumeRecording, 
    stopRecording, 
    cancelRecording 
  } = useVideoRecorder();

  useEffect(() => {
    startRecording();
    return () => {
      cancelRecording();
    };
  }, []);

  const handleStop = async () => {
    const blob = await stopRecording();
    if (blob.size > 0) {
      onSend(blob);
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col border-t bg-card animate-fade-in">
      {/* Preview do vídeo */}
      <div className="relative bg-black aspect-video w-full max-w-2xl mx-auto">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Indicador de gravação */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-full">
          <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-white text-sm font-mono font-semibold">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Indicador de pausa */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/60 backdrop-blur-sm px-6 py-3 rounded-lg">
              <span className="text-white text-lg font-semibold">Pausado</span>
            </div>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-center gap-3 p-4 bg-card border-t">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleCancel}
          className="hover:bg-destructive/10 hover:text-destructive"
          title="Cancelar"
        >
          <X size={24} />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handlePauseResume}
          className="hover:bg-accent"
          disabled={!isRecording}
          title={isPaused ? "Retomar" : "Pausar"}
        >
          {isPaused ? <Play size={24} /> : <Pause size={24} />}
        </Button>

        <Button 
          size="icon" 
          onClick={handleStop}
          className="bg-primary hover:bg-primary/90 w-14 h-14"
          disabled={!isRecording}
          title="Enviar vídeo"
        >
          <Send size={24} />
        </Button>
      </div>
    </div>
  );
};

export default VideoRecorder;
