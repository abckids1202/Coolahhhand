import { useEffect, type RefObject } from "react";

interface CameraFeedProps {
  stream: MediaStream | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  visible: boolean;
  onReady: () => void;
}

export const CameraFeed = ({
  stream,
  videoRef,
  visible,
  onReady,
}: CameraFeedProps) => {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) {
      void video.play().catch(() => undefined);
    }
    return () => {
      video.srcObject = null;
    };
  }, [stream, videoRef]);

  return (
    <video
      ref={videoRef}
      className={`camera-feed${visible ? "" : " camera-feed--hidden"}`}
      autoPlay
      muted
      playsInline
      onLoadedMetadata={onReady}
      aria-label="Mirrored live camera feed"
    />
  );
};
