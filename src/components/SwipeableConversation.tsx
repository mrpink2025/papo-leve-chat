import { ReactNode, useRef, useState, useEffect } from "react";
import { Archive, Pin } from "lucide-react";

interface SwipeableConversationProps {
  children: ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isArchived?: boolean;
  isPinned?: boolean;
}

export const SwipeableConversation = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  isArchived = false,
  isPinned = false,
}: SwipeableConversationProps) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 120;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Limitar o swipe
    const limitedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
    setOffset(limitedDiff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (Math.abs(offset) > SWIPE_THRESHOLD) {
      if (offset < 0) {
        // Swipe left - Arquivar
        onSwipeLeft();
      } else {
        // Swipe right - Fixar
        onSwipeRight();
      }
    }
    
    // Reset
    setOffset(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.clientX;
    const diff = currentX.current - startX.current;
    
    const limitedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
    setOffset(limitedDiff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (Math.abs(offset) > SWIPE_THRESHOLD) {
      if (offset < 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    }
    
    setOffset(0);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        currentX.current = e.clientX;
        const diff = currentX.current - startX.current;
        const limitedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
        setOffset(limitedDiff);
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        if (Math.abs(offset) > SWIPE_THRESHOLD) {
          if (offset < 0) {
            onSwipeLeft();
          } else {
            onSwipeRight();
          }
        }
        setOffset(0);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, offset]);

  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        {/* Right action (Pin) */}
        <div 
          className={`flex items-center gap-2 transition-opacity ${
            offset > SWIPE_THRESHOLD / 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="bg-primary rounded-full p-2">
            <Pin className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground">
            {isPinned ? 'Desafixar' : 'Fixar'}
          </span>
        </div>

        {/* Left action (Archive) */}
        <div 
          className={`flex items-center gap-2 transition-opacity ${
            offset < -SWIPE_THRESHOLD / 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="text-sm font-medium text-foreground">
            {isArchived ? 'Desarquivar' : 'Arquivar'}
          </span>
          <div className="bg-primary rounded-full p-2">
            <Archive className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </div>

      {/* Conversation item */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="cursor-grab active:cursor-grabbing"
      >
        {children}
      </div>
    </div>
  );
};
