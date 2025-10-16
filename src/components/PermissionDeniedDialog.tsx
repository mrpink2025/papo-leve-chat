import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface PermissionDeniedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissionType: "camera" | "microphone" | "both";
}

const PermissionDeniedDialog = ({
  open,
  onOpenChange,
  permissionType,
}: PermissionDeniedDialogProps) => {
  const getTitle = () => {
    switch (permissionType) {
      case "camera":
        return "Permissão de câmera negada";
      case "microphone":
        return "Permissão de microfone negada";
      case "both":
        return "Permissões negadas";
    }
  };

  const getDescription = () => {
    return "Para realizar chamadas de vídeo/áudio, você precisa permitir o acesso à câmera e/ou microfone. Clique no ícone de cadeado/câmera na barra de endereços do navegador e permita o acesso.";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-destructive" size={24} />
            <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>{getDescription()}</p>
            <p className="text-sm">
              <strong>Como permitir:</strong>
            </p>
            <ul className="text-sm list-disc list-inside space-y-1 ml-2">
              <li>Chrome/Edge: Clique no ícone de câmera/cadeado na barra de endereços</li>
              <li>Firefox: Clique no ícone de permissões na barra de endereços</li>
              <li>Safari: Preferências → Sites → Câmera/Microfone</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PermissionDeniedDialog;
