import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Image, File, Link as LinkIcon, Video, FileAudio } from "lucide-react";
import { format } from "date-fns";
import { useGroupJoinedAt } from "@/hooks/useGroupJoinedAt";
import { useAuth } from "@/hooks/useAuth";

interface ChatMediaGalleryProps {
  conversationId: string;
  open: boolean;
  onClose: () => void;
}

export const ChatMediaGallery = ({ conversationId, open, onClose }: ChatMediaGalleryProps) => {
  const [selectedTab, setSelectedTab] = useState("media");
  const { user } = useAuth();
  const { data: userJoinedAt } = useGroupJoinedAt(conversationId, user?.id);

  const { data: media = [] } = useQuery({
    queryKey: ["media", conversationId, userJoinedAt],
    queryFn: async () => {
      let query = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .in("type", ["image", "video"])
        .order("created_at", { ascending: false });

      // Filtrar por joined_at se for grupo
      if (userJoinedAt) {
        query = query.gte("created_at", userJoinedAt);
      }
      
      const { data } = await query.limit(100);
      return data || [];
    },
    enabled: open,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", conversationId, userJoinedAt],
    queryFn: async () => {
      let query = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .in("type", ["document", "audio"])
        .order("created_at", { ascending: false });

      // Filtrar por joined_at se for grupo
      if (userJoinedAt) {
        query = query.gte("created_at", userJoinedAt);
      }
      
      const { data } = await query.limit(100);
      return data || [];
    },
    enabled: open,
  });

  const { data: links = [] } = useQuery({
    queryKey: ["links", conversationId, userJoinedAt],
    queryFn: async () => {
      let query = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("type", "text")
        .order("created_at", { ascending: false });

      // Filtrar por joined_at se for grupo
      if (userJoinedAt) {
        query = query.gte("created_at", userJoinedAt);
      }
      
      const { data } = await query.limit(200);
      
      // Filter messages that contain URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return (data || []).filter(msg => urlRegex.test(msg.content));
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Galeria do Chat</DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image size={16} />
              Mídia ({media.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <File size={16} />
              Docs ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="links" className="flex items-center gap-2">
              <LinkIcon size={16} />
              Links ({links.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="media" className="flex-1">
            <ScrollArea className="h-[calc(80vh-150px)]">
              <div className="grid grid-cols-3 gap-2 p-4">
                {media.map((msg: any) => (
                  <div key={msg.id} className="relative group cursor-pointer">
                    {msg.type === "image" ? (
                      <img
                        src={msg.metadata?.url}
                        alt={msg.metadata?.filename}
                        className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity"
                        onClick={() => window.open(msg.metadata?.url, "_blank")}
                      />
                    ) : (
                      <div 
                        className="w-full h-32 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors"
                        onClick={() => window.open(msg.metadata?.url, "_blank")}
                      >
                        <Video size={32} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      {format(new Date(msg.created_at), "dd/MM/yyyy")}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="documents" className="flex-1">
            <ScrollArea className="h-[calc(80vh-150px)]">
              <div className="space-y-2 p-4">
                {documents.map((msg: any) => (
                  <div
                    key={msg.id}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                    onClick={() => window.open(msg.metadata?.url, "_blank")}
                  >
                    {msg.type === "audio" ? (
                      <FileAudio size={24} className="text-green-500 shrink-0" />
                    ) : (
                      <File size={24} className="text-blue-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{msg.metadata?.filename || "Documento"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="links" className="flex-1">
            <ScrollArea className="h-[calc(80vh-150px)]">
              <div className="space-y-2 p-4">
                {links.map((msg: any) => {
                  const urlMatch = msg.content.match(/(https?:\/\/[^\s]+)/);
                  const url = urlMatch ? urlMatch[0] : "";
                  
                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                      onClick={() => window.open(url, "_blank")}
                    >
                      <LinkIcon size={20} className="text-primary shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-all text-primary hover:underline">
                          {url}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
