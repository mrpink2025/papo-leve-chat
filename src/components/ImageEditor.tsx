import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X, Check, RotateCw, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageEditorProps {
  imageUrl: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

type AspectRatio = { value: number; label: string };

const aspectRatios: AspectRatio[] = [
  { value: 0, label: "Livre" },
  { value: 1, label: "1:1" },
  { value: 4 / 5, label: "4:5" },
  { value: 16 / 9, label: "16:9" },
];

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      }
    }, "image/jpeg", 0.9);
  });
};

const ImageEditor = ({ imageUrl, onSave, onCancel }: ImageEditorProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [selectedAspect, setSelectedAspect] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return;

    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        rotation
      );
      onSave(croppedImage);
    } catch (e) {
      console.error("Error cropping image:", e);
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, croppedAreaPixels, rotation, onSave]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Cropper area */}
      <div className="flex-1 relative">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspectRatios[selectedAspect].value || undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: {
              backgroundColor: "#000",
            },
          }}
        />
      </div>

      {/* Controls */}
      <div className="bg-card border-t border-border p-4 space-y-4">
        {/* Aspect ratio selector */}
        <div className="flex items-center justify-center gap-2">
          <Maximize2 size={16} className="text-muted-foreground" />
          <div className="flex gap-2">
            {aspectRatios.map((ratio, index) => (
              <Button
                key={ratio.label}
                variant="outline"
                size="sm"
                onClick={() => setSelectedAspect(index)}
                className={cn(
                  "min-w-[60px]",
                  selectedAspect === index && "bg-primary text-primary-foreground"
                )}
              >
                {ratio.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Zoom slider */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Zoom</label>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(value) => setZoom(value[0])}
            className="w-full"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isProcessing}
          >
            <X size={18} className="mr-2" />
            Cancelar
          </Button>

          <Button
            variant="outline"
            onClick={handleRotate}
            disabled={isProcessing}
          >
            <RotateCw size={18} />
          </Button>

          <Button
            onClick={handleSave}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={isProcessing}
          >
            <Check size={18} className="mr-2" />
            {isProcessing ? "Processando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
