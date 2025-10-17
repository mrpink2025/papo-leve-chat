import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  progress: number;
  fileName: string;
  isUploading: boolean;
  error: string | null;
  onCancel?: () => void;
  onRetry?: () => void;
}

const UploadProgress = ({
  progress,
  fileName,
  isUploading,
  error,
  onCancel,
  onRetry,
}: UploadProgressProps) => {
  const isComplete = progress === 100 && !isUploading && !error;

  return (
    <div className="fixed bottom-20 right-4 left-4 md:left-auto md:w-96 bg-card border border-border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-5 z-40">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          error ? "bg-destructive/10" : isComplete ? "bg-green-500/10" : "bg-primary/10"
        )}>
          {error ? (
            <AlertCircle size={20} className="text-destructive" />
          ) : isComplete ? (
            <CheckCircle2 size={20} className="text-green-500" />
          ) : (
            <Upload size={20} className="text-primary animate-bounce" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {error ? (
                  "Erro no upload"
                ) : isComplete ? (
                  "Upload concluído"
                ) : (
                  `Enviando... ${progress}%`
                )}
              </p>
            </div>
            {onCancel && isUploading && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={onCancel}
              >
                <X size={14} />
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {!error && !isComplete && (
            <Progress value={progress} className="h-2" />
          )}

          {/* Error actions */}
          {error && onRetry && (
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="flex-1"
              >
                Tentar novamente
              </Button>
              {onCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancel}
                >
                  Cancelar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadProgress;
