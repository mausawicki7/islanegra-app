import { useState } from 'react';

interface TablePromptProps {
  open: boolean;
  initial?: string;
  onConfirm: (table: string) => void;
  onClose: () => void;
}

export function TablePrompt({
  open,
  initial = '',
  onConfirm,
  onClose,
}: TablePromptProps) {
  const [value, setValue] = useState(initial);

  if (!open) return null;

  const confirm = () => {
    const clean = value.trim();
    if (clean.length === 0) return;
    onConfirm(clean);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Indicá tu mesa"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-t-3xl border border-white/[0.08] bg-ink-900 p-6 sm:rounded-3xl">
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
          Mesa
        </p>
        <h2 className="mt-2 text-balance font-semibold uppercase tracking-tightest text-white text-2xl leading-tight">
          ¿En qué mesa estás?
        </h2>
        <input
          type="text"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
          }}
          placeholder="12"
          className="mt-5 w-full rounded-xl border border-white/[0.08] bg-ink-800 px-4 py-3 text-lg text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
        />
        <button
          type="button"
          onClick={confirm}
          disabled={value.trim().length === 0}
          className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-black/60"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
