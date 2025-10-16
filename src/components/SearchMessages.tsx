import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface SearchMessagesProps {
  conversationId: string;
  onClose: () => void;
  onMessageSelect: (messageId: string) => void;
}

const SearchMessages = ({
  conversationId,
  onClose,
  onMessageSelect,
}: SearchMessagesProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["searchMessages", conversationId, searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          type,
          profiles:sender_id(username, full_name)
        `)
        .eq("conversation_id", conversationId)
        .eq("deleted", false)
        .ilike("content", `%${searchTerm}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 2,
  });

  return (
    <div className="absolute inset-0 bg-background z-10 flex flex-col">
      <div className="p-4 border-b flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar mensagens..."
            className="pl-10"
            autoFocus
          />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Buscando...
          </div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm.length < 2
              ? "Digite pelo menos 2 caracteres para buscar"
              : "Nenhuma mensagem encontrada"}
          </div>
        ) : (
          <div className="divide-y">
            {results.map((result: any) => (
              <button
                key={result.id}
                onClick={() => {
                  onMessageSelect(result.id);
                  onClose();
                }}
                className="w-full p-4 hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-medium">
                    {result.profiles?.full_name || result.profiles?.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(result.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {result.content}
                </p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default SearchMessages;
