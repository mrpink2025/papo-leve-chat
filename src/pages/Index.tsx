import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Settings, Archive, LogOut, Download, Users } from "lucide-react";
import ChatListItem from "@/components/ChatListItem";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { StoriesList } from "@/components/StoriesList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/nosso-papo-logo-transparent.png";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: conversations = [], isLoading } = useConversations(user?.id, false);
  const { data: archivedConversations = [] } = useConversations(user?.id, true);
  const { canInstall, promptInstall, isIOS } = useInstallPrompt();

  const handleInstall = async () => {
    if (isIOS) {
      navigate("/install");
    } else {
      const installed = await promptInstall();
      if (!installed) {
        navigate("/install");
      }
    }
  };

  const filteredChats = (activeTab === "archived" ? archivedConversations : conversations)
    .filter((conversation: any) => {
      if (activeTab === "all" && conversation.archived) return false;
      if (activeTab === "archived" && !conversation.archived) return false;
      
      const displayName = conversation.type === "direct"
        ? conversation.other_participant?.username || "Usuário"
        : conversation.name || "Grupo";
      return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });

  const handleArchive = async (conversationId: string, archived: boolean) => {
    try {
      const { error } = await supabase
        .from("conversation_participants")
        .update({ archived: !archived })
        .eq("conversation_id", conversationId)
        .eq("user_id", user?.id);

      if (error) throw error;
      toast.success(archived ? "Conversa desarquivada" : "Conversa arquivada");
    } catch (error) {
      toast.error("Erro ao arquivar conversa");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Nosso Papo" className="h-10 w-10 object-contain" />
          <h1 className="text-2xl font-bold text-primary tracking-tight">Nosso Papo</h1>
        </div>
        <div className="flex gap-2">
          {canInstall && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleInstall}
              title="Instalar App"
              className="text-muted-foreground hover:text-primary"
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/contatos")}
            title="Contatos"
            className="text-muted-foreground hover:text-primary"
          >
            <Users className="h-5 w-5" />
          </Button>
          <ThemeToggle />
          <CreateGroupDialog />
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/configuracoes")} title="Configurações">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 bg-card border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary"
          />
        </div>
      </div>

      <StoriesList />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="all" className="flex-1">Todas</TabsTrigger>
          <TabsTrigger value="archived" className="flex-1">
            <Archive className="h-4 w-4 mr-2" />
            Arquivadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 m-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                    <p>Nenhuma conversa encontrada</p>
                  </div>
                ) : (
                  filteredChats.map((conversation: any) => {
                const isDirectChat = conversation.type === "direct";
                const displayName = isDirectChat
                  ? conversation.other_participant?.full_name || conversation.other_participant?.username || "Usuário"
                  : conversation.name || "Grupo";
                const displayAvatar = isDirectChat
                  ? conversation.other_participant?.avatar_url || "/placeholder.svg"
                  : conversation.avatar_url || "/placeholder.svg";
                const isOnline = isDirectChat && conversation.other_participant?.status === "online";
                const lastMessage = conversation.last_message?.content || "Sem mensagens";
                const timestamp = conversation.last_message?.created_at
                  ? format(new Date(conversation.last_message.created_at), "HH:mm", { locale: ptBR })
                  : "";

                return (
                  <ChatListItem
                    key={conversation.id}
                    id={conversation.id}
                    name={displayName}
                    avatar={displayAvatar}
                    lastMessage={lastMessage}
                    timestamp={timestamp}
                    unread={conversation.unread_count || 0}
                    online={isOnline}
                    onClick={() => navigate(`/app/chat/${conversation.id}`)}
                    isGroup={!isDirectChat}
                    memberCount={!isDirectChat ? conversation.member_count : undefined}
                    bio={isDirectChat ? conversation.other_participant?.bio : undefined}
                  />
                );
                  })
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
