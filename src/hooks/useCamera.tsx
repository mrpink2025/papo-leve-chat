import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

type CameraMode = "photo" | "video";
type CameraFacing = "user" | "environment";

interface UseCameraReturn {
  isActive: boolean;
  mode: CameraMode;
  facing: CameraFacing;
  isRecording: boolean;
  duration: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  switchMode: (newMode: CameraMode) => void;
  switchCamera: () => Promise<void>;
  capturePhoto: () => Promise<Blob | null>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  hasPermission: boolean | null;
}

export const useCamera = (): UseCameraReturn => {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<CameraMode>("photo");
  const [facing, setFacing] = useState<CameraFacing>("user");
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setIsRecording(false);
    setDuration(0);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: mode === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsActive(true);
      setHasPermission(true);
    } catch (error: any) {
      console.error("Erro ao acessar câmera:", error);
      setHasPermission(false);
      
      let message = "Não foi possível acessar a câmera";
      if (error.name === "NotAllowedError") {
        message = "Permissão de câmera negada. Verifique as configurações do navegador.";
      } else if (error.name === "NotFoundError") {
        message = "Nenhuma câmera encontrada no dispositivo.";
      }

      toast({
        title: "Erro na câmera",
        description: message,
        variant: "destructive",
      });
    }
  }, [facing, mode, toast]);

  const switchCamera = useCallback(async () => {
    stopCamera();
    setFacing((prev) => (prev === "user" ? "environment" : "user"));
    // startCamera será chamado pelo useEffect
  }, [stopCamera]);

  const switchMode = useCallback((newMode: CameraMode) => {
    if (isRecording) {
      toast({
        title: "Aviso",
        description: "Pare a gravação antes de trocar de modo",
        variant: "destructive",
      });
      return;
    }
    setMode(newMode);
  }, [isRecording, toast]);

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !streamRef.current) return null;

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0);

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.9
        );
      });
    } catch (error) {
      console.error("Erro ao capturar foto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível capturar a foto",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const startRecording = useCallback(async () => {
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm;codecs=vp8,opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a gravação",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        resolve(blob);
      };

      mediaRecorder.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });
  }, []);

  // Reiniciar câmera quando facing mudar
  useEffect(() => {
    if (isActive && !isRecording) {
      startCamera();
    }
  }, [facing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    isActive,
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
  };
};
