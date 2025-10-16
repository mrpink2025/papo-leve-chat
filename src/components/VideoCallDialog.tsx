import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneOff } from 'lucide-react';

interface VideoCallDialogProps {
  open: boolean;
  onClose: () => void;
  roomName: string;
  displayName: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const VideoCallDialog = ({
  open,
  onClose,
  roomName,
  displayName,
}: VideoCallDialogProps) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;

    // Load Jitsi Meet API script
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => initJitsi();
    document.body.appendChild(script);

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      document.body.removeChild(script);
    };
  }, [open]);

  const initJitsi = () => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: displayName,
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_BUTTONS: [
          'microphone',
          'camera',
          'closedcaptions',
          'desktop',
          'fullscreen',
          'fodeviceselection',
          'hangup',
          'chat',
          'settings',
          'videoquality',
          'filmstrip',
          'tileview',
        ],
      },
    };

    jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);

    jitsiApiRef.current.addListener('readyToClose', () => {
      onClose();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Chamada de Vídeo</DialogTitle>
            <Button
              variant="destructive"
              size="sm"
              onClick={onClose}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              Encerrar
            </Button>
          </div>
        </DialogHeader>
        <div ref={jitsiContainerRef} className="w-full flex-1" />
      </DialogContent>
    </Dialog>
  );
};
