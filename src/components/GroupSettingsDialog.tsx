import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserMinus, UserPlus, Crown, X } from "lucide-react";

interface GroupSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
}

interface Participant {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

const GroupSettingsDialog = ({
  open,
  onClose,
  conversationId,
}: GroupSettingsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMemberUsername, setNewMemberUsername] = useState("");

  // Fetch group info
  const { data: group } = useQuery({
    queryKey: ["group", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, name, avatar_url")
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch participants
  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["participants", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("*")
        .eq("conversation_id", conversationId);

      if (error) throw error;

      // Fetch profiles separately
      const participantsWithProfiles = await Promise.all(
        data.map(async (participant) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .eq("id", participant.user_id)
            .single();

          return {
            ...participant,
            profiles: profile || {
              id: participant.user_id,
              username: "Desconhecido",
              full_name: null,
              avatar_url: null,
            },
          };
        })
      );

      return participantsWithProfiles as Participant[];
    },
    enabled: open,
  });

  // Check if current user is admin
  const currentUserParticipant = participants.find(
    (p) => p.user_id === user?.id
  );
  const isAdmin = currentUserParticipant?.role === "admin";

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (username: string) => {
      // Find user by username
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (profileError) throw new Error("Usuário não encontrado");

      // Add to conversation
      const { error } = await supabase
        .from("conversation_participants")
        .insert({
          conversation_id: conversationId,
          user_id: profile.id,
          role: "member",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", conversationId] });
      setNewMemberUsername("");
      toast({
        title: "Membro adicionado",
        description: "O usuário foi adicionado ao grupo com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const { error } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("id", participantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", conversationId] });
      toast({
        title: "Membro removido",
        description: "O usuário foi removido do grupo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Promote to admin mutation
  const promoteToAdminMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const { error } = await supabase
        .from("conversation_participants")
        .update({ role: "admin" })
        .eq("id", participantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", conversationId] });
      toast({
        title: "Membro promovido",
        description: "O usuário agora é administrador do grupo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao promover membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações do Grupo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={group?.avatar_url || undefined} />
              <AvatarFallback>
                {group?.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{group?.name}</h3>
              <p className="text-sm text-muted-foreground">
                {participants.length} membros
              </p>
            </div>
          </div>

          {/* Add Member (Admin only) */}
          {isAdmin && (
            <div className="space-y-2">
              <Label>Adicionar Membro</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome de usuário"
                  value={newMemberUsername}
                  onChange={(e) => setNewMemberUsername(e.target.value)}
                />
                <Button
                  onClick={() => addMemberMutation.mutate(newMemberUsername)}
                  disabled={!newMemberUsername || addMemberMutation.isPending}
                >
                  <UserPlus size={16} className="mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <Label>Membros ({participants.length})</Label>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.profiles.avatar_url || undefined} />
                    <AvatarFallback>
                      {participant.profiles.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {participant.profiles.full_name || participant.profiles.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{participant.profiles.username}
                    </p>
                  </div>
                  {participant.role === "admin" && (
                    <Badge variant="secondary" className="gap-1">
                      <Crown size={12} />
                      Admin
                    </Badge>
                  )}
                  {isAdmin && participant.user_id !== user?.id && (
                    <div className="flex gap-1">
                      {participant.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => promoteToAdminMutation.mutate(participant.id)}
                          title="Promover a admin"
                        >
                          <Crown size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMemberMutation.mutate(participant.id)}
                        title="Remover do grupo"
                      >
                        <UserMinus size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupSettingsDialog;
