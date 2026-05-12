import { Link } from 'react-router-dom';
import logo from '@/assets/logo.svg';

interface HeaderProps {
  table: string | null;
  onChangeTable?: () => void;
}

export function Header({ table, onChangeTable }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link
          to="/menu"
          aria-label="Islanegra — ir al menú"
          className="flex items-center"
        >
          <img
            src={logo}
            alt="Islanegra"
            className="h-3.5 w-auto sm:h-4"
          />
        </Link>
        {table ? (
          <button
            type="button"
            onClick={onChangeTable}
            className="text-[11px] uppercase tracking-[0.24em] text-white/55 transition hover:text-white"
          >
            Mesa {table}
          </button>
        ) : (
          <span className="text-[11px] uppercase tracking-[0.24em] text-white/40">
            Sin mesa
          </span>
        )}
      </div>
    </header>
  );
}
