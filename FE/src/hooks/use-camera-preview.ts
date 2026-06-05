import { RefObject, useEffect, useRef } from 'react';

interface UseCameraPreviewOptions {
  active: boolean;
  stream: MediaStream | null;
  onPreviewReady?: () => void;
}

export function useCameraPreview({
  active,
  stream,
  onPreviewReady,
}: UseCameraPreviewOptions): RefObject<HTMLVideoElement> {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active || !stream) {
      video.pause?.();
      video.srcObject = null;
      return;
    }

    let disposed = false;
    let previewReady = false;

    const markPreviewReady = () => {
      if (disposed || previewReady) return;
      previewReady = true;
      onPreviewReady?.();
    };

    const handleLoadedMetadata = () => {
      void video.play().catch(() => {});
      markPreviewReady();
    };

    const handleCanPlay = () => {
      markPreviewReady();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.srcObject = stream;

    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.then === 'function') {
      void playAttempt.then(markPreviewReady).catch(() => {});
    } else {
      markPreviewReady();
    }

    return () => {
      disposed = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.pause?.();
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [active, onPreviewReady, stream]);

  return videoRef;
}
