import { useEffect, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { Button } from "@/components/ui/button";
import { X, SwitchCamera, Camera, Video, Circle, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraCaptureProps {
  onCapture: (blob: Blob, type: "image" | "video") => void;
  onClose: () => void;
}

const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const {
    mode,
    facing,
    isRecording,
    duration,
    videoRef,
    startCamera,
    stopCamera,
    switchMode,
    switchCamera,
    capturePhoto,
    startRecording,
    stopRecording,
    hasPermission,
  } = useCamera();

  const [preview, setPreview] = useState<{
    blob: Blob;
    url: string;
    type: "image" | "video";
  } | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = async () => {
    if (mode === "photo") {
      const blob = await capturePhoto();
      if (blob) {
        setPreview({
          blob,
          url: URL.createObjectURL(blob),
          type: "image",
        });
      }
    } else {
      if (isRecording) {
        const blob = await stopRecording();
        if (blob) {
          setPreview({
            blob,
            url: URL.createObjectURL(blob),
            type: "video",
          });
        }
      } else {
        await startRecording();
      }
    }
  };

  const handleSend = () => {
    if (preview) {
      onCapture(preview.blob, preview.type);
      stopCamera();
      onClose();
    }
  };

  const handleRetake = () => {
    if (preview) {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
        <Camera className="h-16 w-16 mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Permissão necessária</h2>
        <p className="text-center text-muted-foreground mb-6">
          Para tirar fotos e gravar vídeos, permita o acesso à câmera nas configurações do navegador.
        </p>
        <Button onClick={onClose}>Voltar</Button>
      </div>
    );
  }

  // Preview mode
  if (preview) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Preview */}
        <div className="flex-1 relative flex items-center justify-center">
          {preview.type === "image" ? (
            <img
              src={preview.url}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              src={preview.url}
              controls
              autoPlay
              loop
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-black/80 backdrop-blur-sm flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRetake}
            className="text-white hover:bg-white/10"
          >
            <X size={24} />
          </Button>

          <Button
            size="lg"
            onClick={handleSend}
            className="bg-primary hover:bg-primary/90"
          >
            Enviar
          </Button>

          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>
    );
  }

  // Camera mode
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video stream */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X size={24} />
          </Button>

          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => switchMode("photo")}
              className={cn(
                "text-white hover:bg-white/10",
                mode === "photo" && "bg-white/20"
              )}
            >
              <Camera size={18} className="mr-1" />
              FOTO
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => switchMode("video")}
              className={cn(
                "text-white hover:bg-white/10",
                mode === "video" && "bg-white/20"
              )}
            >
              <Video size={18} className="mr-1" />
              VÍDEO
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={switchCamera}
            className="text-white hover:bg-white/10"
            disabled={isRecording}
          >
            <SwitchCamera size={24} />
          </Button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500 backdrop-blur-sm px-4 py-2 rounded-full">
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
            <span className="text-white text-sm font-mono font-semibold">
              {formatDuration(duration)}
            </span>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="p-6 bg-black/80 backdrop-blur-sm flex items-center justify-center">
        <Button
          size="icon"
          onClick={handleCapture}
          className={cn(
            "w-20 h-20 rounded-full",
            isRecording
              ? "bg-red-500 hover:bg-red-600"
              : "bg-white hover:bg-gray-200"
          )}
        >
          {mode === "video" && isRecording ? (
            <Square size={32} className="text-white fill-white" />
          ) : (
            <Circle size={48} className={mode === "video" ? "text-red-500" : "text-gray-800"} />
          )}
        </Button>
      </div>
    </div>
  );
};

export default CameraCapture;
