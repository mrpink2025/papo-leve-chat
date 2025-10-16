import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type MediaType = "image" | "video" | "document" | "voice";

interface UploadOptions {
  file: File;
  conversationId: string;
  type: MediaType;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const getBucketForType = (type: MediaType): string => {
    switch (type) {
      case "image": return "chat-media";
      case "video": return "videos";
      case "document": return "documents";
      case "voice": return "voice-notes";
      default: return "chat-media";
    }
  };

  const getMaxSizeForType = (type: MediaType): number => {
    switch (type) {
      case "image": return 5 * 1024 * 1024; // 5MB
      case "video": return 50 * 1024 * 1024; // 50MB
      case "document": return 10 * 1024 * 1024; // 10MB
      case "voice": return 5 * 1024 * 1024; // 5MB
      default: return 5 * 1024 * 1024;
    }
  };

  const uploadFile = async ({
    file,
    conversationId,
    type
  }: UploadOptions): Promise<string | null> => {
    try {
      setUploading(true);

      const maxSize = getMaxSizeForType(type);
      if (file.size > maxSize) {
        toast({
          title: "Erro",
          description: `Arquivo muito grande (máximo ${maxSize / 1024 / 1024}MB)`,
          variant: "destructive",
        });
        return null;
      }

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return null;
      }

      const bucket = getBucketForType(type);
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get signed URL with 1 hour expiration
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, 3600);

      if (signedError) throw signedError;

      return signedData.signedUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Legacy support
  const uploadImage = async (
    file: File,
    conversationId: string
  ): Promise<string | null> => {
    return uploadFile({ file, conversationId, type: "image" });
  };

  return { uploadFile, uploadImage, uploading };
};
