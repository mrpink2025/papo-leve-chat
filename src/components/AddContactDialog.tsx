import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddContactDialog = ({ open, onOpenChange }: AddContactDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { contacts, addContact } = useContacts();

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["search-users", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio")
        .ilike("username", `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 2,
  });

  const handleAddContact = async (contactId: string) => {
    if (contactId === user?.id) {
      toast.error("Você não pode adicionar a si mesmo");
      return;
    }

    const isAlreadyContact = contacts?.some((c) => c.contact_id === contactId);
    if (isAlreadyContact) {
      toast.error("Usuário já está nos seus contatos");
      return;
    }

    await addContact.mutateAsync(contactId);
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Contato</DialogTitle>
          <DialogDescription>
            Busque por username para adicionar novos contatos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite o username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {isSearching && searchTerm.length >= 2 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Buscando...
              </p>
            )}

            {!isSearching && searchTerm.length >= 2 && searchResults?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum usuário encontrado para "{searchTerm}"
              </p>
            )}

            {searchTerm.length < 2 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Digite pelo menos 2 caracteres para buscar
              </p>
            )}

            {searchResults?.map((result) => {
              const isCurrentUser = result.id === user?.id;
              const isAlreadyContact = contacts?.some((c) => c.contact_id === result.id);

              return (
                <div
                  key={result.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={result.avatar_url} />
                    <AvatarFallback>
                      {result.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {result.full_name || result.username}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{result.username}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleAddContact(result.id)}
                    disabled={isCurrentUser || isAlreadyContact || addContact.isPending}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    {isCurrentUser
                      ? "Você"
                      : isAlreadyContact
                      ? "Adicionado"
                      : "Adicionar"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
