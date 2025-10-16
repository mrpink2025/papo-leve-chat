import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import logo from "@/assets/nosso-papo-logo-transparent.png";

const Share = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: conversations = [] } = useConversations(user?.id, false);
  const [sharedData, setSharedData] = useState<{
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
  } | null>(null);

  useEffect(() => {
    // Capturar dados compartilhados via Web Share Target API
    const params = new URLSearchParams(window.location.search);
    const title = params.get("title") || undefined;
    const text = params.get("text") || undefined;
    const url = params.get("url") || undefined;

    setSharedData({
      title,
      text,
      url,
      files: [],
    });
  }, []);

  const handleSelectConversation = (conversationId: string) => {
    // Navegar para a conversa com os dados compartilhados
    navigate(`/chat/${conversationId}`, {
      state: { sharedData },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={logo} alt="Nosso Papo" className="h-10 w-10" />
          <h1 className="text-2xl font-bold">Compartilhar</h1>
        </div>

        {sharedData && (
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Conteúdo Compartilhado</h2>
            {sharedData.title && (
              <div>
                <p className="text-sm text-muted-foreground">Título</p>
                <p className="font-medium">{sharedData.title}</p>
              </div>
            )}
            {sharedData.text && (
              <div>
                <p className="text-sm text-muted-foreground">Texto</p>
                <p>{sharedData.text}</p>
              </div>
            )}
            {sharedData.url && (
              <div>
                <p className="text-sm text-muted-foreground">Link</p>
                <a
                  href={sharedData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {sharedData.url}
                </a>
              </div>
            )}
          </Card>
        )}

        <Card className="p-4 space-y-4">
          <h2 className="font-semibold">Escolha uma conversa</h2>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {conversations.map((conversation: any) => {
                const isDirectChat = conversation.type === "direct";
                const displayName = isDirectChat
                  ? conversation.other_participant?.full_name || conversation.other_participant?.username || "Usuário"
                  : conversation.name || "Grupo";
                const displayAvatar = isDirectChat
                  ? conversation.other_participant?.avatar_url || "/placeholder.svg"
                  : conversation.avatar_url || "/placeholder.svg";
                const lastMessage = conversation.last_message?.content || "Sem mensagens";

                return (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Avatar>
                      <AvatarImage src={displayAvatar} />
                      <AvatarFallback>
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{displayName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {lastMessage}
                      </p>
                    </div>
                    <Send className="h-5 w-5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default Share;
