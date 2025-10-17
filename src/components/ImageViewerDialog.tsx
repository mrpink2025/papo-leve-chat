import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface ImageViewerDialogProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
}

export const ImageViewerDialog = ({ imageUrl, open, onClose }: ImageViewerDialogProps) => {
  const [scale, setScale] = useState(1);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erro ao baixar imagem:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
        {/* Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="bg-black/50 text-white hover:bg-black/70"
          >
            <Download size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="bg-black/50 text-white hover:bg-black/70"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Image with zoom controls */}
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          onZoom={(ref) => setScale(ref.state.scale)}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/50 rounded-full p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => zoomOut()}
                  className="text-white hover:bg-white/10 rounded-full"
                >
                  <ZoomOut size={20} />
                </Button>
                <span className="text-white text-sm min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => zoomIn()}
                  className="text-white hover:bg-white/10 rounded-full"
                >
                  <ZoomIn size={20} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetTransform()}
                  className="text-white hover:bg-white/10 rounded-full text-xs"
                >
                  Reset
                </Button>
              </div>

              {/* Image */}
              <TransformComponent
                wrapperClass="w-full h-[95vh] flex items-center justify-center"
                contentClass="w-full h-full flex items-center justify-center"
              >
                <img
                  src={imageUrl}
                  alt="Imagem ampliada"
                  className="max-w-full max-h-full object-contain"
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </DialogContent>
    </Dialog>
  );
};
