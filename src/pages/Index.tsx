import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Settings, Archive, LogOut, Download, Users } from "lucide-react";
import ChatListItem from "@/components/ChatListItem";
import { SwipeableConversation } from "@/components/SwipeableConversation";
import { SelectionActionBar } from "@/components/SelectionActionBar";
import { MuteDurationDialog } from "@/components/MuteDurationDialog";
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
import { cn } from "@/lib/utils";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [muteDurationDialogOpen, setMuteDurationDialogOpen] = useState(false);
  const [conversationToMute, setConversationToMute] = useState<{ id: string; name: string } | null>(null);
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
    })
    .sort((a: any, b: any) => {
      // Ordenar: fixadas primeiro, depois por timestamp
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      const aTime = new Date(a.last_message?.created_at || a.updated_at).getTime();
      const bTime = new Date(b.last_message?.created_at || b.updated_at).getTime();
      return bTime - aTime;
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

  const handleMute = async (conversationId: string, conversationName: string) => {
    setConversationToMute({ id: conversationId, name: conversationName });
    setMuteDurationDialogOpen(true);
  };

  const handleMuteDuration = async (hours: number | null) => {
    if (!conversationToMute) return;

    try {
      let mutedUntil = null;
      let mode = "all";

      if (hours === 0) {
        // Reativar notificações
        mode = "all";
        mutedUntil = null;
      } else if (hours === null) {
        // Silenciar para sempre
        mode = "none";
        mutedUntil = null;
      } else {
        // Silenciar por período específico
        mode = "none";
        mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase
        .from("conversation_notification_settings")
        .upsert({
          conversation_id: conversationToMute.id,
          user_id: user!.id,
          mode,
          muted_until: mutedUntil,
        });

      if (error) throw error;
      
      if (hours === 0) {
        toast.success("Notificações reativadas");
      } else if (hours === null) {
        toast.success("Conversa silenciada permanentemente");
      } else {
        toast.success(`Conversa silenciada por ${hours >= 24 ? `${hours / 24} dia(s)` : `${hours} hora(s)`}`);
      }
    } catch (error) {
      toast.error("Erro ao silenciar conversa");
    } finally {
      setConversationToMute(null);
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

  // Funções de seleção múltipla
  const handleLongPress = (conversationId: string) => {
    setIsSelectionMode(true);
    setSelectedConversations(new Set([conversationId]));
  };

  const handleToggleSelect = (conversationId: string) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
    
    // Se não houver mais seleções, sair do modo de seleção
    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedConversations(new Set());
  };

  const handleBatchPin = async () => {
    for (const convId of selectedConversations) {
      await handlePin(convId);
    }
    handleCancelSelection();
  };

  const handleBatchMute = async () => {
    // Para seleção múltipla, silenciar permanentemente
    for (const convId of selectedConversations) {
      try {
        await supabase
          .from("conversation_notification_settings")
          .upsert({
            conversation_id: convId,
            user_id: user!.id,
            mode: "none",
            muted_until: null,
          });
      } catch (error) {
        console.error("Erro ao silenciar conversa:", error);
      }
    }
    toast.success(`${selectedConversations.size} conversa(s) silenciada(s)`);
    handleCancelSelection();
  };

  const handleBatchArchive = async () => {
    for (const convId of selectedConversations) {
      const conv = conversations.find(c => c.id === convId);
      if (conv) {
        await handleArchive(convId, conv.archived);
      }
    }
    handleCancelSelection();
  };

  const handleBatchDelete = () => {
    if (selectedConversations.size === 0) return;
    setDeleteDialogOpen(true);
  };

  const handleConfirmBatchDelete = async () => {
    for (const convId of selectedConversations) {
      try {
        const { error } = await supabase
          .from("conversation_participants")
          .delete()
          .eq("conversation_id", convId)
          .eq("user_id", user?.id);

        if (error) throw error;
      } catch (error) {
        toast.error("Erro ao excluir algumas conversas");
      }
    }
    toast.success(`${selectedConversations.size} conversa(s) excluída(s)`);
    handleCancelSelection();
    setDeleteDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Barra de ações de seleção */}
      {isSelectionMode && (
        <SelectionActionBar
          selectedCount={selectedConversations.size}
          onPin={handleBatchPin}
          onMute={handleBatchMute}
          onArchive={handleBatchArchive}
          onDelete={handleBatchDelete}
          onCancel={handleCancelSelection}
        />
      )}

      <div className={cn(
        "relative bg-gradient-to-r from-card via-card to-accent/5 border-b-2 border-primary/20 px-3 py-2 sm:px-6 sm:py-4 flex items-center justify-between shadow-lg backdrop-blur-sm transition-all",
        isSelectionMode && "mt-[60px]"
      )}>
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
          <TabsTrigger value="all" className="flex-1 relative">
            Todas
            {conversations.filter((c: any) => !c.archived && c.unread_count > 0).length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                {conversations.filter((c: any) => !c.archived && c.unread_count > 0).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex-1 relative">
            <Archive className="h-4 w-4 mr-2" />
            Arquivadas
            {archivedConversations.filter((c: any) => c.unread_count > 0).length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                {archivedConversations.filter((c: any) => c.unread_count > 0).length}
              </span>
            )}
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
                  <SwipeableConversation
                    key={conversation.id}
                    onSwipeLeft={() => handleArchive(conversation.id, conversation.archived)}
                    onSwipeRight={() => handlePin(conversation.id)}
                    isArchived={conversation.archived}
                    isPinned={conversation.pinned}
                  >
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
                    mutedUntil={conversation.muted_until}
                    isArchived={conversation.archived}
                    onArchive={() => handleArchive(conversation.id, conversation.archived)}
                    onPin={() => handlePin(conversation.id)}
                    onMute={() => handleMute(conversation.id, displayName)}
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
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedConversations.has(conversation.id)}
                    onLongPress={() => handleLongPress(conversation.id)}
                    onToggleSelect={() => handleToggleSelect(conversation.id)}
                  />
                  </SwipeableConversation>
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
            <AlertDialogTitle>
              {isSelectionMode 
                ? `Excluir ${selectedConversations.size} conversa(s)?`
                : 'Excluir conversa?'
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as mensagens serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={isSelectionMode ? handleConfirmBatchDelete : handleDelete} 
              className="bg-destructive hover:bg-destructive/90"
            >
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

      {/* Dialog de duração do mute */}
      <MuteDurationDialog
        open={muteDurationDialogOpen}
        onClose={() => {
          setMuteDurationDialogOpen(false);
          setConversationToMute(null);
        }}
        onSelectDuration={handleMuteDuration}
        conversationName={conversationToMute?.name || ""}
      />
    </div>
  );
};

export default Index;
