import { useState } from 'react';
import logo from '@/assets/logo.svg';

interface BusinessAuthProps {
  loading: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => Promise<void> | void;
}

export function BusinessAuth({ loading, error, onSubmit }: BusinessAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    await onSubmit(email.trim(), password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <img src={logo} alt="Islanegra" className="h-4 w-auto" />
        <p className="mt-8 text-[11px] uppercase tracking-[0.32em] text-white/45">
          Negocio
        </p>
        <h1 className="mt-3 text-balance font-semibold uppercase tracking-tightest text-white text-3xl leading-[0.95]">
          Iniciá sesión
        </h1>

        <div className="mt-8 space-y-3">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mail@islanegra.com.ar"
            required
            className="w-full rounded-xl border border-white/[0.08] bg-ink-800 px-4 py-3 text-base text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
            style={{ fontSize: 'max(16px, 1rem)' }}
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="contraseña"
            required
            className="w-full rounded-xl border border-white/[0.08] bg-ink-800 px-4 py-3 text-base text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
            style={{ fontSize: 'max(16px, 1rem)' }}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-black/60"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
