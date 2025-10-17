import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, UserPlus, Search, Users, RefreshCw } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { ContactCard } from "@/components/ContactCard";
import { AddContactDialog } from "@/components/AddContactDialog";
import ProfileViewDialog from "@/components/ProfileViewDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Contacts() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [profileViewOpen, setProfileViewOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const {
    contacts,
    isLoading,
    refetch,
    toggleBlock,
    toggleFavorite,
    removeContact,
  } = useContacts();

  useEffect(() => {
    refetch();
  }, []);

  const filteredContacts = contacts?.filter((contact) => {
    const searchLower = searchQuery.toLowerCase();
    const username = contact.contact.username.toLowerCase();
    const fullName = contact.contact.full_name?.toLowerCase() || "";
    const nickname = contact.nickname?.toLowerCase() || "";
    return username.includes(searchLower) || fullName.includes(searchLower) || nickname.includes(searchLower);
  });

  const allContacts = filteredContacts?.filter((c) => !c.blocked) || [];
  const favoriteContacts = filteredContacts?.filter((c) => c.favorite && !c.blocked) || [];
  const blockedContacts = filteredContacts?.filter((c) => c.blocked) || [];

  const handleSendMessage = async (contactId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-direct-conversation", {
        body: { target_user_id: contactId },
      });

      if (error) throw error;

      navigate(`/app/chat/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao abrir conversa");
    }
  };

  const handleCall = (contactId: string, isVideo: boolean) => {
    // TODO: Implementar validação de privacidade antes de fazer chamadas
    toast.info("Funcionalidade de chamadas será implementada em breve");
  };

  const handleViewProfile = (contact: any) => {
    setSelectedContact(contact);
    setProfileViewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Carregando contatos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Contatos</h1>
              <p className="text-sm text-muted-foreground">
                {contacts?.length || 0} contato(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="all">
            Todos ({allContacts.length})
          </TabsTrigger>
          <TabsTrigger value="favorites">
            Favoritos ({favoriteContacts.length})
          </TabsTrigger>
          <TabsTrigger value="blocked">
            Bloqueados ({blockedContacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1 overflow-y-auto px-4 pb-4">
          {allContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhum contato ainda</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione alguém pelo username para começar!
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Contato
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {allContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onSendMessage={() => handleSendMessage(contact.contact_id)}
                  onAudioCall={() => handleCall(contact.contact_id, false)}
                  onVideoCall={() => handleCall(contact.contact_id, true)}
                  onToggleFavorite={() =>
                    toggleFavorite.mutate({
                      contactId: contact.contact_id,
                      favorite: !contact.favorite,
                    })
                  }
                  onToggleBlock={() =>
                    toggleBlock.mutate({
                      contactId: contact.contact_id,
                      blocked: true,
                    })
                  }
                  onRemove={() => removeContact.mutate(contact.contact_id)}
                  onViewProfile={() => handleViewProfile(contact.contact)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="flex-1 overflow-y-auto px-4 pb-4">
          {favoriteContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Nenhum favorito ainda. Toque na estrela para favoritar.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {favoriteContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onSendMessage={() => handleSendMessage(contact.contact_id)}
                  onAudioCall={() => handleCall(contact.contact_id, false)}
                  onVideoCall={() => handleCall(contact.contact_id, true)}
                  onToggleFavorite={() =>
                    toggleFavorite.mutate({
                      contactId: contact.contact_id,
                      favorite: false,
                    })
                  }
                  onToggleBlock={() =>
                    toggleBlock.mutate({
                      contactId: contact.contact_id,
                      blocked: true,
                    })
                  }
                  onRemove={() => removeContact.mutate(contact.contact_id)}
                  onViewProfile={() => handleViewProfile(contact.contact)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="blocked" className="flex-1 overflow-y-auto px-4 pb-4">
          {blockedContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Nenhum usuário bloqueado.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {blockedContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onSendMessage={() => handleSendMessage(contact.contact_id)}
                  onAudioCall={() => handleCall(contact.contact_id, false)}
                  onVideoCall={() => handleCall(contact.contact_id, true)}
                  onToggleFavorite={() =>
                    toggleFavorite.mutate({
                      contactId: contact.contact_id,
                      favorite: !contact.favorite,
                    })
                  }
                  onToggleBlock={() =>
                    toggleBlock.mutate({
                      contactId: contact.contact_id,
                      blocked: false,
                    })
                  }
                  onRemove={() => removeContact.mutate(contact.contact_id)}
                  onViewProfile={() => handleViewProfile(contact.contact)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddContactDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      {selectedContact && (
        <ProfileViewDialog
          open={profileViewOpen}
          onClose={() => setProfileViewOpen(false)}
          name={selectedContact.full_name || selectedContact.username}
          avatarUrl={selectedContact.avatar_url}
          bio={selectedContact.bio}
        />
      )}
    </div>
  );
}
