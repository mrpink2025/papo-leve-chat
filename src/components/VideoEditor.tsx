import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X, Check, Play, Pause, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoEditorProps {
  videoUrl: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

const VideoEditor = ({ videoUrl, onSave, onCancel }: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const dur = video.duration;
      setDuration(dur);
      setEndTime(dur);
    };

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      // Auto pause at end time
      if (time >= endTime) {
        video.pause();
        setIsPlaying(false);
        video.currentTime = startTime;
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [startTime, endTime]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.currentTime = startTime;
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStartChange = (value: number[]) => {
    const newStart = value[0];
    if (newStart < endTime - 1) {
      setStartTime(newStart);
      if (videoRef.current) {
        videoRef.current.currentTime = newStart;
      }
    }
  };

  const handleEndChange = (value: number[]) => {
    const newEnd = value[0];
    if (newEnd > startTime + 1) {
      setEndTime(newEnd);
    }
  };

  const handleSave = async () => {
    if (!videoRef.current) return;

    try {
      setIsProcessing(true);

      // For web, we can't actually trim video on client side without complex libraries
      // So we'll just save the original video with metadata about trim points
      // In a production app, you'd send this to a server for processing
      
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      // In a real implementation, you'd send startTime and endTime to server
      // For now, we just save the original
      toast({
        title: "Vídeo salvo",
        description: `Duração: ${(endTime - startTime).toFixed(1)}s`,
      });
      
      onSave(blob);
    } catch (error) {
      console.error("Error saving video:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o vídeo",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video preview */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-w-full max-h-full object-contain"
          playsInline
        />

        {/* Play/Pause overlay */}
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlayPause}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/40 hover:bg-black/60 text-white"
        >
          {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
        </Button>

        {/* Trim indicator */}
        <div className="absolute top-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center justify-between text-white text-sm">
            <span>Início: {formatTime(startTime)}</span>
            <Scissors size={16} />
            <span>Fim: {formatTime(endTime)}</span>
          </div>
          <div className="mt-2 text-center text-xs text-white/80">
            Duração: {formatTime(endTime - startTime)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card border-t border-border p-4 space-y-4">
        {/* Timeline */}
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground text-center">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Start time slider */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Início</label>
            <Slider
              value={[startTime]}
              min={0}
              max={duration}
              step={0.1}
              onValueChange={handleStartChange}
              className="w-full"
            />
          </div>

          {/* End time slider */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Fim</label>
            <Slider
              value={[endTime]}
              min={0}
              max={duration}
              step={0.1}
              onValueChange={handleEndChange}
              className="w-full"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isProcessing}
          >
            <X size={18} className="mr-2" />
            Cancelar
          </Button>

          <Button
            onClick={handleSave}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={isProcessing}
          >
            <Check size={18} className="mr-2" />
            {isProcessing ? "Processando..." : "Salvar"}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Nota: O vídeo completo será enviado. Use um editor de vídeo para cortes precisos.
        </p>
      </div>
    </div>
  );
};

export default VideoEditor;
