import { useEffect, useRef } from 'react';

export function useGameLoop(active: boolean, onFrame: (deltaMs: number) => void) {
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    if (!active) return undefined;

    const tick = (time: number) => {
      const last = lastRef.current ?? time;
      lastRef.current = time;
      onFrameRef.current(Math.min(time - last, 32));
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastRef.current = null;
    };
  }, [active]);
}
