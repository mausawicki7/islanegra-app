import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameLoop } from './useGameLoop';

interface GameCanvasProps {
  weeklyHighScore: number;
  allTimeHighScore: number;
  resetToken: number;
  onGameOver: (score: number) => void;
}

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

const HEIGHT = 520;
const BURGER_X = 92;
const BURGER_SIZE = 34;

export function GameCanvas({
  weeklyHighScore,
  allTimeHighScore,
  resetToken,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    y: HEIGHT * 0.45,
    vy: 0,
    pipes: [] as Pipe[],
    score: 0,
    spawn: 0,
  });
  const [running, setRunning] = useState(false);

  const drawBurger = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#151515';
    ctx.beginPath();
    ctx.roundRect(-17, -14, 34, 12, 8);
    ctx.fill();
    ctx.fillStyle = '#f2f2f2';
    for (let i = -10; i <= 10; i += 10) {
      ctx.beginPath();
      ctx.arc(i, -9, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#7a3324';
    ctx.fillRect(-18, -2, 36, 9);
    ctx.fillStyle = '#f0d36a';
    ctx.fillRect(-16, 8, 32, 4);
    ctx.fillStyle = '#151515';
    ctx.beginPath();
    ctx.roundRect(-17, 12, 34, 10, 7);
    ctx.fill();
    ctx.restore();
  };

  const drawPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe, width: number) => {
    const gap = Math.max(110, 150 - Math.floor(stateRef.current.score / 20) * 8);
    const pipeWidth = 58;
    ctx.fillStyle = '#b78a4c';
    ctx.beginPath();
    ctx.roundRect(pipe.x, 0, pipeWidth, pipe.gapY - gap / 2, 10);
    ctx.roundRect(pipe.x, pipe.gapY + gap / 2, pipeWidth, HEIGHT, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    for (let x = pipe.x + 10; x < pipe.x + pipeWidth - 4; x += 14) {
      ctx.beginPath();
      ctx.arc(x, Math.max(8, pipe.gapY - gap / 2 - 8), 1.5, 0, Math.PI * 2);
      ctx.arc(x, Math.min(HEIGHT - 8, pipe.gapY + gap / 2 + 8), 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (pipe.x > width + 80) return;
  };

  const render = useCallback(
    (idle = false) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const width = canvas.clientWidth;
      ctx.clearRect(0, 0, width, HEIGHT);
      const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, '#0a0a0a');
      gradient.addColorStop(1, '#071018');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, HEIGHT);

      for (const pipe of stateRef.current.pipes) drawPipe(ctx, pipe, width);
      drawBurger(ctx, BURGER_X, stateRef.current.y);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 42px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(stateRef.current.score), width / 2, 58);

      ctx.fillStyle = 'rgba(255,255,255,0.58)';
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.fillText(`Récord semana ${weeklyHighScore} · histórico ${allTimeHighScore}`, width / 2, HEIGHT - 24);

      if (idle) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '700 20px Inter, system-ui, sans-serif';
        ctx.fillText('Tocá para empezar', width / 2, HEIGHT / 2);
      }
    },
    [allTimeHighScore, weeklyHighScore],
  );

  const reset = useCallback(() => {
    stateRef.current = {
      y: HEIGHT * 0.45,
      vy: 0,
      pipes: [],
      score: 0,
      spawn: 0,
    };
    setRunning(false);
    window.requestAnimationFrame(() => render(true));
  }, [render]);

  const flap = useCallback(() => {
    if (!running) setRunning(true);
    stateRef.current.vy = -0.38;
  }, [running]);

  const frame = useCallback(
    (deltaMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const state = stateRef.current;
      const width = canvas.clientWidth;
      const speed = 0.15 + Math.floor(state.score / 10) * 0.012;
      const gap = Math.max(110, 150 - Math.floor(state.score / 20) * 8);
      state.vy += 0.00115 * deltaMs;
      state.y += state.vy * deltaMs;
      state.spawn -= deltaMs;

      if (state.spawn <= 0) {
        state.pipes.push({
          x: width + 40,
          gapY: 130 + Math.random() * (HEIGHT - 260),
          scored: false,
        });
        state.spawn = 1_450;
      }

      for (const pipe of state.pipes) {
        pipe.x -= speed * deltaMs;
        if (!pipe.scored && pipe.x + 58 < BURGER_X - BURGER_SIZE / 2) {
          pipe.scored = true;
          state.score += 1;
        }
      }
      state.pipes = state.pipes.filter((pipe) => pipe.x > -80);

      const hitPipe = state.pipes.some((pipe) => {
        const insideX =
          BURGER_X + BURGER_SIZE / 2 > pipe.x && BURGER_X - BURGER_SIZE / 2 < pipe.x + 58;
        const outsideGap =
          state.y - BURGER_SIZE / 2 < pipe.gapY - gap / 2 ||
          state.y + BURGER_SIZE / 2 > pipe.gapY + gap / 2;
        return insideX && outsideGap;
      });
      const hitBounds = state.y < 12 || state.y > HEIGHT - 18;

      render(false);

      if (hitPipe || hitBounds) {
        setRunning(false);
        onGameOver(state.score);
      }
    },
    [onGameOver, render],
  );

  useGameLoop(running, frame);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(HEIGHT * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(!running);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [render, running]);

  useEffect(() => {
    reset();
  }, [reset, resetToken]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flap]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Flappy Burger"
      onPointerDown={flap}
      className="block h-[520px] w-full touch-none rounded-lg border border-white/[0.08] bg-[#0a0a0a]"
    />
  );
}
