import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (
    file: File,
    conversationId: string
  ): Promise<string | null> => {
    try {
      setUploading(true);

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Erro",
          description: "Apenas imagens são permitidas",
          variant: "destructive",
        });
        return null;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "Imagem muito grande (máximo 5MB)",
          variant: "destructive",
        });
        return null;
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${conversationId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from("chat-media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("chat-media")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Erro ao enviar imagem",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading };
};
