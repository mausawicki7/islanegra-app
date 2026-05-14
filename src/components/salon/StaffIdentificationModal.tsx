import { FormEvent, useState } from 'react';

interface StaffIdentificationModalProps {
  open: boolean;
  onSave: (name: string) => void;
}

export function StaffIdentificationModal({ open, onSave }: StaffIdentificationModalProps) {
  const [name, setName] = useState('');
  const trimmed = name.trim();

  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-2xl border border-white/[0.08] bg-[#111111] p-5 text-white shadow-2xl shadow-black/40 sm:max-w-sm"
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Salón</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">¿Quién sos?</h1>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Esto se guarda en este celular para mostrar quién toma cada tarea.
        </p>
        <label className="mt-5 block text-[11px] uppercase tracking-[0.22em] text-white/45">
          Nombre o iniciales
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            className="mt-2 h-14 w-full rounded-xl border border-white/[0.08] bg-black px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-white/30"
            placeholder="Ej. Mica"
          />
        </label>
        <button
          type="submit"
          disabled={!trimmed}
          className="mt-5 h-14 w-full rounded-xl bg-white text-sm font-semibold uppercase tracking-[0.2em] text-black transition disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/35"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
