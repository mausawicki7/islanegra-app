import { useCallback, useEffect, useRef, useState } from 'react';

export function useGameLoop(active: boolean, onFrame: (deltaMs: number) => void) {
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const [paused, setPaused] = useState(false);

  const stopLoop = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    lastRef.current = null;
  }, []);

  const startLoop = useCallback(() => {
    if (frameRef.current !== null) return;
    const tick = (time: number) => {
      const last = lastRef.current ?? time;
      lastRef.current = time;
      onFrameRef.current(Math.min(time - last, 32));
      frameRef.current = window.requestAnimationFrame(tick);
    };
    frameRef.current = window.requestAnimationFrame(tick);
  }, []);

  const resume = useCallback(() => {
    if (active) setPaused(false);
  }, [active]);

  // RAF runs only when active and not paused
  useEffect(() => {
    if (!active || paused) {
      stopLoop();
      return undefined;
    }
    startLoop();
    return stopLoop;
  }, [active, paused, startLoop, stopLoop]);

  // Pause when tab is hidden; don't auto-resume on return
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && active && !paused) {
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [active, paused]);

  // Clear paused state when game ends so a new game starts clean
  useEffect(() => {
    if (!active) setPaused(false);
  }, [active]);

  return { paused, resume };
}
