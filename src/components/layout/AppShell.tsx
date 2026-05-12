import type { ReactNode } from 'react';
import { Header } from './Header';

interface AppShellProps {
  children: ReactNode;
  table: string | null;
  onChangeTable?: () => void;
}

export function AppShell({ children, table, onChangeTable }: AppShellProps) {
  return (
    <div className="min-h-full bg-ink-950 text-white">
      <Header table={table} onChangeTable={onChangeTable} />
      <main className="mx-auto max-w-6xl px-5 pb-32 pt-6 sm:pt-10">
        {children}
      </main>
    </div>
  );
}
