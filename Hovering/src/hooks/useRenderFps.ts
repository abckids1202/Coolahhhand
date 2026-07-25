import { useEffect, useState } from "react";

export const useRenderFps = () => {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameId = 0;
    let frames = 0;
    let startedAt = performance.now();
    const tick = (now: number) => {
      frames += 1;
      if (now - startedAt >= 1000) {
        setFps(Math.round((frames * 1000) / (now - startedAt)));
        frames = 0;
        startedAt = now;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return fps;
};
