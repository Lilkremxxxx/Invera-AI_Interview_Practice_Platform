import { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCameraPreview } from '@/hooks/use-camera-preview';

interface HarnessProps {
  active: boolean;
  stream: MediaStream | null;
  onPreviewReady?: () => void;
}

function CameraPreviewHarness({ active, stream, onPreviewReady }: HarnessProps) {
  const videoRef = useCameraPreview({
    active,
    stream,
    onPreviewReady,
  });

  useEffect(() => {
    if (active && videoRef.current) {
      videoRef.current.dataset.active = 'true';
    }
  }, [active, videoRef]);

  return <video ref={videoRef} data-testid="preview" />;
}

describe('useCameraPreview', () => {
  let playMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    playMock = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: playMock,
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(),
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
      configurable: true,
      get() {
        return (this as HTMLVideoElement & { _srcObject?: MediaStream | null })._srcObject ?? null;
      },
      set(value: MediaStream | null) {
        (this as HTMLVideoElement & { _srcObject?: MediaStream | null })._srcObject = value;
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('plays the stream immediately without waiting for loadedmetadata', async () => {
    const onPreviewReady = vi.fn();
    const stream = {} as MediaStream;

    render(<CameraPreviewHarness active stream={stream} onPreviewReady={onPreviewReady} />);

    await waitFor(() => {
      expect(playMock).toHaveBeenCalledTimes(1);
      expect(onPreviewReady).toHaveBeenCalledTimes(1);
    });
  });

  it('clears the attached stream when preview is disabled', async () => {
    const stream = {} as MediaStream;

    const { getByTestId, rerender } = render(
      <CameraPreviewHarness active stream={stream} />,
    );

    const video = getByTestId('preview') as HTMLVideoElement;

    await waitFor(() => {
      expect(video.srcObject).toBe(stream);
    });

    await act(async () => {
      rerender(<CameraPreviewHarness active={false} stream={stream} />);
    });

    expect(video.srcObject).toBeNull();
  });
});
