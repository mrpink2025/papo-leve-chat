import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import imageCompression from "browser-image-compression";

type MediaType = "image" | "video" | "document" | "audio";

interface UploadOptions {
  file: File;
  conversationId: string;
  type: MediaType;
  onProgress?: (progress: number) => void;
}

interface UploadState {
  progress: number;
  isUploading: boolean;
  error: string | null;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    isUploading: false,
    error: null,
  });
  const { toast } = useToast();

  const getBucketForType = (type: MediaType): string => {
    switch (type) {
      case "image": return "chat-media";
      case "video": return "videos";
      case "document": return "documents";
      case "audio": return "voice-notes";
      default: return "chat-media";
    }
  };

  const getMaxSizeForType = (type: MediaType): number => {
    switch (type) {
      case "image": return 5 * 1024 * 1024; // 5MB
      case "video": return 50 * 1024 * 1024; // 50MB
      case "document": return 10 * 1024 * 1024; // 10MB
      case "audio": return 5 * 1024 * 1024; // 5MB
      default: return 5 * 1024 * 1024;
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    try {
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/jpeg",
      };

      const compressedFile = await imageCompression(file, options);
      return new File([compressedFile], file.name, { type: "image/jpeg" });
    } catch (error) {
      console.error("Compression error:", error);
      return file; // Return original if compression fails
    }
  };

  const uploadFile = async ({
    file,
    conversationId,
    type,
    onProgress,
  }: UploadOptions): Promise<string | null> => {
    let retries = 3;
    let lastError: Error | null = null;

    setUploadState({ progress: 0, isUploading: true, error: null });
    setUploading(true);

    while (retries > 0) {
      try {
        const maxSize = getMaxSizeForType(type);

        // Compress image if needed
        let fileToUpload = file;
        if (type === "image" && file.size > 1024 * 1024) {
          onProgress?.(5);
          fileToUpload = await compressImage(file);
          onProgress?.(15);
        }

        if (fileToUpload.size > maxSize) {
          const errorMsg = `Arquivo muito grande (máximo ${maxSize / 1024 / 1024}MB)`;
          setUploadState({ progress: 0, isUploading: false, error: errorMsg });
          toast({
            title: "Erro",
            description: errorMsg,
            variant: "destructive",
          });
          setUploading(false);
          return null;
        }

        onProgress?.(20);

        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        onProgress?.(30);

        const bucket = getBucketForType(type);
        const fileExt = fileToUpload.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        onProgress?.(40);

        // Upload to Supabase Storage with progress tracking
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, fileToUpload, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        onProgress?.(70);

        // Wait for file to be indexed
        await new Promise(resolve => setTimeout(resolve, 150));

        onProgress?.(80);

        // Retry logic for signed URL creation
        let signedData = null;
        let signedError = null;
        let urlRetries = 3;

        while (urlRetries > 0 && !signedData) {
          const result = await supabase.storage
            .from(bucket)
            .createSignedUrl(fileName, 3600);
          
          if (result.data) {
            signedData = result.data;
            break;
          }
          
          if (result.error) {
            signedError = result.error;
            urlRetries--;
            if (urlRetries > 0) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        }

        if (signedError && !signedData) throw signedError;

        onProgress?.(100);
        setUploadState({ progress: 100, isUploading: false, error: null });
        setUploading(false);

        return signedData.signedUrl;
      } catch (error: any) {
        console.error("Upload error:", error);
        lastError = error;
        retries--;

        if (retries > 0) {
          // Wait before retry (exponential backoff)
          const waitTime = (4 - retries) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          toast({
            title: "Tentando novamente...",
            description: `${retries} tentativa(s) restante(s)`,
          });
        }
      }
    }

    // All retries failed
    const errorMsg = lastError?.message || "Erro ao enviar arquivo";
    setUploadState({ progress: 0, isUploading: false, error: errorMsg });
    toast({
      title: "Erro ao enviar arquivo",
      description: errorMsg,
      variant: "destructive",
    });
    setUploading(false);
    return null;
  };

  // Legacy support
  const uploadImage = async (
    file: File,
    conversationId: string
  ): Promise<string | null> => {
    return uploadFile({ file, conversationId, type: "image" });
  };

  return { uploadFile, uploadImage, uploading, uploadState };
};
