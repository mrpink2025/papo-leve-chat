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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/nosso-papo-logo-transparent.png";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: conversations = [], isLoading } = useConversations(user?.id, false);
  const { data: archivedConversations = [] } = useConversations(user?.id, true);
  const { canInstall, promptInstall, isIOS } = useInstallPrompt();
  
  // Sincronização real-time centralizada
  useRealtimeSync(user?.id);

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

  const handlePin = async (conversationId: string) => {
    try {
      // Buscar conversas fixadas atuais
      const { data: pinnedConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id, pinned")
        .eq("user_id", user?.id)
        .eq("pinned", true);

      const isPinned = pinnedConvs?.some(c => c.conversation_id === conversationId);

      // Verificar limite de 3 fixadas
      if (!isPinned && pinnedConvs && pinnedConvs.length >= 3) {
        toast.error("Você pode fixar no máximo 3 conversas");
        return;
      }

      const { error } = await supabase
        .from("conversation_participants")
        .update({ pinned: !isPinned })
        .eq("conversation_id", conversationId)
        .eq("user_id", user?.id);

      if (error) throw error;
      toast.success(isPinned ? "Conversa desafixada" : "Conversa fixada");
    } catch (error) {
      toast.error("Erro ao fixar conversa");
    }
  };

  const handleMute = async (conversationId: string) => {
    try {
      // Por enquanto, apenas alterna mute indefinidamente
      // Futuramente adicionar seletor de duração
      const { data: current } = await supabase
        .from("conversation_notification_settings")
        .select("mode")
        .eq("conversation_id", conversationId)
        .eq("user_id", user?.id)
        .maybeSingle();

      const newMode = current?.mode === "none" ? "all" : "none";

      const { error } = await supabase
        .from("conversation_notification_settings")
        .upsert({
          conversation_id: conversationId,
          user_id: user!.id,
          mode: newMode,
        });

      if (error) throw error;
      toast.success(newMode === "none" ? "Notificações silenciadas" : "Notificações ativadas");
    } catch (error) {
      toast.error("Erro ao silenciar conversa");
    }
  };

  const handleDelete = async () => {
    if (!selectedConversation) return;
    
    try {
      // Deletar participação na conversa
      const { error } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", selectedConversation)
        .eq("user_id", user?.id);

      if (error) throw error;
      toast.success("Conversa excluída");
    } catch (error) {
      toast.error("Erro ao excluir conversa");
    } finally {
      setDeleteDialogOpen(false);
      setSelectedConversation(null);
    }
  };

  const handleClear = async () => {
    if (!selectedConversation) return;

    try {
      // Marcar todas as mensagens como deletadas para este usuário
      const { error } = await supabase
        .from("messages")
        .update({ deleted: true })
        .eq("conversation_id", selectedConversation);

      if (error) throw error;
      toast.success("Conversa limpa");
    } catch (error) {
      toast.error("Erro ao limpar conversa");
    } finally {
      setClearDialogOpen(false);
      setSelectedConversation(null);
    }
  };

  const handleMarkRead = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user?.id);

      if (error) throw error;
      toast.success("Marcada como lida");
    } catch (error) {
      toast.error("Erro ao marcar como lida");
    }
  };

  const handleBlock = async (conversationId: string) => {
    // TODO: Implementar bloqueio de contato
    toast.info("Funcionalidade em desenvolvimento");
  };

  const handleReport = async (conversationId: string) => {
    // TODO: Implementar denúncia
    toast.info("Funcionalidade em desenvolvimento");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="relative bg-gradient-to-r from-card via-card to-accent/5 border-b-2 border-primary/20 px-3 py-2 sm:px-6 sm:py-4 flex items-center justify-between shadow-lg backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 sm:gap-3 relative z-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:blur-lg transition-all" />
            <img src={logo} alt="Nosso Papo" className="h-7 w-7 sm:h-9 sm:w-9 md:h-11 md:w-11 object-contain relative z-10 drop-shadow-lg hover:scale-105 transition-transform" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent tracking-tight">
              Nosso Papo
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Conecte-se com seus amigos</p>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 relative z-10">
          {canInstall && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleInstall}
              title="Instalar App"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/30 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/10"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/app/contatos")}
            title="Contatos"
            className="h-8 sm:h-9 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-background/50 hover:bg-primary/10 border-border/50 hover:border-primary/50 text-foreground hover:text-primary transition-all hover:scale-105 hover:shadow-md flex items-center gap-1.5"
          >
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">Contatos</span>
          </Button>
          <ThemeToggle />
          <CreateGroupDialog />
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/configuracoes")} 
            title="Configurações"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/30 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/10 hidden sm:flex"
          >
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={signOut} 
            title="Sair"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive border border-destructive/20 hover:border-destructive/40 transition-all hover:scale-105 hover:shadow-lg hover:shadow-destructive/10 hidden sm:flex"
          >
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      <div className="px-3 py-2 sm:p-4 bg-card border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 sm:pl-10 bg-secondary text-sm h-9 sm:h-10"
          />
        </div>
      </div>

      <div className="sticky top-0 z-10 bg-background">
        <StoriesList />
      </div>

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
                    isPinned={conversation.pinned}
                    isMuted={conversation.muted}
                    isArchived={conversation.archived}
                    onArchive={() => handleArchive(conversation.id, conversation.archived)}
                    onPin={() => handlePin(conversation.id)}
                    onMute={() => handleMute(conversation.id)}
                    onDelete={() => {
                      setSelectedConversation(conversation.id);
                      setDeleteDialogOpen(true);
                    }}
                    onClear={() => {
                      setSelectedConversation(conversation.id);
                      setClearDialogOpen(true);
                    }}
                    onMarkRead={() => handleMarkRead(conversation.id)}
                    onBlock={() => handleBlock(conversation.id)}
                    onReport={() => handleReport(conversation.id)}
                  />
                );
                  })
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Diálogos de confirmação */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as mensagens serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as mensagens serão removidas, mas a conversa será mantida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear}>
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
