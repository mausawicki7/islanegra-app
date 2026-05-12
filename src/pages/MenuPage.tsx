import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TablePrompt } from '@/components/layout/TablePrompt';
import { BurgerGrid } from '@/components/menu/BurgerGrid';
import { MenuHero } from '@/components/menu/MenuHero';
import { OrderSheet } from '@/components/order/OrderSheet';
import { burgers } from '@/data/burgers';
import { useTable } from '@/hooks/useTable';
import type { Burger } from '@/types/burger';

export function MenuPage() {
  const { table, setTable } = useTable();
  const [selected, setSelected] = useState<Burger | null>(null);
  const [tablePromptOpen, setTablePromptOpen] = useState(false);

  return (
    <>
      <AppShell
        table={table}
        onChangeTable={() => setTablePromptOpen(true)}
      >
        <MenuHero />
        {!table && (
          <button
            type="button"
            onClick={() => setTablePromptOpen(true)}
            className="mb-8 inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
          >
            Indicá tu mesa
          </button>
        )}
        <BurgerGrid burgers={burgers} onOrder={setSelected} />
      </AppShell>

      <OrderSheet
        open={!!selected}
        burger={selected}
        tableNumber={table}
        onClose={() => setSelected(null)}
        onRequestTable={() => setTablePromptOpen(true)}
      />

      <TablePrompt
        open={tablePromptOpen}
        initial={table ?? ''}
        onConfirm={(t) => {
          setTable(t);
          setTablePromptOpen(false);
        }}
        onClose={() => setTablePromptOpen(false)}
      />
    </>
  );
}
