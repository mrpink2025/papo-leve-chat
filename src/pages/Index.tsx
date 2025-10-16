import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatListItem from "@/components/ChatListItem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, MoreVertical } from "lucide-react";

const mockChats = [
  {
    id: "1",
    name: "Maria Silva",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    lastMessage: "Sim! Que tal amanhã às 15h?",
    timestamp: new Date(Date.now() - 600000),
    unread: 2,
    online: true,
  },
  {
    id: "2",
    name: "João Santos",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Joao",
    lastMessage: "Obrigado pela ajuda!",
    timestamp: new Date(Date.now() - 3600000),
    unread: 0,
    online: false,
  },
  {
    id: "3",
    name: "Ana Costa",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana",
    lastMessage: "Até logo! 👋",
    timestamp: new Date(Date.now() - 7200000),
    unread: 0,
    online: true,
  },
  {
    id: "4",
    name: "Pedro Oliveira",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro",
    lastMessage: "Vamos marcar uma reunião?",
    timestamp: new Date(Date.now() - 86400000),
    unread: 1,
    online: false,
  },
  {
    id: "5",
    name: "Carla Mendes",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carla",
    lastMessage: "Perfeito! Combinado então.",
    timestamp: new Date(Date.now() - 172800000),
    unread: 0,
    online: false,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = mockChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-chat-header text-chat-header-foreground p-4 shadow-chat border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Conversas</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-chat-header-foreground hover:bg-secondary/50">
              <MessageCircle size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-chat-header-foreground hover:bg-secondary/50">
              <MoreVertical size={20} />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              {...chat}
              onClick={() => navigate(`/chat/${chat.id}`)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle size={48} className="mb-2 opacity-30" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
