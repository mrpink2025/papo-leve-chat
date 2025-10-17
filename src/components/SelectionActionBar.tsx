import { Button } from "@/components/ui/button";
import { Pin, BellOff, Archive, Trash2, X } from "lucide-react";

interface SelectionActionBarProps {
  selectedCount: number;
  onPin: () => void;
  onMute: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const SelectionActionBar = ({
  selectedCount,
  onPin,
  onMute,
  onArchive,
  onDelete,
  onCancel,
}: SelectionActionBarProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-lg animate-slide-in-right">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-lg">{selectedCount} selecionada{selectedCount > 1 ? 's' : ''}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPin}
          title="Fixar"
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <Pin className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onMute}
          title="Silenciar"
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <BellOff className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onArchive}
          title="Arquivar"
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <Archive className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          title="Excluir"
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
