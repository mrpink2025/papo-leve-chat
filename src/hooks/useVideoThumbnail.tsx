import { useCallback } from 'react';

export const useVideoThumbnail = () => {
  const generateThumbnail = useCallback(async (
    videoFile: File,
    timeInSeconds: number = 1
  ): Promise<Blob | null> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
          video.currentTime = Math.min(timeInSeconds, video.duration);
        };

        video.onseeked = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(video.src);
            resolve(blob);
          }, 'image/jpeg', 0.85);
        };

        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          resolve(null);
        };

        video.src = URL.createObjectURL(videoFile);
      } catch (error) {
        console.error('Thumbnail generation error:', error);
        resolve(null);
      }
    });
  }, []);

  return { generateThumbnail };
};
