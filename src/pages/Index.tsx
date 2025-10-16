import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MoreVertical, LogOut } from "lucide-react";
import ChatListItem from "@/components/ChatListItem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: conversations = [], isLoading } = useConversations(user?.id);

  const filteredChats = conversations.filter((conversation) => {
    const displayName = conversation.type === "direct"
      ? conversation.other_participant?.username || "Usuário"
      : conversation.name || "Grupo";
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Papo</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <Plus className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
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

      <ScrollArea className="flex-1">
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
              filteredChats.map((conversation) => {
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
                    onClick={() => navigate(`/chat/${conversation.id}`)}
                  />
                );
              })
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default Index;
