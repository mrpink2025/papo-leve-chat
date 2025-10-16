import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PrivacySettings {
  id: string;
  user_id: string;
  who_can_add_me: "everyone" | "contacts_only" | "nobody";
  who_can_see_status: "everyone" | "contacts" | "nobody";
  who_can_see_avatar: "everyone" | "contacts" | "nobody";
  who_can_see_bio: "everyone" | "contacts" | "nobody";
  who_can_call_me: "everyone" | "contacts" | "nobody";
  show_last_seen: boolean;
  read_receipts: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PRIVACY_SETTINGS = {
  who_can_add_me: "everyone" as const,
  who_can_see_status: "everyone" as const,
  who_can_see_avatar: "everyone" as const,
  who_can_see_bio: "everyone" as const,
  who_can_call_me: "contacts" as const,
  show_last_seen: true,
  read_receipts: true,
};

export const usePrivacySettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["privacy-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("privacy_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as PrivacySettings | null;
    },
    enabled: !!user?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Omit<PrivacySettings, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!user?.id) throw new Error("User not authenticated");

      // If no settings exist, create them
      if (!settings) {
        const { error } = await supabase.from("privacy_settings").insert({
          user_id: user.id,
          ...DEFAULT_PRIVACY_SETTINGS,
          ...updates,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("privacy_settings")
          .update(updates)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privacy-settings"] });
      toast.success("Configurações de privacidade atualizadas");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar configurações");
    },
  });

  return {
    settings: settings || DEFAULT_PRIVACY_SETTINGS,
    isLoading,
    updateSettings,
  };
};
