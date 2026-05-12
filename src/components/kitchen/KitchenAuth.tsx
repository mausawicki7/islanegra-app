import { useEffect, useRef, useState } from 'react';
import { primeAudio } from '@/utils/sound';

interface KitchenAuthProps {
  onSubmit: (pin: string) => boolean;
}

export function KitchenAuth({ onSubmit }: KitchenAuthProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = pin.trim();
    if (!trimmed) return;
    primeAudio();
    if (!onSubmit(trimmed)) {
      setError('PIN incorrecto');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <div className="w-full max-w-sm">
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
          Cocina
        </p>
        <h1 className="mt-3 text-balance font-semibold uppercase tracking-tightest text-white text-3xl leading-[0.95]">
          Ingresá tu PIN
        </h1>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="••••"
          className="mt-8 w-full rounded-xl border border-white/[0.08] bg-ink-800 px-4 py-4 text-center text-2xl tracking-[0.6em] text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none"
        />

        {error && (
          <p role="alert" className="mt-3 text-center text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={pin.trim().length === 0}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-black/60"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
