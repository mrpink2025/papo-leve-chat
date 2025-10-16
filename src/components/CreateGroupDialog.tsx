import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export const CreateGroupDialog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Fetch contact relationships
      const { data: contactRels, error: relsError } = await supabase
        .from("contacts")
        .select("contact_id")
        .eq("user_id", user.id);

      if (relsError) throw relsError;
      if (!contactRels || contactRels.length === 0) return [];

      // Fetch profiles separately
      const contactIds = contactRels.map((c) => c.contact_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", contactIds);

      if (profilesError) throw profilesError;
      return profiles || [];
    },
    enabled: !!user?.id,
  });

  const handleCreateGroup = async () => {
    console.log('[CreateGroup] Iniciando criação de grupo');
    console.log('[CreateGroup] Estado inicial:', {
      groupName: groupName.trim(),
      selectedUsersCount: selectedUsers.length,
      userId: user?.id,
      hasSession: !!user
    });

    // Validações robustas
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    const trimmedName = groupName.trim();
    if (!trimmedName) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Selecione pelo menos um contato");
      return;
    }

    // Validar que todos os IDs são UUIDs válidos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = selectedUsers.filter(id => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      console.error('[CreateGroup] IDs inválidos:', invalidIds);
      toast.error("Erro: IDs de contatos inválidos");
      return;
    }

    setIsCreating(true);
    
    try {
      // Verificar sessão antes de criar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[CreateGroup] Verificação de sessão:', {
        hasSession: !!session,
        userId: session?.user?.id,
        error: sessionError
      });

      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      console.log('[CreateGroup] Inserindo conversa:', {
        type: 'group',
        name: trimmedName,
        created_by: user.id
      });

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          type: "group",
          name: trimmedName,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) {
        console.error('[CreateGroup] ❌ Erro ao criar conversa:', {
          error: convError,
          code: convError.code,
          message: convError.message,
          details: convError.details,
          hint: convError.hint
        });
        throw convError;
      }

      console.log('[CreateGroup] ✅ Conversa criada:', conversation);

      const participants = [
        { conversation_id: conversation.id, user_id: user.id, role: "admin" },
        ...selectedUsers.map((userId) => ({
          conversation_id: conversation.id,
          user_id: userId,
          role: "member",
        })),
      ];

      console.log('[CreateGroup] Adicionando participantes:', participants.length);

      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert(participants);

      if (partError) {
        console.error('[CreateGroup] ❌ Erro ao adicionar participantes:', {
          error: partError,
          code: partError.code,
          message: partError.message,
          details: partError.details,
          hint: partError.hint
        });
        throw partError;
      }

      console.log('[CreateGroup] ✅ Grupo criado com sucesso');
      console.log('[CreateGroup] Navegando para: /app/chat/' + conversation.id);
      
      toast.success("Grupo criado!");
      setOpen(false);
      setGroupName("");
      setSelectedUsers([]);
      navigate(`/app/chat/${conversation.id}`);
    } catch (error: any) {
      console.error('[CreateGroup] ❌ Erro final:', error);
      toast.error(error.message || "Erro ao criar grupo");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Users className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar grupo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Nome do grupo</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Meu Grupo"
            />
          </div>

          <div className="space-y-2">
            <Label>Adicionar participantes</Label>
            <ScrollArea className="h-[300px] border rounded-md">
              {contacts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhum contato encontrado
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {contacts.map((contact: any) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg cursor-pointer"
                      onClick={() => toggleUser(contact.id)}
                    >
                      <Checkbox checked={selectedUsers.includes(contact.id)} />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contact.avatar_url || ""} />
                        <AvatarFallback>
                          {contact.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{contact.full_name || contact.username}</p>
                        <p className="text-sm text-muted-foreground">@{contact.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <Button 
            onClick={handleCreateGroup} 
            className="w-full"
            disabled={isCreating}
          >
            {isCreating ? "Criando..." : "Criar grupo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
