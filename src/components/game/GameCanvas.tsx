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

    // Pan superior negro (carbón) con domo
    const topBun = new Path2D();
    topBun.moveTo(-18, -6);
    topBun.bezierCurveTo(-18, -22, 18, -22, 18, -6);
    topBun.lineTo(18, -4);
    topBun.lineTo(-18, -4);
    topBun.closePath();
    ctx.fillStyle = '#1a1a1a';
    ctx.fill(topBun);
    // brillo sutil en el pan superior
    const bunGrad = ctx.createRadialGradient(-4, -16, 1, 0, -13, 18);
    bunGrad.addColorStop(0, 'rgba(255,255,255,0.13)');
    bunGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bunGrad;
    ctx.fill(topBun);
    // semillas de sésamo
    ctx.fillStyle = '#e8d8a0';
    const seeds = [[-7, -15], [3, -18], [10, -13], [-2, -11]];
    for (const [sx, sy] of seeds) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Lechuga (ondas verdes)
    ctx.fillStyle = '#3a7d44';
    ctx.beginPath();
    for (let lx = -20; lx <= 20; lx += 8) {
      ctx.arc(lx, -3, 5, Math.PI, 0);
    }
    ctx.lineTo(20, 0);
    ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a9e55';
    ctx.beginPath();
    for (let lx = -16; lx <= 16; lx += 8) {
      ctx.arc(lx, -3, 4, Math.PI, 0);
    }
    ctx.fill();

    // Cheddar derretido (gotea por los costados)
    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.roundRect(-19, 1, 38, 5, 1);
    ctx.fill();
    // goteos laterales
    ctx.beginPath();
    ctx.moveTo(-17, 6); ctx.lineTo(-14, 6); ctx.lineTo(-15, 10); ctx.lineTo(-16, 10); ctx.closePath();
    ctx.moveTo(14, 6); ctx.lineTo(17, 6); ctx.lineTo(16, 10); ctx.lineTo(15, 10); ctx.closePath();
    ctx.fill();

    // Carne smashed (irregular, textura oscura)
    ctx.fillStyle = '#4a2018';
    ctx.beginPath();
    ctx.moveTo(-20, 7);
    ctx.lineTo(-21, 8); ctx.lineTo(-19, 9); ctx.lineTo(-20, 11);
    ctx.lineTo(20, 11); ctx.lineTo(21, 9); ctx.lineTo(19, 8); ctx.lineTo(20, 7);
    ctx.closePath();
    ctx.fill();
    // tono crujiente en el borde smashed
    ctx.fillStyle = '#2e1208';
    ctx.beginPath();
    ctx.moveTo(-20, 7); ctx.lineTo(20, 7); ctx.lineTo(20, 8.5); ctx.lineTo(-20, 8.5);
    ctx.closePath();
    ctx.fill();
    // veteado de la carne
    ctx.strokeStyle = 'rgba(90,35,15,0.5)';
    ctx.lineWidth = 0.8;
    for (let vx = -12; vx <= 12; vx += 7) {
      ctx.beginPath();
      ctx.moveTo(vx, 8); ctx.lineTo(vx + 2, 11);
      ctx.stroke();
    }

    // Salsa (manchas blancas)
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-8, 9, 3, 1.2, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7, 10, 2.5, 1, 0.4, 0, Math.PI * 2); ctx.fill();

    // Pan inferior negro (base plana)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.roundRect(-18, 12, 36, 9, [0, 0, 7, 7]);
    ctx.fill();
    // línea de tostado
    ctx.fillStyle = '#2d2d2d';
    ctx.beginPath();
    ctx.roundRect(-17, 12, 34, 2, 1);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      flap();
    };
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    return () => canvas.removeEventListener('touchstart', onTouch);
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
