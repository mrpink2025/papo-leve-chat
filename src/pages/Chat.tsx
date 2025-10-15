import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import ChatHeader from "@/components/ChatHeader";
import MessageBubble from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isSent: boolean;
  isRead?: boolean;
}

const mockChats: Record<string, { name: string; avatar: string; online: boolean; lastSeen?: string }> = {
  "1": {
    name: "Maria Silva",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    online: true,
  },
  "2": {
    name: "João Santos",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Joao",
    online: false,
    lastSeen: "visto por último hoje às 14:30",
  },
  "3": {
    name: "Ana Costa",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana",
    online: true,
  },
};

const Chat = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Olá! Como você está?",
      timestamp: new Date(Date.now() - 3600000),
      isSent: false,
    },
    {
      id: "2",
      content: "Oi! Estou bem, e você?",
      timestamp: new Date(Date.now() - 3500000),
      isSent: true,
      isRead: true,
    },
    {
      id: "3",
      content: "Tudo ótimo por aqui! Vamos marcar aquele café?",
      timestamp: new Date(Date.now() - 3400000),
      isSent: false,
    },
    {
      id: "4",
      content: "Sim! Que tal amanhã às 15h?",
      timestamp: new Date(Date.now() - 3300000),
      isSent: true,
      isRead: true,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chat = id && id in mockChats ? mockChats[id as keyof typeof mockChats] : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      isSent: true,
      isRead: false,
    };
    setMessages([...messages, newMessage]);
  };

  if (!chat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chat não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ChatHeader
        name={chat.name}
        avatar={chat.avatar}
        online={chat.online}
        lastSeen={chat.lastSeen}
      />

      <div className="flex-1 overflow-y-auto p-4 bg-accent/20">
        {messages.map((message) => (
          <MessageBubble key={message.id} {...message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default Chat;
