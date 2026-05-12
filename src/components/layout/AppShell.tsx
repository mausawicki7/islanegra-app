import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';

interface AppShellProps {
  children: ReactNode;
  table: string | null;
  onChangeTable?: () => void;
}

export function AppShell({ children, table, onChangeTable }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-white">
      <Header table={table} onChangeTable={onChangeTable} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-5 sm:pt-10">
        {children}
      </main>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-5">
        <Footer />
      </div>
    </div>
  );
}
