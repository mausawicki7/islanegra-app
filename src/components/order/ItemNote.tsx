import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface ItemNoteProps {
  value: string;
  onChange: (v: string) => void;
}

export function ItemNote({ value, onChange }: ItemNoteProps) {
  const [open, setOpen] = useState(value.length > 0);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-7 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.24em] text-white/55 transition hover:text-white"
      >
        <Plus size={14} /> Agregar nota
      </button>
    );
  }

  return (
    <section className="mt-7">
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="item-note"
          className="text-xs uppercase tracking-[0.24em] text-white/45"
        >
          Nota
        </label>
        <button
          type="button"
          onClick={() => {
            onChange('');
            setOpen(false);
          }}
          aria-label="Quitar nota"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/55 transition hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <textarea
        id="item-note"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="Bien cocida, sin sal…"
        className="w-full resize-none rounded-xl border border-white/[0.08] bg-ink-800 px-3 py-3 text-base text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none sm:text-sm"
      />
    </section>
  );
}
