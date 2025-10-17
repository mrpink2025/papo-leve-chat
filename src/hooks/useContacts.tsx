import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Contact {
  id: string;
  contact_id: string;
  user_id: string;
  nickname?: string;
  favorite: boolean;
  blocked: boolean;
  added_at: string;
  contact: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
    bio?: string;
    status?: string;
  };
}

export const useContacts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading, refetch } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch contact relationships
      const { data: contactRels, error: relsError } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });

      if (relsError) throw relsError;
      if (!contactRels || contactRels.length === 0) return [];

      // Fetch profiles separately
      const contactIds = contactRels.map((c) => c.contact_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, status")
        .in("id", contactIds);

      if (profilesError) throw profilesError;

      // Merge contact relationships with profiles
      const contactsWithProfiles = contactRels.map((rel) => ({
        ...rel,
        contact: profiles?.find((p) => p.id === rel.contact_id) || {
          id: rel.contact_id,
          username: "unknown",
          full_name: null,
          avatar_url: null,
          bio: null,
          status: "offline",
        },
      }));

      return contactsWithProfiles as Contact[];
    },
    enabled: !!user?.id,
    refetchOnMount: true,
    staleTime: 1 * 60 * 1000,
  });

  const addContact = useMutation({
    mutationFn: async (contactId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase.from("contacts").insert({
        user_id: user.id,
        contact_id: contactId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato adicionado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar contato");
    },
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ contactId, blocked }: { contactId: string; blocked: boolean }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("contacts")
        .update({ blocked })
        .eq("user_id", user.id)
        .eq("contact_id", contactId);

      if (error) throw error;
    },
    onSuccess: (_, { blocked }) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(blocked ? "Contato bloqueado" : "Contato desbloqueado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar contato");
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ contactId, favorite }: { contactId: string; favorite: boolean }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("contacts")
        .update({ favorite })
        .eq("user_id", user.id)
        .eq("contact_id", contactId);

      if (error) throw error;
    },
    onSuccess: (_, { favorite }) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(favorite ? "Adicionado aos favoritos" : "Removido dos favoritos");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar favorito");
    },
  });

  const setNickname = useMutation({
    mutationFn: async ({ contactId, nickname }: { contactId: string; nickname: string }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("contacts")
        .update({ nickname })
        .eq("user_id", user.id)
        .eq("contact_id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Apelido atualizado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar apelido");
    },
  });

  const removeContact = useMutation({
    mutationFn: async (contactId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("user_id", user.id)
        .eq("contact_id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato removido");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover contato");
    },
  });

  return {
    contacts,
    isLoading,
    refetch,
    addContact,
    toggleBlock,
    toggleFavorite,
    setNickname,
    removeContact,
  };
};
