import { useState, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

interface UseVideoRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob>;
  cancelRecording: () => void;
}

export const useVideoRecorder = (): UseVideoRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<HTMLVideoElement>(null);

  const MAX_DURATION = 180; // 3 minutos

  const startRecording = useCallback(async () => {
    try {
      // Verificar suporte do navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Recurso não disponível",
          description: "Seu navegador não suporta gravação de vídeo",
          variant: "destructive",
        });
        return;
      }

      // Solicitar acesso à câmera e microfone
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      setStream(mediaStream);

      // Conectar stream ao elemento de vídeo para preview
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Detectar tipo MIME suportado
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      // Criar MediaRecorder
      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Iniciar timer
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setDuration(seconds);

        // Parar automaticamente após 3 minutos
        if (seconds >= MAX_DURATION) {
          stopRecording();
        }
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao iniciar gravação:", error);
      
      let description = "Não foi possível acessar a câmera";
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        description = "Permissão para acessar a câmera foi negada";
      } else if (error.name === "NotFoundError") {
        description = "Nenhuma câmera foi encontrada";
      }

      toast({
        title: "Erro ao gravar vídeo",
        description,
        variant: "destructive",
      });
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Retomar timer
      let seconds = duration;
      timerRef.current = setInterval(() => {
        seconds++;
        setDuration(seconds);

        if (seconds >= MAX_DURATION) {
          stopRecording();
        }
      }, 1000);
    }
  }, [isRecording, isPaused, duration]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { 
            type: chunksRef.current[0]?.type || "video/webm" 
          });
          resolve(blob);
          
          // Limpar recursos
          cleanupResources();
        };

        mediaRecorderRef.current.stop();
      } else {
        resolve(new Blob());
      }
    });
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    cleanupResources();
  }, [isRecording]);

  const cleanupResources = () => {
    // Parar todas as tracks do stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    // Limpar timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Resetar estados
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    chunksRef.current = [];
  };

  return {
    isRecording,
    isPaused,
    duration,
    stream,
    videoRef,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
};
