import { UserRound } from 'lucide-react';
import logo from '@/assets/logo.svg';
import type { SalonConnectionState } from '@/types/salon';

interface SalonHeaderProps {
  staffName: string;
  connection: SalonConnectionState;
  onChangeStaff: () => void;
}

export function SalonHeader({ staffName, connection, onChangeStaff }: SalonHeaderProps) {
  const connected = connection === 'connected';

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="Islanegra" className="h-3.5 w-auto shrink-0" />
          <span className="hidden text-[10px] uppercase tracking-[0.28em] text-white/40 sm:inline">
            Salón
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-white/55">
            <span
              className={[
                'h-2 w-2 rounded-full',
                connected ? 'bg-emerald-400' : 'bg-amber-300',
              ].join(' ')}
              aria-hidden="true"
            />
            <span>{connected ? 'Conectado' : 'Reconectando'}</span>
          </div>
          <button
            type="button"
            onClick={onChangeStaff}
            className="flex h-10 min-w-0 max-w-[9rem] items-center gap-2 rounded-full border border-white/[0.08] px-3 text-xs text-white transition hover:border-white/20"
            aria-label="Cambiar moza"
          >
            <UserRound size={14} className="shrink-0 text-white/50" />
            <span className="truncate">{staffName}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
