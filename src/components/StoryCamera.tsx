import { Dialog, DialogContent } from '@/components/ui/dialog';
import CameraCapture from './CameraCapture';

interface StoryCameraProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File, caption?: string) => void;
}

export const StoryCamera = ({ open, onOpenChange, onCapture }: StoryCameraProps) => {
  const handleCapture = (blob: Blob, type: 'image' | 'video', caption?: string) => {
    const file = new File(
      [blob],
      `story-${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
      { type: type === 'image' ? 'image/jpeg' : 'video/mp4' }
    );
    onCapture(file, caption);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full max-h-full p-0 bg-black border-none">
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => onOpenChange(false)}
          aspectRatio="9:16"
        />
      </DialogContent>
    </Dialog>
  );
};
