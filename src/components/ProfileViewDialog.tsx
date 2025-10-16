import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, User } from "lucide-react";

interface ProfileViewDialogProps {
  open: boolean;
  onClose: () => void;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isGroup?: boolean;
  memberCount?: number;
}

const ProfileViewDialog = ({
  open,
  onClose,
  name,
  avatarUrl,
  bio,
  isGroup = false,
  memberCount,
}: ProfileViewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {isGroup ? "Informações do Grupo" : "Informações do Perfil"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Avatar grande */}
          <Avatar className="h-32 w-32 border-4 border-border">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-4xl">
              {isGroup ? (
                <Users size={48} />
              ) : (
                name.substring(0, 2).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>

          {/* Nome */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{name}</h2>
            
            {/* Badge para grupo */}
            {isGroup && memberCount && (
              <Badge variant="secondary" className="gap-1">
                <Users size={14} />
                {memberCount} {memberCount === 1 ? "membro" : "membros"}
              </Badge>
            )}
            
            {/* Badge para perfil */}
            {!isGroup && (
              <Badge variant="secondary" className="gap-1">
                <User size={14} />
                Contato
              </Badge>
            )}
          </div>

          {/* Descrição/Bio */}
          {bio && (
            <div className="w-full">
              <p className="text-sm text-muted-foreground text-center px-4">
                {bio}
              </p>
            </div>
          )}

          {/* Placeholder se não houver bio */}
          {!bio && !isGroup && (
            <div className="w-full">
              <p className="text-sm text-muted-foreground text-center italic px-4">
                Sem informações adicionais
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileViewDialog;
